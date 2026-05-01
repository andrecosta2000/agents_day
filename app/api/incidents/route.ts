/**
 * GET /api/incidents?siteId={siteId}
 *
 * Returns all incidents for a site ordered by most recent.
 * Backed by agents/incidentStore.ts (in-memory + persisted to disk).
 */

import { NextResponse } from "next/server";
import { getIncidentsForSite } from "@/agents/incidentStore";

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const siteId = searchParams.get("siteId")?.trim();

	if (!siteId) {
		return NextResponse.json({ error: "siteId param required" }, { status: 400 });
	}

	const incidents = await getIncidentsForSite(siteId);
	return NextResponse.json(incidents);
}
