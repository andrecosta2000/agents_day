/**
 * GET /api/sites?city={city}
 *
 * Returns candidate vertical farming sites for the requested city.
 *
 * TODO (Member 2): Replace SITE_REGISTRY with a real GIS / database lookup.
 * Member 1 provides zoning, climate, solar, water, and the optimizer — but
 * site *discovery* (finding candidate lat/lng locations in a city) is the
 * one piece that lives here. A simple approach:
 *   - Query OSM Overpass for industrial/warehouse buildings in the city bbox.
 *   - Score each with a composite heuristic (area, zone, proximity to water).
 *   - Cache results per city with a TTL.
 *
 * Until that is implemented, this route serves the SITE_REGISTRY below so
 * the frontend works end-to-end with NEXT_PUBLIC_USE_MOCKS=false.
 */

import { NextResponse } from "next/server";
import type { Site } from "@/types/interfaces";

// ---------------------------------------------------------------------------
// Hardcoded site registry — Member 2: replace with real discovery logic
// ---------------------------------------------------------------------------
const SITE_REGISTRY: Site[] = [
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

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const city = searchParams.get("city")?.trim();

	if (!city) {
		return NextResponse.json({ error: "city param required" }, { status: 400 });
	}

	const lower = city.toLowerCase();
	const results = SITE_REGISTRY.filter((s) => s.city.toLowerCase() === lower);
	return NextResponse.json(results);
}
