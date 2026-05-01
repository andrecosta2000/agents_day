/**
 * GET /api/sites/[id]/sensors
 *
 * Returns the latest SensorReading for a deployed site.
 *
 * Resolution order:
 *   1. Orchestrator's in-memory last reading (live, updated every 30 s by SiteAgent)
 *   2. Most recent incident's sensor snapshot from incidentStore
 *   3. Fresh reading from the simulator (fallback — generates a normal reading)
 *
 * The Orchestrator is started lazily on first request if it hasn't been
 * initialised yet (e.g. after a dev-server hot-reload).
 */

import { NextResponse } from "next/server";
import type { SensorReading } from "@/types/interfaces";
import { getOrchestrator } from "@/agents/Orchestrator";
import { getLatestReading } from "@/agents/incidentStore";
import { generateReading } from "@/agents/simulator";

// Deployed site registry — keep in sync with /api/sites/deployed until
// Member 2 wires a shared store.
const DEPLOYED_SITES = [
	{ id: "site-lx-01", name: "Alcântara Vertical Hub",    lat: 38.705, lng: -9.178, zone: "industrial" as const, maxHeightM: 45, areaM2: 3200, score: 87, city: "Lisbon" },
	{ id: "site-lx-02", name: "Marvila Warehouse District", lat: 38.728, lng: -9.112, zone: "mixed" as const,       maxHeightM: 36, areaM2: 2800, score: 79, city: "Lisbon" },
	{ id: "site-pt-01", name: "Matosinhos Coastal Facility",lat: 41.182, lng: -8.690, zone: "industrial" as const, maxHeightM: 40, areaM2: 4100, score: 82, city: "Porto"  },
];

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
	const { id } = await params;

	// Ensure the Orchestrator is watching this site.
	const orchestrator = getOrchestrator();
	if (!orchestrator.monitoredSites().includes(id)) {
		const site = DEPLOYED_SITES.find((s) => s.id === id);
		if (site) orchestrator.addSite(site);
	}

	// 1. Live reading from the agent loop.
	const live = orchestrator.getLatestReading(id);
	if (live) return NextResponse.json(live);

	// 2. Last incident snapshot.
	const fromStore = await getLatestReading(id);
	if (fromStore) return NextResponse.json(fromStore);

	// 3. Freshly generated normal reading (safe fallback).
	const fallback: SensorReading = generateReading(id);
	return NextResponse.json(fallback);
}
