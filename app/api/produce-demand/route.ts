/**
 * GET /api/produce-demand?city={city}
 *
 * Returns Demand[] for the requested city via Member 1's cache-aware pipeline:
 *   disk cache → live Claude research → static per-capita fallback.
 *
 * Set ANTHROPIC_API_KEY in .env.local to enable live research.
 * Run `npx tsx services/seed-cache.ts` to pre-seed a demo cache.
 */

import { NextResponse } from "next/server";
import { getProduceDemand } from "@/services";

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const city = searchParams.get("city")?.trim();

	if (!city) {
		return NextResponse.json({ error: "city param required" }, { status: 400 });
	}

	const demand = await getProduceDemand(city);
	return NextResponse.json(demand);
}
