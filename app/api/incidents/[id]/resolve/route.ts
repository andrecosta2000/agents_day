import { NextResponse } from "next/server";

import { enqueueEvent, flushQueueSoon, probeConnectivity } from "@/agents/eventQueue";
import { getIncidentById, resolveIncidentById } from "@/agents/incidentStore";
import { sendResolve } from "@/agents/pagerduty";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteParams): Promise<NextResponse> {
	const { id } = await ctx.params;
	const decoded = decodeURIComponent(id);
	const existing = await getIncidentById(decoded);
	if (!existing) {
		return NextResponse.json({ error: "Incident not found" }, { status: 404 });
	}

	const updated = await resolveIncidentById(decoded);
	if (!updated) {
		return NextResponse.json({ error: "Incident not found" }, { status: 404 });
	}

	const dedupKey = updated.pagerdutyIncidentId ?? updated.id;
	const online = await probeConnectivity();
	if (!online) {
		enqueueEvent({ kind: "resolve", dedupKey });
	} else {
		await sendResolve(dedupKey);
	}
	flushQueueSoon();

	return NextResponse.json({ status: "resolved" as const });
}
