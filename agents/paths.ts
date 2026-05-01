import path from "node:path";

/** Local persistence for incidents, queues, and mock PagerDuty logs (gitignored). */
export function urbanfarmDir(): string {
	return path.join(process.cwd(), ".urbanfarm");
}

export function incidentsFile(): string {
	return path.join(urbanfarmDir(), "incidents.json");
}

export function outboundQueueFile(): string {
	return path.join(urbanfarmDir(), "outbound-events.json");
}

export function pagerdutyMockLogFile(): string {
	return path.join(urbanfarmDir(), "pagerduty-mock.jsonl");
}
