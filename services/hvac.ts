import type { Crop, ClimateData, HvacCost } from "@/types/interfaces";

const ELECTRICITY_COST_EUR_KWH = Number(process.env.ELECTRICITY_COST_EUR_KWH ?? "0.25");

// Empirical heating/cooling load coefficients for an insulated vertical farm shell.
// Watts per m² per °C of indoor-outdoor temperature delta (rough engineering estimate).
const HEATING_W_PER_M2_PER_DEG = 8.0;  // heat loss through envelope when outside is colder
const COOLING_W_PER_M2_PER_DEG = 12.0; // includes lighting/equipment heat removal

// Dehumidification load (kWh per m² per month) when humidity gap > 0.
const DEHUMID_KWH_PER_M2_PER_PCT = 0.05;

const HOURS_PER_MONTH = 24 * 30;

function targetTemp(crop: Crop): number {
  return (crop.idealTempMinC + crop.idealTempMaxC) / 2;
}

function targetHumidity(crop: Crop): number {
  return (crop.idealHumidityMinPct + crop.idealHumidityMaxPct) / 2;
}

export function getHvacCost(
  crop: Crop,
  climate: ClimateData,
  areaM2: number,
): HvacCost {
  const tTarget = targetTemp(crop);
  const hTarget = targetHumidity(crop);

  let annualKwh = 0;

  for (let m = 0; m < 12; m++) {
    const outsideTemp = climate.monthlyAvgTempC[m];
    const outsideHum = climate.monthlyAvgHumidityPct[m];

    const tempDelta = tTarget - outsideTemp;
    let monthKwh = 0;

    if (tempDelta > 0) {
      // Need heating
      const watts = HEATING_W_PER_M2_PER_DEG * tempDelta * areaM2;
      monthKwh += (watts * HOURS_PER_MONTH) / 1000;
    } else if (tempDelta < 0) {
      // Need cooling
      const watts = COOLING_W_PER_M2_PER_DEG * Math.abs(tempDelta) * areaM2;
      monthKwh += (watts * HOURS_PER_MONTH) / 1000;
    }

    // Dehumidification when ambient humidity exceeds target.
    const humDelta = outsideHum - hTarget;
    if (humDelta > 0) {
      monthKwh += DEHUMID_KWH_PER_M2_PER_PCT * humDelta * areaM2;
    }

    annualKwh += monthKwh;
  }

  const monthlyKwh = annualKwh / 12;
  const monthlyCostEur = monthlyKwh * ELECTRICITY_COST_EUR_KWH;
  const annualCostEur = annualKwh * ELECTRICITY_COST_EUR_KWH;

  return {
    cropId: crop.id,
    monthlyKwh: Math.round(monthlyKwh),
    monthlyCostEur: Number(monthlyCostEur.toFixed(2)),
    annualCostEur: Number(annualCostEur.toFixed(2)),
  };
}

// Convenience: compute HVAC cost for many crops at once.
export function getHvacCostsForCrops(
  crops: Crop[],
  climate: ClimateData,
  areaM2: number,
): HvacCost[] {
  return crops.map((c) => getHvacCost(c, climate, areaM2));
}
