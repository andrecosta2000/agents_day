import { randomUUID } from "node:crypto";

import type { Incident, SeverityLevel } from "@/types/interfaces";

import { draftIncident, SiteAgent, type SiteHandoff } from "./SiteAgent";
import { enqueueEvent, flushQueueSoon, probeConnectivity } from "./eventQueue";
import { upsertIncident } from "./incidentStore";
import { sendTrigger, type TriggerPayload } from "./pagerduty";
import type { AnomalyKind } from "./thresholds";
import type { SensorSimulator } from "./simulator";

type WindowEntry = { siteId: string; kind: AnomalyKind; ts: number };

const WINDOW_MS = 20 * 60 * 1000;

function bumpSeverity(a: SeverityLevel, b: SeverityLevel): SeverityLevel {
	const rank: SeverityLevel[] = ["low", "medium", "high", "critical"];
	return rank[Math.max(rank.indexOf(a), rank.indexOf(b))]!;
}

export class OrchestratorAgent {
	private readonly siteAgents = new Map<string, SiteAgent>();
	private readonly window: WindowEntry[] = [];

	constructor(
		private readonly siteIds: readonly string[],
		private readonly simulator: SensorSimulator,
	) {
		for (const id of siteIds) {
			this.siteAgents.set(id, new SiteAgent(id));
		}
	}

	private pruneWindow(): void {
		const cut = Date.now() - WINDOW_MS;
		let i = 0;
		while (i < this.window.length) {
			if (this.window[i]!.ts < cut) {
				this.window.splice(i, 1);
			} else {
				i += 1;
			}
		}
	}

	private crossSiteCritical(kind: AnomalyKind): boolean {
		this.pruneWindow();
		const sites = new Set(this.window.filter((w) => w.kind === kind).map((w) => w.siteId));
		return sites.size >= 2;
	}

	private async firePagerDuty(inc: Incident): Promise<void> {
		const customDetails = {
			siteId: inc.siteId,
			incidentId: inc.id,
			severity: inc.severity,
			sensorSnapshot: inc.sensorSnapshot,
			agentActionsAttempted: inc.agentActions,
			description: inc.description,
		};
		const payload: TriggerPayload = {
			dedupKey: inc.id,
			summary: `[UrbanFarm] ${inc.siteId}: ${inc.description.slice(0, 120)}`,
			severity: inc.severity,
			customDetails,
		};

		const online = await probeConnectivity();
		if (!online) {
			enqueueEvent({ kind: "trigger", payload });
			return;
		}
		await sendTrigger(payload);
	}

	private async processHandoff(h: SiteHandoff): Promise<void> {
		this.window.push({ siteId: h.siteId, kind: h.primaryKind, ts: Date.now() });

		let severity = h.severity;
		if (this.crossSiteCritical(h.primaryKind)) {
			severity = bumpSeverity(severity, "critical");
		}

		const id = randomUUID();
		const base = draftIncident(h, id);
		const incident: Incident = {
			...base,
			severity,
			status: "escalated",
			pagerdutyIncidentId: id,
			updatedAt: new Date().toISOString(),
		};

		await upsertIncident(incident);
		await this.firePagerDuty(incident);
	}

	/** One polling cycle for all sites (e.g. every 30s). */
	async tick(): Promise<void> {
		for (const siteId of this.siteIds) {
			const { reading, injected } = this.simulator.next(siteId);
			const agent = this.siteAgents.get(siteId)!;
			const { handoff, fixedLocally } = await agent.handleTick(reading, injected);

			if (fixedLocally) {
				this.simulator.acknowledgeSuccessfulFix(siteId);
			}

			if (handoff) {
				await this.processHandoff(handoff);
				this.simulator.clearSticky(siteId);
			}
		}
		flushQueueSoon();
	}
}
