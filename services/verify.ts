/**
 * End-to-end verification CLI for all services.
 *
 * Usage:
 *   npx tsx services/verify.ts                  # default: Lisbon
 *   npx tsx services/verify.ts "New York"
 *   npx tsx services/verify.ts Berlin
 */

import {
  getZoning,
  getClimate,
  getSolarAssessment,
  getWaterSources,
  getDemandResearch,
  getSupportedCities,
  optimizeCropMix,
  calculateRoi,
  getAllCrops,
  getHvacCost,
  filterSuitableCrops,
  resolveCrop,
} from "./index";
import type { Site, Crop } from "@/types/interfaces";

// Approximate city centers for the demo cities (lat, lng).
const CITY_COORDS: Record<string, [number, number]> = {
  "New York": [40.7128, -74.0060],
  "Chicago": [41.8781, -87.6298],
  "Los Angeles": [34.0522, -118.2437],
  "San Francisco": [37.7749, -122.4194],
  "Boston": [42.3601, -71.0589],
  "Seattle": [47.6062, -122.3321],
  "Lisbon": [38.7223, -9.1393],
  "Porto": [41.1579, -8.6291],
  "Madrid": [40.4168, -3.7038],
  "Barcelona": [41.3851, 2.1734],
  "Berlin": [52.5200, 13.4050],
  "Amsterdam": [52.3676, 4.9041],
  "Paris": [48.8566, 2.3522],
  "London": [51.5074, -0.1278],
  "Dubai": [25.2048, 55.2708],
};

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function header(text: string) {
  console.log("\n" + C.bold + C.cyan + "━".repeat(70) + C.reset);
  console.log(C.bold + C.cyan + "  " + text + C.reset);
  console.log(C.bold + C.cyan + "━".repeat(70) + C.reset);
}

function section(text: string) {
  console.log("\n" + C.bold + C.yellow + "▸ " + text + C.reset);
}

function kv(label: string, value: string | number, unit = "") {
  const padded = label.padEnd(28);
  console.log(`  ${C.dim}${padded}${C.reset} ${value}${unit ? " " + C.dim + unit + C.reset : ""}`);
}

