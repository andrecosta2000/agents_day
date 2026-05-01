import type { SensorReading } from "@/types/interfaces";

import type { AnomalyKind } from "./thresholds";
import { THRESHOLDS } from "./thresholds";

export interface InjectedAnomaly {
	kinds: AnomalyKind[];
	autoResolvable: boolean;
}

export interface SimulatorTick {
	reading: SensorReading;
	injected?: InjectedAnomaly;
}

type SiteSimState = {
	tickIndex: number;
};

/** Deterministic PRNG per site/tick. */
function mulberry32(seed: number): () => number {
	return function () {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hashSite(siteId: string): number {
	let h = 0;
	for (let i = 0; i < siteId.length; i++) {
		h = Math.imul(31, h) + siteId.charCodeAt(i);
	}
	return h >>> 0;
}

function nominalReading(siteId: string, iso: string): SensorReading {
	return {
		siteId,
		timestamp: iso,
		tempC: 23,
		humidityPct: 70,
		ph: 6.0,
		waterFlowLPerMin: 6,
		lightLux: 12000,
	};
}

function jitter(reading: SensorReading, rnd: () => number): SensorReading {
	const j = (x: number, mag: number) => x + (rnd() - 0.5) * mag;
	return {
		...reading,
		tempC: Math.round(j(reading.tempC, 0.9) * 10) / 10,
		humidityPct: Math.round(j(reading.humidityPct, 5)),
		ph: Math.round(j(reading.ph, 0.12) * 10) / 10,
		waterFlowLPerMin: Math.round(j(reading.waterFlowLPerMin, 0.45) * 10) / 10,
		lightLux: Math.round(j(reading.lightLux, 900)),
	};
}

function applyAnomaly(reading: SensorReading, kind: AnomalyKind): SensorReading {
	const r = { ...reading };
	switch (kind) {
		case "temp":
			r.tempC = THRESHOLDS.tempC.max + 3;
			break;
		case "humidity":
			r.humidityPct = THRESHOLDS.humidityPct.max + 6;
			break;
		case "ph":
			r.ph = THRESHOLDS.ph.min - 0.45;
			break;
		case "waterFlow":
			r.waterFlowLPerMin = THRESHOLDS.waterFlowLPerMin.min - 0.95;
			break;
		case "light":
			r.lightLux = THRESHOLDS.lightLux.min - 900;
			break;
	}
	return r;
}

export class SensorSimulator {
	private readonly sites = new Map<string, SiteSimState>();
	/** Sticky anomaly until remediation succeeds or orchestrator clears. */
	private readonly sticky = new Map<string, InjectedAnomaly>();

	private rng(siteId: string, salt: number): () => number {
		const st = this.sites.get(siteId);
		const seed = hashSite(siteId) ^ ((st?.tickIndex ?? 0) * 2654435761) ^ salt;
		return mulberry32(seed);
	}

	private bump(siteId: string): SiteSimState {
		const cur = this.sites.get(siteId) ?? { tickIndex: 0 };
		const next = { tickIndex: cur.tickIndex + 1 };
		this.sites.set(siteId, next);
		return next;
	}

	/** After SiteAgent successfully auto-remediated. */
	acknowledgeSuccessfulFix(siteId: string): void {
		this.sticky.delete(siteId);
	}

	/** After escalation so the site can generate fresh anomalies later. */
	clearSticky(siteId: string): void {
		this.sticky.delete(siteId);
	}

	next(siteId: string): SimulatorTick {
		this.bump(siteId);
		const iso = new Date().toISOString();
		const rnd = this.rng(siteId, 1);

		const stuck = this.sticky.get(siteId);
		if (stuck) {
			let reading = nominalReading(siteId, iso);
			reading = jitter(reading, rnd);
			const kind = stuck.kinds[0]!;
			reading = applyAnomaly(reading, kind);
			return { reading, injected: stuck };
		}

		let reading = nominalReading(siteId, iso);
		reading = jitter(reading, rnd);

		const injectChance = 0.14;
		if (rnd() > injectChance) {
			return { reading };
		}

		const kindsRoll: AnomalyKind[] = ["temp", "humidity", "ph", "waterFlow", "light"];
		const kind = kindsRoll[Math.floor(rnd() * kindsRoll.length)]!;
		const autoResolvable = rnd() > 0.38;
		const injected: InjectedAnomaly = { kinds: [kind], autoResolvable };
		this.sticky.set(siteId, injected);
		reading = applyAnomaly(reading, kind);
		return { reading, injected };
	}
}
