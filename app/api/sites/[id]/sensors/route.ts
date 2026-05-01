/**
 * GET /api/sites/[id]/sensors
 *
 * Returns the latest SensorReading for a deployed site.
 *
 * Resolution order:
 *   1. Most recent incident's sensorSnapshot from incidentStore (reflects last
 *      agent-observed reading, updated every 30 s by the Orchestrator loop).
 *   2. Fresh reading from SensorSimulator (safe fallback for sites with no
 *      incident history yet, or after a cold start).
 */

import { NextResponse } from "next/server";

import { listIncidentsBySite } from "@/agents/incidentStore";
import { SensorSimulator } from "@/agents/simulator";

/** Module-level simulator — persists across hot-reloads in dev. */
const simulator = new SensorSimulator();

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
	const { id } = await params;

	// 1. Latest incident's sensor snapshot (most recently observed live reading).
	const incidents = await listIncidentsBySite(id);
	if (incidents.length > 0) {
		const snapshot = incidents[0]!.sensorSnapshot;
		return NextResponse.json(snapshot);
	}

	// 2. Fresh simulated nominal reading (fallback).
	const { reading } = simulator.next(id);
	return NextResponse.json(reading);
}
