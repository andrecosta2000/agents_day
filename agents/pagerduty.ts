import fs from "node:fs";
import type { SeverityLevel } from "@/types/interfaces";
import { pagerdutyMockLogFile, urbanfarmDir } from "./paths";

const EVENTS_URL = "https://events.eu.pagerduty.com/v2/enqueue";

export type PagerDutySeverity = "info" | "warning" | "error" | "critical";

function severityMap(sev: SeverityLevel): PagerDutySeverity {
	switch (sev) {
		case "low":
			return "info";
		case "medium":
			return "warning";
		case "high":
			return "error";
		case "critical":
			return "critical";
	}
}

export function isPagerDutyMock(): boolean {
	return process.env.PAGERDUTY_MOCK === "true" || process.env.PAGERDUTY_MOCK === "1";
}

export function getRoutingKey(): string | undefined {
	const k =
		process.env.PAGERDUTY_ROUTING_KEY?.trim() ||
		process.env.PAGERDUTY_INTEGRATION_KEY?.trim();
	return k || undefined;
}

export interface TriggerPayload {
	dedupKey: string;
	summary: string;
	severity: SeverityLevel;
	customDetails: Record<string, unknown>;
}

function ensureUrbanfarmDir(): void {
	fs.mkdirSync(urbanfarmDir(), { recursive: true });
}

function appendMockLog(line: object): void {
	ensureUrbanfarmDir();
	fs.appendFileSync(pagerdutyMockLogFile(), `${JSON.stringify(line)}\n`, "utf8");
}

/** Send Events API v2 trigger, or log locally when mock / missing key. */
export async function sendTrigger(payload: TriggerPayload): Promise<{ mock: boolean; ok: boolean }> {
	const routingKey = getRoutingKey();
	const mock = isPagerDutyMock() || !routingKey;
	const body = {
		routing_key: routingKey ?? "mock",
		event_action: "trigger" as const,
		dedup_key: payload.dedupKey,
		payload: {
			summary: payload.summary,
			severity: severityMap(payload.severity),
			source: "urbanfarm-optimizer",
			custom_details: payload.customDetails,
		},
	};

	if (mock) {
		appendMockLog({ ts: new Date().toISOString(), type: "trigger", body });
		return { mock: true, ok: true };
	}

	try {
		const res = await fetch(EVENTS_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const text = await res.text().catch(() => "");
		if (!res.ok) {
			console.error(
				`[pd] trigger FAIL status=${res.status} dedup=${body.dedup_key} :: ${text}`,
			);
		} else {
			console.log(
				`[pd] trigger OK status=${res.status} dedup=${body.dedup_key} :: ${text}`,
			);
		}
		return { mock: false, ok: res.ok };
	} catch (err) {
		console.error(
			`[pd] trigger THROW dedup=${body.dedup_key} :: ${err instanceof Error ? err.message : String(err)}`,
		);
		return { mock: false, ok: false };
	}
}

/** Resolve correlating incident via same dedup_key. */
export async function sendResolve(dedupKey: string): Promise<{ mock: boolean; ok: boolean }> {
	const routingKey = getRoutingKey();
	const mock = isPagerDutyMock() || !routingKey;
	const body = {
		routing_key: routingKey ?? "mock",
		event_action: "resolve" as const,
		dedup_key: dedupKey,
	};

	if (mock) {
		appendMockLog({ ts: new Date().toISOString(), type: "resolve", body });
		return { mock: true, ok: true };
	}

	try {
		const res = await fetch(EVENTS_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const text = await res.text().catch(() => "");
		if (!res.ok) {
			console.error(
				`[pd] resolve FAIL status=${res.status} dedup=${body.dedup_key} :: ${text}`,
			);
		} else {
			console.log(
				`[pd] resolve OK status=${res.status} dedup=${body.dedup_key} :: ${text}`,
			);
		}
		return { mock: false, ok: res.ok };
	} catch (err) {
		console.error(
			`[pd] resolve THROW dedup=${body.dedup_key} :: ${err instanceof Error ? err.message : String(err)}`,
		);
		return { mock: false, ok: false };
	}
}
