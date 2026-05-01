import type { SolarAssessment } from "@/types/interfaces";
import { getClimate } from "./climate";

const ELECTRICITY_COST_EUR_KWH = Number(process.env.ELECTRICITY_COST_EUR_KWH ?? "0.25");
const SOLAR_COST_EUR_KWP = Number(process.env.SOLAR_COST_EUR_KWP ?? "1200");

// Modern monocrystalline panel performance.
const KWP_PER_M2 = 0.20;             // ~200W per m² of roof
const PANEL_EFFICIENCY = 0.85;       // system losses (inverter, wiring, soiling)
const ASSUMED_ANNUAL_FARM_KWH_PER_M2 = 600; // typical vertical farm consumption

export async function getSolarAssessment(
  lat: number,
  lng: number,
  roofAreaM2: number,
): Promise<SolarAssessment> {
  const climate = await getClimate(lat, lng);
  const annualSunHours = climate.monthlyAvgSunlightHours.reduce((a, b) => a + b, 0) * 30;

  const installedKwp = roofAreaM2 * KWP_PER_M2;
  const annualKwhGeneration = Math.round(installedKwp * annualSunHours * PANEL_EFFICIENCY);
  const installationCostEur = Math.round(installedKwp * SOLAR_COST_EUR_KWP);

  // Compare against estimated grid cost for a typical farm of this footprint.
  const estimatedFarmAnnualKwh = roofAreaM2 * ASSUMED_ANNUAL_FARM_KWH_PER_M2;
  const annualGridCostEur = Math.round(estimatedFarmAnnualKwh * ELECTRICITY_COST_EUR_KWH);

  // Annual savings = how much of the farm's grid cost solar offsets.
  const offsetKwh = Math.min(annualKwhGeneration, estimatedFarmAnnualKwh);
  const annualSavingsEur = offsetKwh * ELECTRICITY_COST_EUR_KWH;
  const roiYears = annualSavingsEur > 0 ? installationCostEur / annualSavingsEur : 99;

  let recommendation: "solar" | "grid" | "hybrid";
  if (roiYears < 7) recommendation = "solar";
  else if (roiYears < 15) recommendation = "hybrid";
  else recommendation = "grid";

  return {
    annualKwhGeneration,
    installationCostEur,
    annualGridCostEur,
    roiYears: Number(roiYears.toFixed(1)),
    recommendation,
  };
}
