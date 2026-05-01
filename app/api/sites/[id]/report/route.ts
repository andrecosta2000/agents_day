/**
 * GET /api/sites/[id]/report
 *
 * Runs Member 1's full feasibility pipeline for a site and returns a SiteReport.
 *
 * Pipeline (from services/README.md):
 *   1. getZoning + getClimate + getSolarAssessment + getWaterSources
 *   2. getDemandResearch (cache → live research → fallback)
 *   3. filterSuitableCrops — removes crops where HVAC eats the margin
 *   4. optimizeCropMix — LP crop allocation
 *   5. calculateRoi — final ROI roll-up
 *
 * TODO (Member 2): Replace siteById() lookup with your own site store /
 * database once site discovery (GET /api/sites) is backed by real data.
 */

import { NextResponse } from "next/server";
import type { Site, SiteReport } from "@/types/interfaces";
import {
	getZoning,
	getClimate,
	getSolarAssessment,
	getWaterSources,
	getDemandResearch,
	filterSuitableCrops,
	resolveCrop,
	optimizeCropMix,
	getHvacCostsForCrops,
	calculateRoi,
} from "@/services";

// ---------------------------------------------------------------------------
// Minimal site registry — keep in sync with GET /api/sites until Member 2
// wires a shared store.
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

function siteById(id: string): Site | undefined {
	return SITE_REGISTRY.find((s) => s.id === id);
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
	const { id } = await params;
	const site = siteById(id);

	if (!site) {
		return NextResponse.json({ error: "Site not found" }, { status: 404 });
	}

	try {
		// 1. Local context — run in parallel where possible
		const [zoning, climate, solar, waterSources] = await Promise.all([
			getZoning(site.lat, site.lng),
			getClimate(site.lat, site.lng),
			getSolarAssessment(site.lat, site.lng, site.areaM2),
			getWaterSources(site.lat, site.lng, 2000),
		]);

		// 2. Researched demand (cache-first, live Claude research, then static fallback)
		const research = await getDemandResearch(site.city);

		// 3. Resolve crops and filter by climate suitability
		const candidates = research.demands.map((d) =>
			resolveCrop(d.crop, d.pricePerKg, research.profiles),
		);
		const { suitable } = filterSuitableCrops(candidates, climate);

		// 4. Optimize crop mix
		const floors = Math.max(1, Math.floor(zoning.maxHeightM / 4));
		const suitableNames = new Set(suitable.map((c) => c.name));
		const cropPlan = optimizeCropMix({
			footprintAreaM2: site.areaM2,
			floors,
			demand: research.demands.filter((d) => suitableNames.has(d.crop)),
			climate,
			crops: suitable,
		});

		// 5. HVAC costs summary for the panel
		const hvacCosts = getHvacCostsForCrops(suitable, climate, site.areaM2);

		// 6. ROI roll-up
		const roi = calculateRoi({
			site,
			cropPlan,
			solar,
			waterSources,
			pricePerM2Eur: zoning.estimatedPricePerM2,
		});

		const report: SiteReport = {
			site,
			zoning,
			climate,
			hvacCosts,
			solar,
			waterSources,
			cropPlan,
			roi,
		};

		return NextResponse.json(report);
	} catch (err) {
		console.error(`[/api/sites/${id}/report]`, err);
		return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
	}
}
