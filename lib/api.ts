import demandByCity from "@/app/mocks/demand.json";
import deployedSitesList from "@/app/mocks/deployed-sites.json";
import incidentsBySite from "@/app/mocks/incidents.json";
import reportsById from "@/app/mocks/reports.json";
import sectionReadingsBySite from "@/app/mocks/section-readings.json";
import sensorReadingsBySite from "@/app/mocks/sensor-readings.json";
import sitesAll from "@/app/mocks/sites.json";
import type { Demand, Incident, Site, SiteReport, SensorReading } from "@/types/interfaces";
import type { SectionReading } from "@/lib/section-types";

const sites = sitesAll as Site[];
const deployedSites = deployedSitesList as Site[];
const reports = reportsById as Record<string, SiteReport>;
const demandIndex = demandByCity as Record<string, Demand[]>;
const incidentsIndex = incidentsBySite as Record<string, Incident[]>;
const sensorIndex = sensorReadingsBySite as Record<string, SensorReading>;
const sectionIndex = sectionReadingsBySite as Record<string, SectionReading[]>;

/** When unset or any value other than `"false"`, bundled mocks are used (good default until API routes land). */
export function shouldUseApiMocks(): boolean {
	return process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
}

/** Node `fetch` in RSC has no document base URL — relative `/api/...` throws ERR_INVALID_URL. */
function resolveFetchUrl(path: string): string {
	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path;
	}
	if (typeof window !== "undefined") {
		return path;
	}
	const explicit =
		process.env.NEXT_INTERNAL_API_URL?.replace(/\/$/, "") ||
		process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
	if (explicit) {
		return `${explicit}${path.startsWith("/") ? path : `/${path}`}`;
	}
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}${path.startsWith("/") ? path : `/${path}`}`;
	}
	const port = process.env.PORT || "3000";
	return `http://127.0.0.1:${port}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
	const res = await fetch(resolveFetchUrl(input), {
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

export async function getDeployedSites(): Promise<Site[]> {
	if (shouldUseApiMocks()) {
		return deployedSites;
	}
	return fetchJson<Site[]>("/api/sites/deployed");
}

export async function getSensorReading(siteId: string): Promise<SensorReading | null> {
	if (shouldUseApiMocks()) {
		return sensorIndex[siteId] ?? null;
	}
	return fetchJson<SensorReading>(`/api/sites/${encodeURIComponent(siteId)}/sensors`);
}

export async function getSectionReadings(siteId: string): Promise<SectionReading[]> {
	if (shouldUseApiMocks()) {
		return sectionIndex[siteId] ?? [];
	}
	return fetchJson<SectionReading[]>(`/api/sites/${encodeURIComponent(siteId)}/sections`);
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
