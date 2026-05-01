/**
 * SiteAgent
 *
 * Monitors one deployed vertical farming site on a 30-second loop:
 *
 *   1. Read sensor data from the simulator
 *   2. Check all values against thresholds
 *   3. If an anomaly is detected:
 *      a. Create an Incident in the store
 *      b. Attempt automated fix (up to MAX_FIX_ATTEMPTS times)
 *      c. If resolved → log success, close incident
 *      d. If not resolved → escalate to the Orchestrator callback
 *
 * The agent does not call PagerDuty directly — it escalates to the
 * Orchestrator, which decides whether to page based on cross-site patterns.
 */

import type { Site, SensorReading, SeverityLevel } from "@/types/interfaces";
import {
  generateReading,
  checkThresholds,
  breachSeverity,
  type ThresholdBreach,
} from "./simulator";
import {
  createIncident,
  addAgentAction,
  updateIncidentStatus,
  getIncidentsForSite,
} from "./incidentStore";

const POLL_INTERVAL_MS = 30_000;
const MAX_FIX_ATTEMPTS = 3;
const FIX_RETRY_DELAY_MS = 5_000;

// ── Automated fix logic ───────────────────────────────────────────────────

/**
 * Attempt a simulated automated remediation action for a sensor breach.
 * In production this would send commands to actuators (HVAC, irrigation,
 * grow-lights, etc.). Here we model it probabilistically so the agent
 * has realistic behaviour in demo mode.
 *
 * Returns `true` if the fix succeeded.
 */
async function attemptFix(
  site: Site,
  breach: ThresholdBreach,
): Promise<{ action: string; success: boolean }> {
  const actionMap: Record<string, string> = {
    tempC: breach.value > breach.max ? "Lowering HVAC setpoint by 2°C" : "Raising HVAC setpoint by 2°C",
    humidityPct: breach.value > breach.max ? "Activating dehumidifier" : "Activating humidifier",
    ph: breach.value > breach.max ? "Dosing pH-down solution" : "Dosing pH-up solution",
    waterFlowLPerMin: breach.value > breach.max ? "Throttling pump speed" : "Increasing pump speed",
    lightLux: breach.value > breach.max ? "Dimming grow lights by 20%" : "Increasing grow-light intensity",
  };

  const action =
    actionMap[breach.field] ?? `Adjusting ${breach.field} actuator`;

  // Simulate a 70% fix success rate — realistic for single-step remediation.
  await new Promise((r) => setTimeout(r, FIX_RETRY_DELAY_MS));
  const success = Math.random() < 0.7;

  return { action, success };
}

// ── SiteAgent class ───────────────────────────────────────────────────────

export type EscalateCallback = (
  site: Site,
  incidentId: string,
  severity: SeverityLevel,
  breaches: ThresholdBreach[],
  reading: SensorReading,
) => void;

export class SiteAgent {
  private site: Site;
  private onEscalate: EscalateCallback;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private lastReading: SensorReading | null = null;

  constructor(site: Site, onEscalate: EscalateCallback) {
    this.site = site;
    this.onEscalate = onEscalate;
  }

  /** Start the monitoring loop. */
  start(): void {
    if (this.running) return;
    this.running = true;
    console.log(`[SiteAgent:${this.site.id}] starting — polling every ${POLL_INTERVAL_MS / 1000}s`);
    // Run immediately, then on interval.
    void this.tick();
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
  }

  /** Stop the monitoring loop. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    console.log(`[SiteAgent:${this.site.id}] stopped`);
  }

  /** Return the most recently observed sensor reading. */
  getLastReading(): SensorReading | null {
    return this.lastReading;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    try {
      // Inject anomalies at 15% probability so the demo has activity.
      const reading = generateReading(this.site.id, { probability: 0.15 });
      this.lastReading = reading;

      const breaches = checkThresholds(reading);
      if (breaches.length === 0) return; // all clear

      const severity = breachSeverity(breaches);
      const description = this.buildDescription(breaches);

      console.log(
        `[SiteAgent:${this.site.id}] anomaly detected — ` +
          `${breaches.map((b) => b.field).join(", ")} out of range (${severity})`,
      );

      // Check if there's already an open incident for this site to avoid duplicates.
      const openIncidents = await getIncidentsForSite(this.site.id);
      const alreadyOpen = openIncidents.some(
        (inc) => inc.status === "open" || inc.status === "agent_resolving",
      );
      if (alreadyOpen) return;

      // Create the incident.
      const incident = await createIncident({
        siteId: this.site.id,
        severity,
        description,
        sensorSnapshot: reading,
      });

      // Mark as being worked.
      await updateIncidentStatus(incident.id, "agent_resolving");

      // Attempt automated fixes.
      let resolved = false;
      for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
        for (const breach of breaches) {
          const { action, success } = await attemptFix(this.site, breach);

          await addAgentAction(incident.id, {
            action: `[Attempt ${attempt}] ${action}`,
            result: success ? "success" : "failed",
          });

          if (success) {
            // Verify the fix by taking a new reading.
            const verification = generateReading(this.site.id);
            const remaining = checkThresholds(verification);
            this.lastReading = verification;

            if (remaining.length === 0) {
              resolved = true;
              break;
            }
          }
        }
        if (resolved) break;
      }

      if (resolved) {
        await updateIncidentStatus(incident.id, "resolved");
        await addAgentAction(incident.id, {
          action: "Automated remediation succeeded — incident closed",
          result: "success",
        });
        console.log(`[SiteAgent:${this.site.id}] incident ${incident.id} resolved automatically`);
      } else {
        await updateIncidentStatus(incident.id, "escalated");
        await addAgentAction(incident.id, {
          action: `Automated remediation failed after ${MAX_FIX_ATTEMPTS} attempts — escalating`,
          result: "failed",
        });
        console.warn(
          `[SiteAgent:${this.site.id}] incident ${incident.id} escalated to Orchestrator`,
        );
        this.onEscalate(this.site, incident.id, severity, breaches, reading);
      }
    } catch (err) {
      console.error(`[SiteAgent:${this.site.id}] tick error: ${(err as Error).message}`);
    }
  }

  private buildDescription(breaches: ThresholdBreach[]): string {
    const parts = breaches.map(
      ({ field, value, min, max }) =>
        `${field}=${value} (expected ${min}–${max})`,
    );
    return `Sensor out of range: ${parts.join("; ")}`;
  }
}
