/**
 * GET /api/sites/[id]/sensors
 *
 * Returns the latest SensorReading for a deployed site.
 *
 * TODO (Member 2): Wire to agents/simulator.ts or agents/incidentStore.ts
 * once the SiteAgent loop is running. The agent reads from the simulator
 * every 30 s and should persist the latest reading for this endpoint.
 *
 * Stub returns a deterministic mock reading so the frontend renders correctly.
 */

import { NextResponse } from "next/server";
import type { SensorReading } from "@/types/interfaces";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
	const { id } = await params;

	// TODO (Member 2): replace with incidentStore.getLatestReading(id) or similar
	const reading: SensorReading = {
		siteId: id,
		timestamp: new Date().toISOString(),
		tempC: 22,
		humidityPct: 70,
		ph: 6.0,
		waterFlowLPerMin: 5.5,
		lightLux: 12000,
	};

	return NextResponse.json(reading);
}
