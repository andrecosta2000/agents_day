/**
 * PagerDuty Events API v2 wrapper
 *
 * Translates UrbanFarm Incident objects into PagerDuty event payloads and
 * routes them through the eventQueue for offline resilience.
 *
 * Severity mapping (from agents/README.md):
 *   low      → info
 *   medium   → warning
 *   high     → error
 *   critical → critical
 *
 * Set PAGERDUTY_MOCK=true (default) to log to console instead of calling
 * the real API.  Set PAGERDUTY_MOCK=false and supply PAGERDUTY_API_KEY to
 * send live alerts.
 */

import type { Incident, SeverityLevel, Site } from "@/types/interfaces";
import { enqueue, type PagerDutyEventPayload } from "./eventQueue";

// ── Severity mapping ──────────────────────────────────────────────────────

const SEVERITY_MAP: Record<SeverityLevel, "info" | "warning" | "error" | "critical"> = {
  low:      "info",
  medium:   "warning",
  high:     "error",
  critical: "critical",
};

// ── Dedup key ─────────────────────────────────────────────────────────────

/**
 * A stable dedup key for an incident so that re-triggers for the same
 * incident are deduplicated by PagerDuty.
 */
function dedupKey(incidentId: string): string {
  return `urbanfarm-${incidentId}`;
}

// ── Payload builders ──────────────────────────────────────────────────────

function buildTriggerPayload(
  incident: Incident,
  site: Site,
): PagerDutyEventPayload {
  const { sensorSnapshot: s } = incident;

  return {
    routing_key: process.env.PAGERDUTY_API_KEY ?? "MOCK",
    event_action: "trigger",
    dedup_key: dedupKey(incident.id),
    client: "UrbanFarm Orchestrator",
    payload: {
      summary: `[${incident.severity.toUpperCase()}] ${site.name}: ${incident.description}`,
      severity: SEVERITY_MAP[incident.severity],
      source: `urbanfarm/${site.id}`,
      timestamp: incident.createdAt,
      custom_details: {
        site_id: site.id,
        site_name: site.name,
        site_city: site.city,
        incident_id: incident.id,
        severity: incident.severity,
        description: incident.description,
        sensor_snapshot: {
          tempC: s.tempC,
          humidityPct: s.humidityPct,
          ph: s.ph,
          waterFlowLPerMin: s.waterFlowLPerMin,
          lightLux: s.lightLux,
          timestamp: s.timestamp,
        },
        agent_actions_attempted: incident.agentActions.length,
        agent_actions: incident.agentActions.map((a) => ({
          action: a.action,
          result: a.result,
          timestamp: a.timestamp,
        })),
      },
    },
    links: [
      {
        href: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/operations/${incident.id}`,
        text: "View incident in UrbanFarm",
      },
    ],
  };
}

function buildResolvePayload(incidentId: string): PagerDutyEventPayload {
  return {
    routing_key: process.env.PAGERDUTY_API_KEY ?? "MOCK",
    event_action: "resolve",
    dedup_key: dedupKey(incidentId),
  };
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Trigger a PagerDuty alert for an incident.
 * Returns the eventQueue entry ID for traceability.
 */
export async function triggerAlert(
  incident: Incident,
  site: Site,
): Promise<string> {
  const payload = buildTriggerPayload(incident, site);
  const queueId = await enqueue(payload);
  console.log(
    `[pagerduty] triggered alert for incident ${incident.id} ` +
      `(site=${site.id}, severity=${incident.severity}, queueId=${queueId})`,
  );
  return queueId;
}

/**
 * Resolve a PagerDuty alert by incident ID.
 * Safe to call even if no alert was previously sent (PagerDuty ignores unknown dedup keys).
 */
export async function resolveAlert(incidentId: string): Promise<void> {
  const payload = buildResolvePayload(incidentId);
  await enqueue(payload);
  console.log(`[pagerduty] resolved alert for incident ${incidentId}`);
}

/**
 * Acknowledge a PagerDuty alert (marks it as being worked).
 */
export async function acknowledgeAlert(incidentId: string): Promise<void> {
  const payload: PagerDutyEventPayload = {
    routing_key: process.env.PAGERDUTY_API_KEY ?? "MOCK",
    event_action: "acknowledge",
    dedup_key: dedupKey(incidentId),
  };
  await enqueue(payload);
  console.log(`[pagerduty] acknowledged alert for incident ${incidentId}`);
}
