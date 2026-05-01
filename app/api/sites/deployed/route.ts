/**
 * GET /api/sites/deployed
 *
 * Returns the list of operational (deployed) vertical farming sites.
 *
 * TODO (Member 2): Replace DEPLOYED_SITES with a real store/database query.
 * Deployed sites are a distinct lifecycle state from candidate sites returned
 * by GET /api/sites — they have active SiteAgents and sensor streams.
 */

import { NextResponse } from "next/server";
import type { Site } from "@/types/interfaces";

const DEPLOYED_SITES: Site[] = [
	{
		id: "site-lx-01",
		name: "Alcântara Vertical Hub",
		lat: 38.705,
		lng: -9.178,
		zone: "industrial",
		maxHeightM: 45,
		areaM2: 3200,
		score: 87,
		city: "Lisbon",
	},
	{
		id: "site-lx-02",
		name: "Marvila Warehouse District",
		lat: 38.728,
		lng: -9.112,
		zone: "mixed",
		maxHeightM: 36,
		areaM2: 2800,
		score: 79,
		city: "Lisbon",
	},
	{
		id: "site-pt-01",
		name: "Matosinhos Coastal Facility",
		lat: 41.182,
		lng: -8.69,
		zone: "industrial",
		maxHeightM: 40,
		areaM2: 4100,
		score: 82,
		city: "Porto",
	},
];

export async function GET() {
	return NextResponse.json(DEPLOYED_SITES);
}
