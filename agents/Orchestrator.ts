/**
 * Orchestrator
 *
 * Manages a fleet of SiteAgents and acts as the escalation target when an
 * agent cannot self-remediate.  Its responsibilities:
 *
 *   1. Spawn and track one SiteAgent per deployed site.
 *   2. Receive escalations from agents.
 *   3. Detect cross-site anomaly patterns (≥2 sites with the same sensor
 *      breach type within a 5-minute window → systemic issue).
 *   4. Trigger PagerDuty for every escalated incident; upgrade severity to
 *      "critical" when a systemic pattern is detected.
 *
 * The Orchestrator is a singleton started lazily when the first
 * `/api/sites/deployed` request hits the runtime (via `getOrchestrator()`).
 */

import type { Site, SeverityLevel } from "@/types/interfaces";
import { SiteAgent, type EscalateCallback } from "./SiteAgent";
import { getIncident, setPagerDutyId, updateIncidentStatus } from "./incidentStore";
import { triggerAlert } from "./pagerduty";
import type { ThresholdBreach } from "./simulator";
import type { SensorReading } from "@/types/interfaces";

const CROSS_SITE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const CROSS_SITE_THRESHOLD = 2; // ≥ N sites with same breach type = systemic

// ── Cross-site pattern detection ──────────────────────────────────────────

interface EscalationRecord {
  siteId: string;
  incidentId: string;
  severity: SeverityLevel;
  breaches: ThresholdBreach[];
  timestamp: number;
}

// ── Orchestrator class ────────────────────────────────────────────────────

export class Orchestrator {
  private agents = new Map<string, SiteAgent>();
  private escalations: EscalationRecord[] = [];

  /** Start monitoring all provided sites. */
  startAll(sites: Site[]): void {
    for (const site of sites) {
      if (this.agents.has(site.id)) continue; // already watching
      const agent = new SiteAgent(site, this.makeEscalateCallback(site));
      this.agents.set(site.id, agent);
      agent.start();
    }
    console.log(`[Orchestrator] monitoring ${this.agents.size} site(s)`);
  }

  /** Stop all agents. */
  stopAll(): void {
    for (const agent of this.agents.values()) agent.stop();
    this.agents.clear();
    console.log("[Orchestrator] all agents stopped");
  }

  /** Add a single site dynamically (e.g. newly deployed site). */
  addSite(site: Site): void {
    if (this.agents.has(site.id)) return;
    const agent = new SiteAgent(site, this.makeEscalateCallback(site));
    this.agents.set(site.id, agent);
    agent.start();
    console.log(`[Orchestrator] added site ${site.id}`);
  }

  /** Remove a site (decommissioned). */
  removeSite(siteId: string): void {
    const agent = this.agents.get(siteId);
    if (agent) {
      agent.stop();
      this.agents.delete(siteId);
      console.log(`[Orchestrator] removed site ${siteId}`);
    }
  }

  /** Get the latest sensor reading for a site (from its agent). */
  getLatestReading(siteId: string): SensorReading | null {
    return this.agents.get(siteId)?.getLastReading() ?? null;
  }

  /** Return a list of monitored site IDs. */
  monitoredSites(): string[] {
    return Array.from(this.agents.keys());
  }

  // ── Escalation handling ──────────────────────────────────────────────────

  private makeEscalateCallback(site: Site): EscalateCallback {
    return (
      escalatingSite: Site,
      incidentId: string,
      severity: SeverityLevel,
      breaches: ThresholdBreach[],
      reading: SensorReading,
    ) => {
      void this.handleEscalation(escalatingSite, incidentId, severity, breaches, reading);
    };
  }

  private async handleEscalation(
    site: Site,
    incidentId: string,
    severity: SeverityLevel,
    breaches: ThresholdBreach[],
    _reading: SensorReading,
  ): Promise<void> {
    const now = Date.now();

    // Record this escalation.
    this.escalations.push({ siteId: site.id, incidentId, severity, breaches, timestamp: now });

    // Prune old escalations outside the cross-site window.
    this.escalations = this.escalations.filter(
      (e) => now - e.timestamp <= CROSS_SITE_WINDOW_MS,
    );

    // Detect systemic patterns.
    const effectiveSeverity = this.detectSystemicPattern(breaches, site.id)
      ? "critical"
      : severity;

    if (effectiveSeverity === "critical" && severity !== "critical") {
      console.warn(
        `[Orchestrator] systemic pattern detected across sites — upgrading ${incidentId} to critical`,
      );
    }

    // Fetch the incident and trigger PagerDuty.
    const incident = await getIncident(incidentId);
    if (!incident) {
      console.error(`[Orchestrator] incident ${incidentId} not found in store`);
      return;
    }

    // If severity was upgraded, update the store record too.
    if (effectiveSeverity !== severity) {
      await updateIncidentStatus(incidentId, "escalated");
    }

    try {
      const queueId = await triggerAlert(
        { ...incident, severity: effectiveSeverity },
        site,
      );
      await setPagerDutyId(incidentId, queueId);
    } catch (err) {
      console.error(
        `[Orchestrator] PagerDuty trigger failed for ${incidentId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Returns true if ≥ CROSS_SITE_THRESHOLD other sites have recently
   * escalated with the same breach field(s) as the current incident.
   */
  private detectSystemicPattern(
    currentBreaches: ThresholdBreach[],
    currentSiteId: string,
  ): boolean {
    const currentFields = new Set(currentBreaches.map((b) => b.field));

    const matchingSites = new Set<string>();
    for (const rec of this.escalations) {
      if (rec.siteId === currentSiteId) continue;
      const overlap = rec.breaches.some((b) => currentFields.has(b.field));
      if (overlap) matchingSites.add(rec.siteId);
    }

    return matchingSites.size >= CROSS_SITE_THRESHOLD;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────

let instance: Orchestrator | null = null;

/**
 * Return the global Orchestrator singleton, creating it if necessary.
 * Does NOT start agents — call `orchestrator.startAll(sites)` separately.
 */
export function getOrchestrator(): Orchestrator {
  if (!instance) {
    instance = new Orchestrator();
  }
  return instance;
}
