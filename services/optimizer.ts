import solver from "javascript-lp-solver";
import type {
  ClimateData,
  Crop,
  CropAllocation,
  CropPlan,
  Demand,
} from "@/types/interfaces";
import { getAllCrops } from "./crops";
import { getHvacCost } from "./hvac";

/**
 * Linear program:
 *   maximize  Σ (price_i * yield_i - hvacCost_i_per_m2) * x_i
 *   subject to
 *     Σ x_i <= totalGrowingAreaM2          (total floor space)
 *     yield_i * x_i <= demand_i             (don't grow more than the city consumes)
 *     x_i >= 0
 *
 * Where x_i is m² of growing area allocated to crop i (across all floors).
 * totalGrowingAreaM2 = footprintAreaM2 * floors * USABLE_FLOOR_RATIO.
 */

const USABLE_FLOOR_RATIO = 0.7; // remainder is corridors, equipment, processing
const ESTIMATED_INVESTMENT_PER_M2_EUR = 2500; // capex for vertical farm fit-out
const MAX_SHARE_PER_CROP = 0.35; // diversification: no single crop > 35% of total area

interface OptimizerInputs {
  footprintAreaM2: number;
  floors: number;
  demand: Demand[];
  climate: ClimateData;
  crops?: Crop[];
}

export function optimizeCropMix(inputs: OptimizerInputs): CropPlan {
  const crops = inputs.crops ?? getAllCrops();
  const totalGrowingArea =
    inputs.footprintAreaM2 * Math.max(1, inputs.floors) * USABLE_FLOOR_RATIO;

  // Map crop name → demand for quick lookup.
  const demandByName: Record<string, Demand> = {};
  for (const d of inputs.demand) demandByName[d.crop] = d;

  // Build LP model in JSON form.
  const variables: Record<string, Record<string, number>> = {};
  const constraints: Record<string, { max?: number; min?: number }> = {
    totalArea: { max: totalGrowingArea },
  };

  // Per-crop unit profit and demand cap.
  const cropMeta: Record<string, {
    crop: Crop;
    profitPerM2: number;
    yieldPerM2: number;
    pricePerKg: number;
    hvacPerM2: number;
  }> = {};

  for (const crop of crops) {
    // HVAC cost is climate-dependent and per-m². Compute on a 1m² basis then scale.
    const unitHvac = getHvacCost(crop, inputs.climate, 1);
    const monthlyHvacPerM2 = unitHvac.monthlyCostEur;

    const demandRecord = demandByName[crop.name];
    if (!demandRecord) continue;

    const pricePerKg = demandRecord.pricePerKg;
    const monthlyRevenuePerM2 = crop.yieldKgPerM2PerMonth * pricePerKg;
    const profitPerM2 = monthlyRevenuePerM2 - monthlyHvacPerM2;

    cropMeta[crop.id] = {
      crop,
      profitPerM2,
      yieldPerM2: crop.yieldKgPerM2PerMonth,
      pricePerKg,
      hvacPerM2: monthlyHvacPerM2,
    };

    // Demand constraint: yieldPerM2 * area <= demandKgPerMonth
    const maxAreaByDemand = demandRecord.demandKgPerMonth / crop.yieldKgPerM2PerMonth;
    // Diversification constraint: area_i <= MAX_SHARE_PER_CROP * totalGrowingArea
    const maxAreaByShare = MAX_SHARE_PER_CROP * totalGrowingArea;

    variables[crop.id] = {
      profit: profitPerM2,
      totalArea: 1,
      [`demand_${crop.id}`]: 1,
      [`share_${crop.id}`]: 1,
    };
    constraints[`demand_${crop.id}`] = { max: maxAreaByDemand };
    constraints[`share_${crop.id}`] = { max: maxAreaByShare };
  }

  // Filter out crops with negative profit per m² — never grow at a loss.
  for (const [id, meta] of Object.entries(cropMeta)) {
    if (meta.profitPerM2 <= 0) {
      delete variables[id];
      delete constraints[`demand_${id}`];
      delete constraints[`share_${id}`];
    }
  }

  const model = {
    optimize: "profit",
    opType: "max" as const,
    constraints,
    variables,
  };

  const result = solver.Solve(model) as Record<string, number> & {
    feasible: boolean;
    result: number;
  };

  // Build allocations.
  const allocations: CropAllocation[] = [];
  let totalRevenue = 0;
  let totalCost = 0;

  for (const [id, meta] of Object.entries(cropMeta)) {
    const allocatedM2 = Number(result[id] ?? 0);
    if (allocatedM2 <= 0.01) continue;

    const monthlyYieldKg = allocatedM2 * meta.yieldPerM2;
    const monthlyRevenueEur = monthlyYieldKg * meta.pricePerKg;
    const monthlyHvacCostEur = allocatedM2 * meta.hvacPerM2;
    const monthlyProfitEur = monthlyRevenueEur - monthlyHvacCostEur;

    totalRevenue += monthlyRevenueEur;
    totalCost += monthlyHvacCostEur;

    allocations.push({
      crop: meta.crop,
      allocatedM2: Number(allocatedM2.toFixed(1)),
      floorsUsed: Math.max(1, Math.ceil(allocatedM2 / (inputs.footprintAreaM2 * USABLE_FLOOR_RATIO))),
      monthlyYieldKg: Number(monthlyYieldKg.toFixed(1)),
      monthlyRevenueEur: Number(monthlyRevenueEur.toFixed(2)),
      monthlyHvacCostEur: Number(monthlyHvacCostEur.toFixed(2)),
      monthlyProfitEur: Number(monthlyProfitEur.toFixed(2)),
    });
  }

  // Sort allocations by profit descending for better presentation.
  allocations.sort((a, b) => b.monthlyProfitEur - a.monthlyProfitEur);

  const totalProfit = totalRevenue - totalCost;
  const investment = inputs.footprintAreaM2 * inputs.floors * ESTIMATED_INVESTMENT_PER_M2_EUR;
  const breakevenMonths = totalProfit > 0 ? investment / totalProfit : 0;

  return {
    allocations,
    totalMonthlyRevenueEur: Number(totalRevenue.toFixed(2)),
    totalMonthlyCostEur: Number(totalCost.toFixed(2)),
    totalMonthlyProfitEur: Number(totalProfit.toFixed(2)),
    breakevenMonths: Number(breakevenMonths.toFixed(1)),
  };
}

export const OPTIMIZER_CONSTANTS = {
  USABLE_FLOOR_RATIO,
  ESTIMATED_INVESTMENT_PER_M2_EUR,
};