function eur(n: number): string {
  return "€" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

async function main() {
  const cityArg = process.argv.slice(2).join(" ").trim();
  const city = cityArg || "Lisbon";

  if (!CITY_COORDS[city]) {
    console.error(`Unknown city: "${city}"`);
    console.error("Supported: " + getSupportedCities().join(", "));
    process.exit(1);
  }

  const [lat, lng] = CITY_COORDS[city];

  header(`UrbanFarm Site Feasibility Report — ${city}`);
  console.log(C.dim + `  coordinates: ${lat}, ${lng}` + C.reset);

  // 1. Demand (dynamic research)
  section("1. Local Produce Demand (researched)");
  const research = await getDemandResearch(city);
  const sourceLabel =
    research.source === "live" ? C.green + "live" + C.reset
    : research.source === "cache" ? C.cyan + "cache" + C.reset
    : C.yellow + "fallback" + C.reset;
  console.log(C.dim + `  source: ${sourceLabel}  as of ${research.asOf}` + C.reset);
  const demand = research.demands;
  for (const d of demand.slice(0, 6)) {
    const trendIcon = d.trend === "rising" ? C.green + "↑" + C.reset
      : d.trend === "falling" ? C.red + "↓" + C.reset
      : C.dim + "→" + C.reset;
    const conf = d.confidence !== undefined ? ` ${C.dim}(conf ${d.confidence})${C.reset}` : "";
    kv(d.crop, `${trendIcon} ${d.demandKgPerMonth.toLocaleString()} kg/mo @ €${d.pricePerKg}/kg${conf}`);
  }
  if (demand.length > 6) console.log(C.dim + `  ... and ${demand.length - 6} more crops` + C.reset);

  // 2. Zoning
  section("2. Zoning (mock)");
  const zoning = await getZoning(lat, lng);
  kv("Zone type", C.green + zoning.type + C.reset);
  kv("Max height", zoning.maxHeightM, "m");
  kv("Estimated land price", eur(zoning.estimatedPricePerM2) + "/m²");
  console.log(C.dim + "  Restrictions:" + C.reset);
  for (const r of zoning.restrictions) console.log(`    • ${r}`);

  // 3. Climate (real OpenMeteo call)
  section("3. Climate (OpenMeteo)");
  const t0 = Date.now();
  const climate = await getClimate(lat, lng);
  const climateMs = Date.now() - t0;
  kv("Annual avg temp", climate.annualAvgTempC, "°C");
  kv("Annual avg humidity", climate.annualAvgHumidityPct, "%");
  kv("Monthly temps (°C)", climate.monthlyAvgTempC.map((t) => t.toFixed(0)).join(", "));
  kv("Monthly sun (h/day)", climate.monthlyAvgSunlightHours.map((h) => h.toFixed(0)).join(", "));
  console.log(C.dim + `  fetched in ${climateMs}ms` + C.reset);

  // 4. HVAC sample for top 3 crops
  section("4. HVAC Cost (sample, 1000 m²)");
  const sampleCrops = getAllCrops().slice(0, 5);
  for (const crop of sampleCrops) {
    const hvac = getHvacCost(crop, climate, 1000);
    kv(crop.name, `${hvac.monthlyKwh.toLocaleString()} kWh/mo · ${eur(hvac.monthlyCostEur)}/mo`);
  }

  // 5. Solar
  section("5. Solar Assessment (1000 m² roof)");
  const solar = await getSolarAssessment(lat, lng, 1000);
  kv("Annual generation", solar.annualKwhGeneration.toLocaleString(), "kWh");
  kv("Install cost", eur(solar.installationCostEur));
  kv("Annual grid cost (farm)", eur(solar.annualGridCostEur));
  kv("ROI", solar.roiYears, "years");
  const recColor = solar.recommendation === "solar" ? C.green : solar.recommendation === "hybrid" ? C.yellow : C.red;
  kv("Recommendation", recColor + solar.recommendation.toUpperCase() + C.reset);

  // 6. Water sources (real Overpass call)
  section("6. Water Sources (OpenStreetMap, 2km radius)");
  const tw = Date.now();
  const water = await getWaterSources(lat, lng, 2000);
  const waterMs = Date.now() - tw;
  if (water.length === 0) {
    console.log(C.dim + "  no sources found" + C.reset);
  } else {
    for (const w of water.slice(0, 5)) {
      kv(`${w.type}: ${w.name}`, `${w.distanceM} m`);
    }
    if (water.length > 5) console.log(C.dim + `  ... and ${water.length - 5} more` + C.reset);
  }
  console.log(C.dim + `  fetched in ${waterMs}ms` + C.reset);

  // 7a. Suitability filter
  section("7. Suitability Filter (climate fit)");
  const candidateCrops: Crop[] = demand.map((d) =>
    resolveCrop(d.crop, d.pricePerKg, research.profiles),
  );
  const { suitable, scores } = filterSuitableCrops(candidateCrops, climate);
  for (const s of scores) {
    const color = s.score >= 0.7 ? C.green : s.score >= 0.3 ? C.yellow : C.red;
    const status = s.reason === "ok" ? "PASS" : "DROP";
    kv(s.cropName, `${color}${status}${C.reset}  score ${s.score.toFixed(2)}  rev €${s.monthlyRevenuePerM2Eur}/m²  hvac €${s.monthlyHvacCostPerM2Eur}/m²`);
  }
  console.log(C.dim + `  ${suitable.length} of ${candidateCrops.length} crops kept` + C.reset);

  // 7b. Optimizer
  section("8. Crop Mix Optimization (1000 m² × 6 floors)");
  const cropPlan = optimizeCropMix({
    footprintAreaM2: 1000,
    floors: 6,
    demand: demand.filter((d) => suitable.find((c) => c.name === d.crop)),
    climate,
    crops: suitable,
  });
  for (const a of cropPlan.allocations) {
    const profitColor = a.monthlyProfitEur > 0 ? C.green : C.red;
    kv(
      a.crop.name,
      `${a.allocatedM2.toFixed(0).padStart(5)} m² → ${profitColor}${eur(a.monthlyProfitEur)}/mo${C.reset}`,
    );
  }
  kv("Monthly revenue", C.green + eur(cropPlan.totalMonthlyRevenueEur) + C.reset);
  kv("Monthly HVAC", C.red + eur(cropPlan.totalMonthlyCostEur) + C.reset);
  kv("Monthly profit", C.bold + C.green + eur(cropPlan.totalMonthlyProfitEur) + C.reset);

  // 9. ROI
  section("9. Full Site ROI");
  const site: Site = {
    id: "demo-1",
    name: `${city} Demo Site`,
    lat,
    lng,
    zone: zoning.type,
    maxHeightM: zoning.maxHeightM,
    areaM2: 1000,
    score: 80,
    city,
  };
  const roi = calculateRoi({
    site,
    cropPlan,
    solar,
    waterSources: water,
    pricePerM2Eur: zoning.estimatedPricePerM2,
  });
  kv("Monthly revenue", C.green + eur(roi.monthlyRevenueEur) + C.reset);
  kv("Monthly HVAC", eur(roi.monthlyHvacCostEur));
  kv("Monthly energy", eur(roi.monthlyEnergyCostEur));
  kv("Monthly water", eur(roi.monthlyWaterCostEur));
  const profitColor = roi.monthlyNetProfitEur > 0 ? C.green : C.red;
  kv("Monthly net profit", C.bold + profitColor + eur(roi.monthlyNetProfitEur) + C.reset);
  kv("Annual net profit", C.bold + profitColor + eur(roi.annualNetProfitEur) + C.reset);
  kv("Estimated investment", eur(roi.estimatedInvestmentEur));
  kv("Breakeven", roi.breakevenYears === -1 ? C.red + "never" + C.reset : C.bold + roi.breakevenYears + " years" + C.reset);

  console.log("\n" + C.green + "✓ All services exercised successfully" + C.reset + "\n");
}

main().catch((err) => {
  console.error("\n" + C.red + "✗ Verification failed:" + C.reset);
  console.error(err);
  process.exit(1);
});
