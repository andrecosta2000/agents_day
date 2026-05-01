# Services — Member 1

**Branch:** `feat/data`
**Owner:** Member 1
**Status:** ✅ All modules implemented and verified.

All external data integrations and the intelligence layer (optimizer, energy modeling, ROI).

## Modules

| File | Status | Description |
|------|--------|-------------|
| `crops.ts` | ✅ | Static crop DB (10 crops: greens, herbs, fruits) — used as fallback |
| `research.ts` | ✅ | **Demand Research Agent** — Claude API + web search → trending crops |
| `demand.ts` | ✅ | Cache-aware demand fetcher (cache → live research → static fallback) |
| `seed-cache.ts` | ✅ | Hand-curated cache seed for demo cities (no API needed) |
| `suitability.ts` | ✅ | Climate-fit filter (rejects crops where HVAC eats the margin) |
| `climate.ts` | ✅ | Monthly climate via OpenMeteo (with mock fallback) |
| `zoning.ts` | ✅ | Deterministic mock zoning + height + price |
| `hvac.ts` | ✅ | HVAC kWh/cost per crop given climate |
| `solar.ts` | ✅ | Solar generation, install cost, ROI vs grid |
| `water.ts` | ✅ | Nearby rivers/canals/reservoirs via Overpass (with mock fallback) |
| `optimizer.ts` | ✅ | LP crop-mix optimizer (max profit, with diversification cap) |
| `roi.ts` | ✅ | Final ROI aggregator (revenue − HVAC − energy − water) |
| `index.ts` | ✅ | Barrel export |

## Importing

```typescript
import {
  getZoning,
  getClimate,
  getAllCrops,
  getCropById,
  getHvacCost,
  getSolarAssessment,
  getWaterSources,
  getProduceDemand,
  getSupportedCities,
  optimizeCropMix,
  calculateRoi,
} from "@/services";
```

## Function Signatures

```typescript
getZoning(lat: number, lng: number): Promise<ZoningInfo>

getClimate(lat: number, lng: number): Promise<ClimateData>

getAllCrops(): Crop[]
getCropById(id: string): Crop | undefined
getCropByName(name: string): Crop | undefined

getHvacCost(crop: Crop, climate: ClimateData, areaM2: number): HvacCost
getHvacCostsForCrops(crops: Crop[], climate: ClimateData, areaM2: number): HvacCost[]

getSolarAssessment(lat: number, lng: number, roofAreaM2: number): Promise<SolarAssessment>

getWaterSources(lat: number, lng: number, radiusM: number): Promise<WaterSource[]>

getProduceDemand(city: string): Promise<Demand[]>
getDemandResearch(city: string, opts?: { forceRefresh?: boolean })
  : Promise<DemandResearchResult>   // demands + agronomic profiles + source label
getSupportedCities(): string[]

researchDemand(city: string): Promise<DemandResearchResult>   // direct (skip cache)

scoreSuitability(crop: Crop, climate: ClimateData): SuitabilityScore
filterSuitableCrops(crops: Crop[], climate: ClimateData, threshold?: number)
  : { suitable: Crop[]; scores: SuitabilityScore[] }
resolveCrop(name: string, pricePerKg: number, profiles: CropProfile[]): Crop

optimizeCropMix({
  footprintAreaM2: number,
  floors: number,
  demand: Demand[],
  climate: ClimateData,
  crops?: Crop[],   // defaults to all crops
}): CropPlan

calculateRoi({
  site: Site,
  cropPlan: CropPlan,
  solar: SolarAssessment,
  waterSources: WaterSource[],
  pricePerM2Eur: number,    // from zoning.estimatedPricePerM2
}): Roi
```

All types from `@/types/interfaces.ts`.

## How a Site Report Comes Together

The intended call order for a full feasibility report:

```typescript
import {
  getZoning, getClimate, getSolarAssessment, getWaterSources,
  getDemandResearch, filterSuitableCrops, resolveCrop,
  optimizeCropMix, calculateRoi,
} from "@/services";

// 1. Local context
const zoning   = await getZoning(lat, lng);
const climate  = await getClimate(lat, lng);
const solar    = await getSolarAssessment(lat, lng, site.areaM2);
const water    = await getWaterSources(lat, lng, 2000);

// 2. Researched demand (cache-first)
const research = await getDemandResearch(site.city);

// 3. Filter crops by climate suitability
const candidates = research.demands.map((d) =>
  resolveCrop(d.crop, d.pricePerKg, research.profiles),
);
const { suitable } = filterSuitableCrops(candidates, climate);

// 4. Optimize and roll up to ROI
const cropPlan = optimizeCropMix({
  footprintAreaM2: site.areaM2,
  floors: Math.max(1, Math.floor(zoning.maxHeightM / 4)),
  demand: research.demands.filter((d) => suitable.find((c) => c.name === d.crop)),
  climate,
  crops: suitable,
});
const roi = calculateRoi({
  site, cropPlan, solar, waterSources: water,
  pricePerM2Eur: zoning.estimatedPricePerM2,
});
```

## Demand Pipeline (cache → research → fallback)

`getDemandResearch(city)` resolves in this order:

1. **Disk cache** at `.cache/demand-<city>.json` (24h TTL by default).
2. **Live research** via the Claude API (`research.ts`) when `ANTHROPIC_API_KEY` is set. The agent uses web search to surface 6–12 currently-trending crops with demand estimates, prices, agronomic profiles, and source citations.
3. **Static fallback** — per-capita × population. Used when both cache and live research are unavailable.

The result includes `source: "live" | "cache" | "fallback"` so the UI can show provenance.

### Working without an API key (demo mode)

```bash
npx tsx services/seed-cache.ts          # seeds Lisbon, NYC, Berlin
npx tsx services/seed-cache.ts Berlin   # one city
```

This writes hand-curated cache files matching the live-research schema. The pipeline behaves identically — once you set `ANTHROPIC_API_KEY` in `.env.local`, expired cache entries refresh from real research.

## External APIs

| API | Used By | Key Required | Fallback |
|-----|---------|--------------|----------|
| OpenMeteo Archive | `climate.ts` | No | Latitude-based mock |
| OpenStreetMap Overpass | `water.ts` | No | Deterministic mock with river/canal/municipal |

Both have a 10–15 second timeout and fall back to mocks on failure or timeout. Demo never breaks.

## Constants Worth Knowing

- HVAC: heating 8 W/m²/°C, cooling 12 W/m²/°C (envelope coefficients)
- Optimizer: 70% usable floor area, max 35% allocation per crop (diversification)
- Fit-out capex: €2,500/m² of footprint per floor
- Water: nearby river/canal cuts cost to 40% of municipal
- Solar: 200 Wp/m² panels, 85% system efficiency, €1,200/kWp install

## Supported Cities

`getSupportedCities()` returns: New York, Chicago, Los Angeles, San Francisco, Boston, Seattle, Lisbon, Porto, Madrid, Barcelona, Berlin, Amsterdam, Paris, London, Dubai.

## Notes for Member 2

- All async functions handle their own errors and never throw — they return mock data on failure.
- Optimizer is synchronous (no I/O).
- The `floors` value should be derived from zoning's `maxHeightM` (4m per floor is a reasonable assumption).
- Demand is per-month. All revenue/cost figures are EUR.

## Notes

_Use this section to communicate changes to teammates._
