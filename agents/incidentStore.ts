/**
 * Incident Store
 *
 * In-memory store for Incident records, backed by a JSON file for
 * persistence across Next.js hot-reloads and short process restarts.
 *
 * The store is a singleton (module-level Map) so all API routes share the
 * same instance within a process.  On first access it reads the persist file;
 * writes are flushed asynchronously after every mutation.
 *
 * Persist path: /tmp/urbanfarm-incidents.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Incident,
  IncidentStatus,
  SensorReading,
  SeverityLevel,
  AgentAction,
} from "@/types/interfaces";

const PERSIST_PATH =
  process.env.INCIDENT_STORE_PATH ?? "/tmp/urbanfarm-incidents.json";

// ── Singleton in-memory store ─────────────────────────────────────────────

const store = new Map<string, Incident>();
let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await fs.readFile(PERSIST_PATH, "utf8");
    const incidents: Incident[] = JSON.parse(raw);
    for (const inc of incidents) {
      store.set(inc.id, inc);
    }
  } catch {
    // File not found or invalid JSON — start fresh.
  }
}

async function persist(): Promise<void> {
  const incidents = Array.from(store.values());
  try {
    await fs.mkdir(path.dirname(PERSIST_PATH), { recursive: true });
    await fs.writeFile(PERSIST_PATH, JSON.stringify(incidents, null, 2), "utf8");
  } catch (err) {
    console.warn(`[incidentStore] persist failed: ${(err as Error).message}`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export interface CreateIncidentInput {
  siteId: string;
  severity: SeverityLevel;
  description: string;
  sensorSnapshot: SensorReading;
}

export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  await ensureLoaded();

  const now = new Date().toISOString();
  const incident: Incident = {
    id: randomUUID(),
    siteId: input.siteId,
    severity: input.severity,
    status: "open",
    description: input.description,
    sensorSnapshot: input.sensorSnapshot,
    agentActions: [],
    createdAt: now,
    updatedAt: now,
  };

  store.set(incident.id, incident);
  void persist();
  return incident;
}

export async function getIncident(id: string): Promise<Incident | null> {
  await ensureLoaded();
  return store.get(id) ?? null;
}

export async function getIncidentsForSite(siteId: string): Promise<Incident[]> {
  await ensureLoaded();
  return Array.from(store.values())
    .filter((inc) => inc.siteId === siteId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAllIncidents(): Promise<Incident[]> {
  await ensureLoaded();
  return Array.from(store.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
): Promise<Incident | null> {
  await ensureLoaded();
  const incident = store.get(id);
  if (!incident) return null;

  const updated: Incident = {
    ...incident,
    status,
    updatedAt: new Date().toISOString(),
  };
  store.set(id, updated);
  void persist();
  return updated;
}

export async function addAgentAction(
  id: string,
  action: Omit<AgentAction, "timestamp">,
): Promise<Incident | null> {
  await ensureLoaded();
  const incident = store.get(id);
  if (!incident) return null;

  const agentAction: AgentAction = {
    ...action,
    timestamp: new Date().toISOString(),
  };

  const updated: Incident = {
    ...incident,
    agentActions: [...incident.agentActions, agentAction],
    updatedAt: new Date().toISOString(),
  };
  store.set(id, updated);
  void persist();
  return updated;
}

export async function setPagerDutyId(
  id: string,
  pagerdutyIncidentId: string,
): Promise<Incident | null> {
  await ensureLoaded();
  const incident = store.get(id);
  if (!incident) return null;

  const updated: Incident = {
    ...incident,
    pagerdutyIncidentId,
    updatedAt: new Date().toISOString(),
  };
  store.set(id, updated);
  void persist();
  return updated;
}

export async function resolveIncident(id: string): Promise<Incident | null> {
  return updateIncidentStatus(id, "resolved");
}

/** Latest sensor snapshot for a site — taken from the most recent open incident, or null. */
export async function getLatestReading(siteId: string): Promise<SensorReading | null> {
  await ensureLoaded();
  const incidents = await getIncidentsForSite(siteId);
  return incidents[0]?.sensorSnapshot ?? null;
}

/** Clear all incidents — useful for testing. */
export async function clearAll(): Promise<void> {
  store.clear();
  void persist();
}
