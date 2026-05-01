import fs from "node:fs";

import { outboundQueueFile, urbanfarmDir } from "./paths";
import { sendResolve, sendTrigger, type TriggerPayload } from "./pagerduty";

export type QueuedEvent =
	| { kind: "trigger"; payload: TriggerPayload }
	| { kind: "resolve"; dedupKey: string };

interface QueueFile {
	events: QueuedEvent[];
}

function ensureDir(): void {
	fs.mkdirSync(urbanfarmDir(), { recursive: true });
}

function readQueue(): QueuedEvent[] {
	try {
		const raw = fs.readFileSync(outboundQueueFile(), "utf8");
		const parsed = JSON.parse(raw) as QueueFile;
		return Array.isArray(parsed.events) ? parsed.events : [];
	} catch {
		return [];
	}
}

function writeQueue(events: QueuedEvent[]): void {
	ensureDir();
	const tmp = `${outboundQueueFile()}.${process.pid}.tmp`;
	const data = JSON.stringify({ events }, null, 2);
	fs.writeFileSync(tmp, data, "utf8");
	fs.renameSync(tmp, outboundQueueFile());
}

let flushMutex = Promise.resolve();

export function enqueueEvent(ev: QueuedEvent): void {
	const q = readQueue();
	q.push(ev);
	writeQueue(q);
}

/** When AGENT_OFFLINE=true or probe fails, callers enqueue instead of sending. */
export function isAgentOffline(): boolean {
	return process.env.AGENT_OFFLINE === "true" || process.env.AGENT_OFFLINE === "1";
}

export async function probeConnectivity(): Promise<boolean> {
	if (isAgentOffline()) {
		return false;
	}
	const url = process.env.AGENT_CONNECTIVITY_URL?.trim();
	if (!url) {
		return true;
	}
	try {
		const ctrl = new AbortController();
		const t = setTimeout(() => ctrl.abort(), 4000);
		const res = await fetch(url, { method: "HEAD", signal: ctrl.signal }).catch(() => null);
		clearTimeout(t);
		return res !== null && res.ok;
	} catch {
		return false;
	}
}

async function runFlush(): Promise<void> {
	const online = await probeConnectivity();
	if (!online) {
		return;
	}
	const pending = readQueue();
	if (pending.length === 0) {
		return;
	}
	const remaining: QueuedEvent[] = [];
	for (const ev of pending) {
		if (ev.kind === "trigger") {
			const { ok } = await sendTrigger(ev.payload);
			if (!ok) {
				remaining.push(ev);
			}
		} else {
			const { ok } = await sendResolve(ev.dedupKey);
			if (!ok) {
				remaining.push(ev);
			}
		}
	}
	writeQueue(remaining);
}

export function flushQueueSoon(): void {
	flushMutex = flushMutex.then(() => runFlush()).catch(() => {});
}

export function flushQueueSyncForTests(): void {
	// exposed if tests need drain; runner calls flushQueueSoon
}
