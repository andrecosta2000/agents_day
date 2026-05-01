/**
 * POST /api/incidents/[id]/resolve
 *
 * Marks an incident as resolved and sends a PagerDuty resolve event
 * (no-op in mock mode, safe to call if no PagerDuty alert was sent).
 */

import { NextResponse } from "next/server";
import { resolveIncident, getIncident } from "@/agents/incidentStore";
import { resolveAlert } from "@/agents/pagerduty";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
	const { id } = await params;

	const updated = await resolveIncident(id);
	if (!updated) {
		return NextResponse.json({ error: "Incident not found" }, { status: 404 });
	}

	// If a PagerDuty alert was sent, resolve it too.
	if (updated.pagerdutyIncidentId) {
		void resolveAlert(id).catch((err: Error) =>
			console.warn(`[incidents/${id}/resolve] PagerDuty resolve failed: ${err.message}`),
		);
	}

	return NextResponse.json({ status: "resolved" });
}
