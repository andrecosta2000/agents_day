/**
 * GET /api/incidents?siteId={siteId}
 *
 * Returns all incidents for a site ordered by most recent.
 *
 * TODO (Member 2): Wire to your incidentStore once agents/incidentStore.ts
 * is implemented. The stub below returns an empty array so the frontend
 * renders gracefully and the IncidentFeed shows "No incidents" state.
 */

import { NextResponse } from "next/server";
import type { Incident } from "@/types/interfaces";

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const siteId = searchParams.get("siteId")?.trim();

	if (!siteId) {
		return NextResponse.json({ error: "siteId param required" }, { status: 400 });
	}

	// TODO (Member 2): replace with incidentStore.getForSite(siteId)
	const incidents: Incident[] = [];
	return NextResponse.json(incidents);
}
