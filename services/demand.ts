/**
 * Produce demand for a city.
 *
 * Resolution order:
 *   1. Disk cache (.cache/demand-<city>.json), respecting TTL
 *   2. Live research via Claude API + web search (research.ts)
 *   3. Static fallback (per-capita × population) — used when no API key
 *      is configured or live research throws.
 *
 * The cached file holds a DemandResearchResult — both demands and the
 * agronomic profiles for any non-database crops surfaced by research.
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { Demand, DemandResearchResult, CropProfile } from "@/types/interfaces";
import { getAllCrops } from "./crops";
import { researchDemand } from "./research";

const CACHE_DIR = process.env.DEMAND_CACHE_DIR ?? ".cache";
const TTL_HOURS = Number(process.env.DEMAND_CACHE_TTL_HOURS ?? "24");

// Static fallback data — used only when both cache and live research fail.
const PER_CAPITA_KG_PER_MONTH: Record<string, number> = {
  Lettuce: 0.55,
  Basil: 0.05,
  Kale: 0.20,
  Spinach: 0.35,
  Strawberry: 0.40,
  "Cherry Tomato": 0.65,
  Arugula: 0.10,
  "Microgreens (mixed)": 0.04,
  "Bell Pepper": 0.45,
  Chives: 0.03,
};

const CITY_POPULATIONS: Record<string, number> = {
  "New York": 8500000,
  "Chicago": 2700000,
  "Los Angeles": 4000000,
  "San Francisco": 875000,
  "Boston": 690000,
  "Seattle": 750000,
  "Lisbon": 545000,
  "Porto": 235000,
  "Madrid": 3300000,
  "Barcelona": 1640000,
  "Berlin": 3700000,
  "Amsterdam": 920000,
  "Paris": 2160000,
  "London": 9000000,
  "Dubai": 3600000,
};

const CITY_PRICE_MULTIPLIER: Record<string, number> = {
  "New York": 1.35, "Chicago": 1.10, "Los Angeles": 1.30, "San Francisco": 1.45,
  "Boston": 1.25, "Seattle": 1.20, "Lisbon": 0.85, "Porto": 0.80,
  "Madrid": 0.95, "Barcelona": 1.00, "Berlin": 1.05, "Amsterdam": 1.15,
  "Paris": 1.30, "London": 1.40, "Dubai": 1.50,
};

const DEFAULT_POPULATION = 1_000_000;
const DEFAULT_PRICE_MULTIPLIER = 1.0;

function cachePath(city: string): string {
  const safe = city.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return path.resolve(process.cwd(), CACHE_DIR, `demand-${safe}.json`);
}

async function readCache(city: string): Promise<DemandResearchResult | null> {
  try {
    const raw = await fs.readFile(cachePath(city), "utf8");
    const parsed = JSON.parse(raw) as DemandResearchResult & { _cachedAt?: string };
    if (parsed._cachedAt) {
      const ageMs = Date.now() - new Date(parsed._cachedAt).getTime();
      if (ageMs > TTL_HOURS * 3600 * 1000) return null;
    }
    return { ...parsed, source: "cache" };
  } catch {
    return null;
  }
}

async function writeCache(city: string, result: DemandResearchResult): Promise<void> {
  const file = cachePath(city);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const payload = { ...result, _cachedAt: new Date().toISOString() };
  await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf8");
}

function buildFallback(city: string): DemandResearchResult {
  const population = CITY_POPULATIONS[city] ?? DEFAULT_POPULATION;
  const priceMult = CITY_PRICE_MULTIPLIER[city] ?? DEFAULT_PRICE_MULTIPLIER;
  const demands: Demand[] = getAllCrops().map((crop) => {
    const perCapita = PER_CAPITA_KG_PER_MONTH[crop.name] ?? 0.10;
    return {
      crop: crop.name,
      demandKgPerMonth: Math.round(perCapita * population),
      pricePerKg: Number((crop.avgMarketPricePerKg * priceMult).toFixed(2)),
      trend: "stable" as const,
      confidence: 0.4,
      rationale: "Static estimate: per-capita consumption × city population.",
      sources: [],
    };
  });
  // Profiles mirror the crop database for fallback mode.
  const profiles: CropProfile[] = getAllCrops().map((c) => ({
    name: c.name,
    idealTempMinC: c.idealTempMinC,
    idealTempMaxC: c.idealTempMaxC,
    idealHumidityMinPct: c.idealHumidityMinPct,
    idealHumidityMaxPct: c.idealHumidityMaxPct,
    yieldKgPerM2PerMonth: c.yieldKgPerM2PerMonth,
  }));
  return {
    city,
    asOf: new Date().toISOString().slice(0, 10),
    source: "fallback",
    demands,
    profiles,
  };
}

/**
 * Get the structured research result for a city — demands + agronomic profiles.
 * Use this when you need the full picture (e.g. for the optimizer).
 */
export async function getDemandResearch(
  city: string,
  opts: { forceRefresh?: boolean } = {},
): Promise<DemandResearchResult> {
  if (!opts.forceRefresh) {
    const cached = await readCache(city);
    if (cached) return cached;
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const live = await researchDemand(city);
      await writeCache(city, live);
      return live;
    } catch (err) {
      console.warn(
        `[demand] live research failed for ${city}, using fallback: ${(err as Error).message}`,
      );
    }
  }

  return buildFallback(city);
}

/**
 * Backwards-compatible: just the Demand[] array.
 */
export async function getProduceDemand(city: string): Promise<Demand[]> {
  const result = await getDemandResearch(city);
  return result.demands;
}

export function getSupportedCities(): string[] {
  return Object.keys(CITY_POPULATIONS);
}
