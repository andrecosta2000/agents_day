import fs from "node:fs";

import seedIncidents from "@/app/mocks/incidents.json";
import type { Incident } from "@/types/interfaces";
import { incidentsFile, urbanfarmDir } from "./paths";

interface StoreFile {
	incidents: Incident[];
	seededFromMocks?: boolean;
}

let lock: Promise<void> = Promise.resolve();

function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
	let resolve!: () => void;
	const p = new Promise<void>((r) => {
		resolve = r;
	});
	const prev = lock;
	lock = lock.then(() => p);
	return prev.then(fn).finally(resolve);
}

function flattenMocks(): Incident[] {
	const idx = seedIncidents as Record<string, Incident[]>;
	return Object.values(idx).flat();
}

function readStore(): StoreFile {
	try {
		const raw = fs.readFileSync(incidentsFile(), "utf8");
		const parsed = JSON.parse(raw) as StoreFile;
		return {
			incidents: Array.isArray(parsed.incidents) ? parsed.incidents : [],
			seededFromMocks: parsed.seededFromMocks === true,
		};
	} catch {
		return { incidents: [], seededFromMocks: false };
	}
}

function writeAtomic(data: StoreFile): void {
	fs.mkdirSync(urbanfarmDir(), { recursive: true });
	const tmp = `${incidentsFile()}.${process.pid}.tmp`;
	fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
	fs.renameSync(tmp, incidentsFile());
}

function maybeBootstrap(data: StoreFile): StoreFile {
	if (data.incidents.length > 0 || data.seededFromMocks) {
		return data;
	}
	return { incidents: flattenMocks(), seededFromMocks: true };
}

function loadMerged(): StoreFile {
	const base = fs.existsSync(incidentsFile())
		? readStore()
		: { incidents: [], seededFromMocks: false };
	return maybeBootstrap(base);
}

export async function listIncidentsBySite(siteId: string): Promise<Incident[]> {
	return withStoreLock(async () => {
		const live = loadMerged();
		writeAtomic(live);
		return live.incidents
			.filter((i) => i.siteId === siteId)
			.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
	});
}

export async function upsertIncident(incident: Incident): Promise<void> {
	await withStoreLock(async () => {
		const live = loadMerged();
		const idx = live.incidents.findIndex((i) => i.id === incident.id);
		if (idx >= 0) {
			live.incidents[idx] = incident;
		} else {
			live.incidents.push(incident);
		}
		writeAtomic(live);
	});
}

export async function resolveIncidentById(id: string): Promise<Incident | null> {
	return withStoreLock(async () => {
		const live = loadMerged();
		const idx = live.incidents.findIndex((i) => i.id === id);
		if (idx < 0) {
			return null;
		}
		const now = new Date().toISOString();
		const updated: Incident = {
			...live.incidents[idx],
			status: "resolved",
			updatedAt: now,
		};
		live.incidents[idx] = updated;
		writeAtomic(live);
		return updated;
	});
}

export async function getIncidentById(id: string): Promise<Incident | null> {
	return withStoreLock(async () => {
		const live = loadMerged();
		writeAtomic(live);
		return live.incidents.find((i) => i.id === id) ?? null;
	});
}
