import type { AgentAction, Incident, SensorReading, SeverityLevel } from "@/types/interfaces";

import type { AnomalyKind } from "./thresholds";
import { detectAnomalies } from "./thresholds";
import type { InjectedAnomaly } from "./simulator";

export enum SiteAgentState {
	Idle = "idle",
	Monitoring = "monitoring",
	Acting = "acting",
	EscalationPending = "escalation_pending",
}

export type SiteHandoff = {
	siteId: string;
	severity: SeverityLevel;
	description: string;
	sensorSnapshot: SensorReading;
	agentActions: AgentAction[];
	primaryKind: AnomalyKind;
};

export type SiteTickResult = {
	handoff: SiteHandoff | null;
	/** SiteAgent cleared anomaly via automation — simulator should acknowledge fix. */
	fixedLocally: boolean;
};

function actionForAttempt(kind: AnomalyKind, attemptIndexZeroBased: number): string {
	const pick = attemptIndexZeroBased % 3;
	switch (kind) {
		case "temp":
			return pick === 0
				? "Adjusted HVAC setpoint to 22°C"
				: pick === 1
					? "Increased ventilation duty cycle 8%"
					: "Trimmed supplemental heating curve −0.8°C";
		case "humidity":
			return pick === 0
				? "Reduced misting duty cycle 10%"
				: pick === 1
					? "Increased dehumidifier target −3% RH"
					: "Shifted airflow pattern to upper canopy";
		case "ph":
			return pick === 0
				? "Adjusted nutrient dosing (pH buffer +)"
				: pick === 1
					? "Flushed calibration probe & rechecked sample line"
					: "Micro-adjusted irrigation acid feed rate";
		case "waterFlow":
			return pick === 0
				? "Increased irrigation flow 15%"
				: pick === 1
					? "Opened backup circulation valve"
					: "Pulsed line purge to clear obstruction";
		case "light":
			return pick === 0
				? "Extended photoperiod 45 minutes"
				: pick === 1
					? "Raised LED drive current 6%"
					: "Rebalanced rack-level PAR targets";
	}
}

function severityForKind(kind: AnomalyKind): SeverityLevel {
	switch (kind) {
		case "light":
		case "humidity":
			return "medium";
		case "temp":
		case "ph":
			return "high";
		case "waterFlow":
			return "critical";
	}
}

function describeIncident(kind: AnomalyKind, r: SensorReading): string {
	switch (kind) {
		case "temp":
			return `Temperature out of range (${r.tempC.toFixed(1)}°C) after automated HVAC adjustments.`;
		case "humidity":
			return `Humidity out of range (${r.humidityPct}% RH) — misting/dehumidification insufficient.`;
		case "ph":
			return `Irrigation pH drift (${r.ph}) beyond acceptable band.`;
		case "waterFlow":
			return `Water flow critically low (${r.waterFlowLPerMin} L/min) — circulation risk.`;
		case "light":
			return `PPFD/lux below target (${r.lightLux} lux) — crop photoperiod at risk.`;
	}
}

export class SiteAgent {
	readonly siteId: string;
	state: SiteAgentState = SiteAgentState.Idle;
	private attempt = 0;
	private actions: AgentAction[] = [];
	private primaryKind: AnomalyKind | null = null;

	constructor(siteId: string) {
		this.siteId = siteId;
	}

	handleTick(reading: SensorReading, injected?: InjectedAnomaly): SiteTickResult {
		const kinds = detectAnomalies(reading);

		if (kinds.length === 0) {
			this.softReset();
			return { handoff: null, fixedLocally: false };
		}

		this.state = SiteAgentState.Acting;
		if (!this.primaryKind) {
			this.primaryKind = injected?.kinds[0] ?? kinds[0]!;
			this.attempt = 0;
			this.actions = [];
		}

		this.attempt += 1;
		const auto = injected?.autoResolvable === true;
		const ts = new Date().toISOString();
		const msg = actionForAttempt(this.primaryKind, this.attempt - 1);
		const success = auto && this.attempt >= 2;

		if (success) {
			this.actions.push({ timestamp: ts, action: msg, result: "success" });
			this.softReset();
			this.state = SiteAgentState.Monitoring;
			return { handoff: null, fixedLocally: true };
		}

		const actionResult: AgentAction["result"] =
			this.attempt >= 3 ? "failed" : "pending";
		this.actions.push({ timestamp: ts, action: msg, result: actionResult });

		if (this.attempt < 3) {
			return { handoff: null, fixedLocally: false };
		}

		this.state = SiteAgentState.EscalationPending;
		const handoff: SiteHandoff = {
			siteId: this.siteId,
			severity: severityForKind(this.primaryKind),
			description: describeIncident(this.primaryKind, reading),
			sensorSnapshot: { ...reading },
			agentActions: this.actions.map((a) =>
				a.result === "pending" ? { ...a, result: "failed" as const } : a,
			),
			primaryKind: this.primaryKind,
		};
		this.softReset();
		return { handoff, fixedLocally: false };
	}

	private softReset(): void {
		this.attempt = 0;
		this.actions = [];
		this.primaryKind = null;
		this.state = SiteAgentState.Idle;
	}
}

export function draftIncident(h: SiteHandoff, id: string): Incident {
	const now = new Date().toISOString();
	return {
		id,
		siteId: h.siteId,
		severity: h.severity,
		status: "agent_resolving",
		description: h.description,
		sensorSnapshot: h.sensorSnapshot,
		agentActions: h.agentActions,
		createdAt: now,
		updatedAt: now,
	};
}
