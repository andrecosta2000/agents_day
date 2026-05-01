/**
 * Sensor Simulator
 *
 * Generates realistic SensorReading objects for deployed sites.
 * In normal operation values stay within healthy thresholds; anomaly injection
 * is controlled per-sensor via AnomalyConfig so the SiteAgent has something
 * to detect and act on.
 *
 * Normal sensor ranges (from agents/README.md):
 *   Temperature   18–28 °C
 *   Humidity      60–80 %
 *   pH            5.5–6.5
 *   Water flow    2–10 L/min
 *   Light         5000–20 000 lux
 */

import type { SensorReading } from "@/types/interfaces";

// ── Threshold constants ────────────────────────────────────────────────────

export const THRESHOLDS = {
  tempC:             { min: 18, max: 28 },
  humidityPct:       { min: 60, max: 80 },
  ph:                { min: 5.5, max: 6.5 },
  waterFlowLPerMin:  { min: 2,  max: 10  },
  lightLux:          { min: 5000, max: 20000 },
} as const;

// ── Anomaly configuration ─────────────────────────────────────────────────

export interface AnomalyConfig {
  /** 0–1 probability that a given reading is anomalous */
  probability?: number;
  /** Which sensors to perturb. Defaults to all. */
  sensors?: Array<keyof typeof THRESHOLDS>;
  /** How far outside the range to go (multiplier on the gap). Default 1.5 */
  severity?: number;
}

// ── Normal baseline values (midpoints with small variance) ────────────────

function midpoint(min: number, max: number): number {
  return (min + max) / 2;
}

function jitter(value: number, pct = 0.05): number {
  return value + value * (Math.random() * 2 - 1) * pct;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalReading(siteId: string): SensorReading {
  return {
    siteId,
    timestamp: new Date().toISOString(),
    tempC:            Number(jitter(midpoint(18, 28), 0.08).toFixed(1)),
    humidityPct:      Number(jitter(midpoint(60, 80), 0.06).toFixed(1)),
    ph:               Number(jitter(midpoint(5.5, 6.5), 0.04).toFixed(2)),
    waterFlowLPerMin: Number(jitter(midpoint(2, 10), 0.10).toFixed(2)),
    lightLux:         Math.round(jitter(midpoint(5000, 20000), 0.08)),
  };
}

/**
 * Push a sensor value outside its safe range.
 * severity > 1 means more extreme — e.g. 1.5 = halfway into danger zone.
 */
function makeAnomalous(
  field: keyof typeof THRESHOLDS,
  severity: number,
): number {
  const { min, max } = THRESHOLDS[field];
  const range = max - min;
  const gap = range * 0.1 * severity; // breach by at least 10% of range

  // Randomly go high or low.
  if (Math.random() < 0.5) {
    return Number((max + gap).toFixed(2));
  }
  return Number((min - gap).toFixed(2));
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Generate one SensorReading for the given site.
 *
 * When anomalyConfig is provided there is a `probability` chance that one or
 * more of the listed sensors will read outside its safe threshold.
 */
export function generateReading(
  siteId: string,
  anomalyConfig?: AnomalyConfig,
): SensorReading {
  const reading = normalReading(siteId);

  if (!anomalyConfig) return reading;

  const {
    probability = 0.1,
    sensors = Object.keys(THRESHOLDS) as Array<keyof typeof THRESHOLDS>,
    severity = 1.5,
  } = anomalyConfig;

  if (Math.random() < probability) {
    // Pick one sensor to make anomalous.
    const target = sensors[Math.floor(Math.random() * sensors.length)];
    const anomalousValue = makeAnomalous(target, severity);
    (reading as unknown as Record<string, number>)[target] = anomalousValue;
  }

  return reading;
}

/**
 * Check a SensorReading against the safe thresholds.
 * Returns a list of breached fields.
 */
export interface ThresholdBreach {
  field: keyof typeof THRESHOLDS;
  value: number;
  min: number;
  max: number;
}

export function checkThresholds(reading: SensorReading): ThresholdBreach[] {
  const breaches: ThresholdBreach[] = [];
  const fields = Object.keys(THRESHOLDS) as Array<keyof typeof THRESHOLDS>;

  for (const field of fields) {
    const value = reading[field] as number;
    const { min, max } = THRESHOLDS[field];
    if (value < min || value > max) {
      breaches.push({ field, value, min, max });
    }
  }

  return breaches;
}

/**
 * Determine the severity level from a list of breaches.
 * Multiple breaches or extreme values escalate severity.
 */
export function breachSeverity(
  breaches: ThresholdBreach[],
): "low" | "medium" | "high" | "critical" {
  if (breaches.length === 0) return "low";

  const maxExcess = Math.max(
    ...breaches.map(({ value, min, max }) => {
      const range = max - min;
      const excess = value > max ? (value - max) / range : (min - value) / range;
      return excess;
    }),
  );

  if (breaches.length >= 3 || maxExcess >= 0.5) return "critical";
  if (breaches.length === 2 || maxExcess >= 0.25) return "high";
  if (maxExcess >= 0.1) return "medium";
  return "low";
}
