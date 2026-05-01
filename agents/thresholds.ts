/** Agronomic / equipment bounds — aligned with agents/README. */

export const THRESHOLDS = {
	tempC: { min: 18, max: 28 },
	humidityPct: { min: 60, max: 80 },
	ph: { min: 5.5, max: 6.5 },
	waterFlowLPerMin: { min: 2, max: 10 },
	lightLux: { min: 5000, max: 20000 },
} as const;

export type AnomalyKind =
	| "temp"
	| "humidity"
	| "ph"
	| "waterFlow"
	| "light";

export function detectAnomalies(reading: {
	tempC: number;
	humidityPct: number;
	ph: number;
	waterFlowLPerMin: number;
	lightLux: number;
}): AnomalyKind[] {
	const kinds: AnomalyKind[] = [];
	if (reading.tempC < THRESHOLDS.tempC.min || reading.tempC > THRESHOLDS.tempC.max) {
		kinds.push("temp");
	}
	if (
		reading.humidityPct < THRESHOLDS.humidityPct.min ||
		reading.humidityPct > THRESHOLDS.humidityPct.max
	) {
		kinds.push("humidity");
	}
	if (reading.ph < THRESHOLDS.ph.min || reading.ph > THRESHOLDS.ph.max) {
		kinds.push("ph");
	}
	if (
		reading.waterFlowLPerMin < THRESHOLDS.waterFlowLPerMin.min ||
		reading.waterFlowLPerMin > THRESHOLDS.waterFlowLPerMin.max
	) {
		kinds.push("waterFlow");
	}
	if (reading.lightLux < THRESHOLDS.lightLux.min || reading.lightLux > THRESHOLDS.lightLux.max) {
		kinds.push("light");
	}
	return kinds;
}
