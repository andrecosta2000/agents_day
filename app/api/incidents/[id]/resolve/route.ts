/**
 * POST /api/incidents/[id]/resolve
 *
 * Marks an incident as resolved.
 *
 * TODO (Member 2): Wire to your incidentStore once agents/incidentStore.ts
 * is implemented. The stub below returns { status: "resolved" } immediately
 * so the IncidentFeed "Mark resolved" button works end-to-end in demo mode.
 */

import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
	const { id } = await params;

	// TODO (Member 2): replace with incidentStore.resolve(id)
	console.log(`[incidents/${id}/resolve] stub — mark resolved`);
	return NextResponse.json({ status: "resolved" });
}
