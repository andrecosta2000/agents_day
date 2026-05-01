import { NextResponse } from "next/server";

import { listIncidentsBySite } from "@/agents/incidentStore";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<NextResponse> {
	const { searchParams } = new URL(req.url);
	const siteId = searchParams.get("siteId")?.trim();
	if (!siteId) {
		return NextResponse.json({ error: "Missing siteId query parameter" }, { status: 400 });
	}
	const incidents = await listIncidentsBySite(siteId);
	return NextResponse.json(incidents);
}
