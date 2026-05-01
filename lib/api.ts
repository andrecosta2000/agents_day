import demandByCity from "@/app/mocks/demand.json";
import incidentsBySite from "@/app/mocks/incidents.json";
import reportsById from "@/app/mocks/reports.json";
import sitesAll from "@/app/mocks/sites.json";
import type { Demand, Incident, Site, SiteReport } from "@/types/interfaces";

const sites = sitesAll as Site[];
const reports = reportsById as Record<string, SiteReport>;
const demandIndex = demandByCity as Record<string, Demand[]>;
const incidentsIndex = incidentsBySite as Record<string, Incident[]>;

/** When unset or any value other than `"false"`, bundled mocks are used (good default until API routes land). */
export function shouldUseApiMocks(): boolean {
	return process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
	const res = await fetch(input, {
		...init,
		headers: { Accept: "application/json", ...init?.headers },
	});
	if (!res.ok) {
		throw new Error(`Request failed: ${res.status} ${res.statusText}`);
	}
	return res.json() as Promise<T>;
}

function normalizeCity(city: string): string {
	return city.trim().toLowerCase();
}

export async function getSites(city: string): Promise<Site[]> {
	if (shouldUseApiMocks()) {
		const key = normalizeCity(city);
		return sites.filter((s) => normalizeCity(s.city) === key);
	}
	return fetchJson<Site[]>(`/api/sites?city=${encodeURIComponent(city)}`);
}

export async function getSiteReport(siteId: string): Promise<SiteReport | null> {
	if (shouldUseApiMocks()) {
		return reports[siteId] ?? null;
	}
	return fetchJson<SiteReport>(`/api/sites/${encodeURIComponent(siteId)}/report`);
}

export async function getProduceDemand(city: string): Promise<Demand[]> {
	if (shouldUseApiMocks()) {
		return demandIndex[normalizeCity(city)] ?? [];
	}
	return fetchJson<Demand[]>(
		`/api/produce-demand?city=${encodeURIComponent(city)}`,
	);
}

export async function getIncidents(siteId: string): Promise<Incident[]> {
	if (shouldUseApiMocks()) {
		return incidentsIndex[siteId] ?? [];
	}
	return fetchJson<Incident[]>(
		`/api/incidents?siteId=${encodeURIComponent(siteId)}`,
	);
}

export async function resolveIncident(
	incidentId: string,
): Promise<{ status: "resolved" }> {
	if (shouldUseApiMocks()) {
		return { status: "resolved" };
	}
	return fetchJson<{ status: "resolved" }>(
		`/api/incidents/${encodeURIComponent(incidentId)}/resolve`,
		{ method: "POST" },
	);
}
