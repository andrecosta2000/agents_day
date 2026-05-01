/**
 * Suitability filter — given a list of crops surfaced by the demand research
 * agent, score each one against the local climate to decide whether it can
 * be grown profitably. Filters out crops where HVAC eats the margin.
 */

import type {
  ClimateData,
  Crop,
  CropProfile,
  SuitabilityScore,
} from "@/types/interfaces";
import { getCropByName } from "./crops";
import { getHvacCost } from "./hvac";

const SUITABILITY_THRESHOLD = 0.3; // anything below this is filtered out

// Reasonable defaults for crops with no agronomic profile in either DB or research.
const DEFAULT_PROFILE = {
  idealTempMinC: 18,
  idealTempMaxC: 24,
  idealHumidityMinPct: 60,
  idealHumidityMaxPct: 75,
  yieldKgPerM2PerMonth: 3.0,
  growthCycleDays: 45,
  lightHoursRequired: 14,
  avgMarketPricePerKg: 5,
};

/**
 * Resolve a Crop record for a name from any of: the static DB, a research
 * profile, or fallback defaults. Always returns something usable.
 */
export function resolveCrop(
  name: string,
  pricePerKg: number,
  profiles: CropProfile[],
): Crop {
  const fromDb = getCropByName(name);
  if (fromDb) return { ...fromDb, avgMarketPricePerKg: pricePerKg };

  const fromResearch = profiles.find(
    (p) => p.name.toLowerCase() === name.toLowerCase(),
  );
  if (fromResearch) {
    return {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      name,
      idealTempMinC: fromResearch.idealTempMinC,
      idealTempMaxC: fromResearch.idealTempMaxC,
      idealHumidityMinPct: fromResearch.idealHumidityMinPct,
      idealHumidityMaxPct: fromResearch.idealHumidityMaxPct,
      yieldKgPerM2PerMonth: fromResearch.yieldKgPerM2PerMonth,
      avgMarketPricePerKg: pricePerKg,
      growthCycleDays: DEFAULT_PROFILE.growthCycleDays,
      lightHoursRequired: DEFAULT_PROFILE.lightHoursRequired,
    };
  }

  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    name,
    ...DEFAULT_PROFILE,
    avgMarketPricePerKg: pricePerKg,
  };
}

/**
 * Score one crop's suitability for a location (0..1).
 *  score = max(0, (revenue - hvacCost) / revenue)
 */
export function scoreSuitability(
  crop: Crop,
  climate: ClimateData,
): SuitabilityScore {
  const hvac = getHvacCost(crop, climate, 1); // per m²
  const revenuePerM2 = crop.yieldKgPerM2PerMonth * crop.avgMarketPricePerKg;

  if (revenuePerM2 <= 0) {
    return {
      cropName: crop.name,
      score: 0,
      monthlyHvacCostPerM2Eur: hvac.monthlyCostEur,
      monthlyRevenuePerM2Eur: revenuePerM2,
      reason: "uneconomic",
    };
  }

  const margin = revenuePerM2 - hvac.monthlyCostEur;
  const score = Math.max(0, Math.min(1, margin / revenuePerM2));
  return {
    cropName: crop.name,
    score: Number(score.toFixed(3)),
    monthlyHvacCostPerM2Eur: Number(hvac.monthlyCostEur.toFixed(2)),
    monthlyRevenuePerM2Eur: Number(revenuePerM2.toFixed(2)),
    reason: score < SUITABILITY_THRESHOLD ? "uneconomic" : "ok",
  };
}

/**
 * Filter a list of crops to those suitable for the local climate.
 * Returns both the filtered crops and the per-crop scores for transparency.
 */
export function filterSuitableCrops(
  crops: Crop[],
  climate: ClimateData,
  threshold = SUITABILITY_THRESHOLD,
): { suitable: Crop[]; scores: SuitabilityScore[] } {
  const scores = crops.map((c) => scoreSuitability(c, climate));
  const suitable = crops.filter((_, i) => scores[i].score >= threshold);
  return { suitable, scores };
}

export const SUITABILITY_CONSTANTS = { SUITABILITY_THRESHOLD };
