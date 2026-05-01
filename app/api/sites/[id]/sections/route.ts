/**
 * GET /api/sites/[id]/sections
 *
 * Returns SectionReading[] for a deployed site — one entry per crop section
 * (floor), grouped by cropId, ordered by sectionIndex.
 *
 * Each section has its own sensor snapshot: temperature, humidity, pH,
 * water flow, and light. Different crops occupy different floors and may
 * have different environmental targets.
 *
 * TODO (Member 2): Wire to agents/simulator.ts or agents/incidentStore.ts.
 * The SiteAgent reads from the simulator every 30 s per section and should
 * persist the latest reading for each (siteId, cropId, sectionIndex) tuple.
 *
 * Stub returns all-OK readings so the frontend renders correctly.
 */

import { NextResponse } from "next/server";
import type { SectionReading } from "@/lib/section-types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
	const { id } = await params;
	const now = new Date().toISOString();

	// TODO (Member 2): replace with incidentStore.getSectionReadings(id)
	const stub: SectionReading[] = [
		{ siteId: id, cropId: "crop-lettuce", cropName: "Butterhead Lettuce", sectionIndex: 1, allocatedM2: 300, timestamp: now, tempC: 22, humidityPct: 72, ph: 6.0, waterFlowLPerMin: 5.5, lightLux: 12000 },
		{ siteId: id, cropId: "crop-lettuce", cropName: "Butterhead Lettuce", sectionIndex: 2, allocatedM2: 300, timestamp: now, tempC: 22, humidityPct: 72, ph: 6.0, waterFlowLPerMin: 5.5, lightLux: 12000 },
	];

	return NextResponse.json(stub);
}
