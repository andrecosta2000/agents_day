/**
 * Per-section sensor readings.
 *
 * A deployed farm is divided into growing sections — one logical group per
 * crop, split across the floors it occupies. Each section has its own
 * environment: temperature, humidity, pH, water flow, and light are all
 * managed independently for the crop growing there.
 *
 * This type is local to the frontend. Member 2 should align
 * GET /api/sites/[id]/sections to return SectionReading[].
 */

export interface SectionReading {
	siteId: string;
	cropId: string;
	cropName: string;
	/** 1-based floor / section index within this crop group */
	sectionIndex: number;
	/** Usable growing area for this section in m² */
	allocatedM2: number;
	timestamp: string;
	tempC: number;
	humidityPct: number;
	ph: number;
	waterFlowLPerMin: number;
	lightLux: number;
}

// Agent thresholds (agents/README.md) — used for anomaly detection
export const SENSOR_THRESHOLDS = {
	tempC:            { min: 18,   max: 28,    unit: "°C",    label: "Temp"      },
	humidityPct:      { min: 60,   max: 80,    unit: "%",     label: "Humidity"  },
	ph:               { min: 5.5,  max: 6.5,   unit: "",      label: "pH"        },
	waterFlowLPerMin: { min: 2,    max: 10,    unit: "L/min", label: "Flow"      },
	lightLux:         { min: 5000, max: 20000, unit: "lux",   label: "Light"     },
} as const;

export type SensorKey = keyof typeof SENSOR_THRESHOLDS;

export function isInRange(key: SensorKey, value: number): boolean {
	return value >= SENSOR_THRESHOLDS[key].min && value <= SENSOR_THRESHOLDS[key].max;
}

export function countSectionAnomalies(section: SectionReading): number {
	return (Object.keys(SENSOR_THRESHOLDS) as SensorKey[]).filter(
		(k) => !isInRange(k, section[k] as number),
	).length;
}

export type CropGroup = {
	cropId: string;
	cropName: string;
	sections: SectionReading[];
	/** Total anomalies across all sections */
	anomalyCount: number;
};

export function groupByCrop(readings: SectionReading[]): CropGroup[] {
	const map = new Map<string, SectionReading[]>();
	for (const r of readings) {
		const existing = map.get(r.cropId) ?? [];
		existing.push(r);
		map.set(r.cropId, existing);
	}
	return Array.from(map.entries()).map(([cropId, sections]) => ({
		cropId,
		cropName: sections[0].cropName,
		sections: sections.sort((a, b) => a.sectionIndex - b.sectionIndex),
		anomalyCount: sections.reduce((n, s) => n + countSectionAnomalies(s), 0),
	}));
}
