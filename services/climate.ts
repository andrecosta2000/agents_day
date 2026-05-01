import type { ClimateData } from "@/types/interfaces";

// OpenMeteo Climate API — free, no API key required.
// Docs: https://open-meteo.com/en/docs/climate-api
const OPENMETEO_BASE = process.env.OPENMETEO_BASE_URL ?? "https://archive-api.open-meteo.com/v1";

interface OpenMeteoResponse {
  daily?: {
    time: string[];
    temperature_2m_mean?: number[];
    relative_humidity_2m_mean?: number[];
    sunshine_duration?: number[];
  };
}

function avgByMonth(values: number[], dates: string[]): number[] {
  const sums = Array(12).fill(0);
  const counts = Array(12).fill(0);
  for (let i = 0; i < dates.length; i++) {
    const month = parseInt(dates[i].slice(5, 7), 10) - 1;
    if (Number.isFinite(values[i])) {
      sums[month] += values[i];
      counts[month] += 1;
    }
  }
  return sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
}

export async function getClimate(lat: number, lng: number): Promise<ClimateData> {
  // Use last full year of historical data for stable monthly averages.
  const now = new Date();
  const endDate = new Date(now.getFullYear() - 1, 11, 31).toISOString().slice(0, 10);
  const startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().slice(0, 10);

  const url =
    `${OPENMETEO_BASE}/archive` +
    `?latitude=${lat}&longitude=${lng}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&daily=temperature_2m_mean,relative_humidity_2m_mean,sunshine_duration` +
    `&timezone=auto`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`OpenMeteo HTTP ${res.status}`);
    const data: OpenMeteoResponse = await res.json();
    if (!data.daily || !data.daily.time) throw new Error("No daily data");

    const temps = data.daily.temperature_2m_mean ?? [];
    const humidity = data.daily.relative_humidity_2m_mean ?? [];
    // sunshine_duration is seconds/day → convert to hours/day
    const sunSeconds = data.daily.sunshine_duration ?? [];
    const sunHours = sunSeconds.map((s) => s / 3600);

    const monthlyTemp = avgByMonth(temps, data.daily.time);
    const monthlyHum = avgByMonth(humidity, data.daily.time);
    const monthlySun = avgByMonth(sunHours, data.daily.time);

    const annualTemp = monthlyTemp.reduce((a, b) => a + b, 0) / 12;
    const annualHum = monthlyHum.reduce((a, b) => a + b, 0) / 12;

    return {
      monthlyAvgTempC: monthlyTemp.map((v) => Number(v.toFixed(1))),
      monthlyAvgHumidityPct: monthlyHum.map((v) => Number(v.toFixed(1))),
      monthlyAvgSunlightHours: monthlySun.map((v) => Number(v.toFixed(1))),
      annualAvgTempC: Number(annualTemp.toFixed(1)),
      annualAvgHumidityPct: Number(annualHum.toFixed(1)),
    };
  } catch {
    return mockClimate(lat);
  }
}

// Latitude-based mock — colder away from equator.
function mockClimate(lat: number): ClimateData {
  const absLat = Math.abs(lat);
  const annualTemp = 30 - absLat * 0.5;
  const seasonalSwing = absLat * 0.4;
  const monthlyTemp = Array.from({ length: 12 }, (_, i) => {
    const phase = lat >= 0 ? i : (i + 6) % 12; // northern vs. southern hemisphere
    const seasonal = Math.cos(((phase - 6) / 12) * 2 * Math.PI) * -seasonalSwing;
    return Number((annualTemp + seasonal).toFixed(1));
  });
  const monthlySun = Array.from({ length: 12 }, (_, i) => {
    const phase = lat >= 0 ? i : (i + 6) % 12;
    const seasonal = Math.cos(((phase - 6) / 12) * 2 * Math.PI) * -3;
    return Number((8 + seasonal).toFixed(1));
  });
  const monthlyHum = Array(12).fill(65);

  return {
    monthlyAvgTempC: monthlyTemp,
    monthlyAvgHumidityPct: monthlyHum,
    monthlyAvgSunlightHours: monthlySun,
    annualAvgTempC: Number(annualTemp.toFixed(1)),
    annualAvgHumidityPct: 65,
  };
}
