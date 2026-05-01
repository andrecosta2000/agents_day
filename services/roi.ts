import type { CropPlan, Roi, Site, SolarAssessment, WaterSource } from "@/types/interfaces";
import { OPTIMIZER_CONSTANTS } from "./optimizer";

// Operational cost assumptions.
const WATER_COST_EUR_PER_M2_PER_MONTH = 0.40;
const NEAR_WATER_DISCOUNT_M = 500;          // sources within this radius cut cost
const NEAR_WATER_COST_RATIO = 0.4;          // pay 40% of municipal cost when river/canal nearby
const LAND_COST_AMORTIZATION_YEARS = 20;    // spread land cost across 20 years for ROI
const FIT_OUT_PER_M2_EUR = OPTIMIZER_CONSTANTS.ESTIMATED_INVESTMENT_PER_M2_EUR;

interface RoiInputs {
  site: Site;
  cropPlan: CropPlan;
  solar: SolarAssessment;
  waterSources: WaterSource[];
  pricePerM2Eur: number;   // from zoning.estimatedPricePerM2
}

export function calculateRoi(inputs: RoiInputs): Roi {
  const { site, cropPlan, solar, waterSources, pricePerM2Eur } = inputs;

  // Water cost: cheaper if a non-municipal source is nearby.
  const nearbyNonMunicipal = waterSources.find(
    (w) => w.type !== "municipal" && w.distanceM <= NEAR_WATER_DISCOUNT_M,
  );
  const waterCostRatio = nearbyNonMunicipal ? NEAR_WATER_COST_RATIO : 1.0;
  const monthlyWaterCostEur =
    site.areaM2 * WATER_COST_EUR_PER_M2_PER_MONTH * waterCostRatio;

  // Energy cost beyond HVAC (lighting, equipment) — handled at site level.
  // Solar offsets a portion of grid cost.
  const grossAnnualEnergyCost = solar.annualGridCostEur;
  const solarSavings =
    solar.recommendation === "solar"
      ? grossAnnualEnergyCost * 0.85
      : solar.recommendation === "hybrid"
        ? grossAnnualEnergyCost * 0.50
        : 0;
  const monthlyEnergyCostEur = (grossAnnualEnergyCost - solarSavings) / 12;

  const monthlyRevenue = cropPlan.totalMonthlyRevenueEur;
  const monthlyHvac = cropPlan.totalMonthlyCostEur;
  const monthlyNetProfit =
    monthlyRevenue - monthlyHvac - monthlyEnergyCostEur - monthlyWaterCostEur;
  const annualNetProfit = monthlyNetProfit * 12;

  // Investment = land + fit-out + solar (if recommended).
  const landCost = site.areaM2 * pricePerM2Eur;
  const fitOutCost = site.areaM2 * Math.max(1, Math.floor(site.maxHeightM / 4)) * FIT_OUT_PER_M2_EUR;
  const solarInvestment = solar.recommendation !== "grid" ? solar.installationCostEur : 0;
  const estimatedInvestment = landCost + fitOutCost + solarInvestment;

  const breakevenYears =
    annualNetProfit > 0
      ? estimatedInvestment / annualNetProfit
      : Infinity;

  return {
    monthlyRevenueEur: Number(monthlyRevenue.toFixed(2)),
    monthlyHvacCostEur: Number(monthlyHvac.toFixed(2)),
    monthlyEnergyCostEur: Number(monthlyEnergyCostEur.toFixed(2)),
    monthlyWaterCostEur: Number(monthlyWaterCostEur.toFixed(2)),
    monthlyNetProfitEur: Number(monthlyNetProfit.toFixed(2)),
    annualNetProfitEur: Number(annualNetProfit.toFixed(2)),
    estimatedInvestmentEur: Math.round(estimatedInvestment),
    breakevenYears: Number.isFinite(breakevenYears) ? Number(breakevenYears.toFixed(1)) : -1,
  };
}

export const ROI_CONSTANTS = {
  WATER_COST_EUR_PER_M2_PER_MONTH,
  LAND_COST_AMORTIZATION_YEARS,
  FIT_OUT_PER_M2_EUR,
};
