import type { Crop } from "@/types/interfaces";

// Curated crop database for vertical farming.
// Yields and prices are realistic averages for indoor hydroponic systems
// in European/US wholesale markets (EUR per kg, kg per m² per month).
const CROPS: Crop[] = [
  {
    id: "lettuce",
    name: "Lettuce",
    idealTempMinC: 15,
    idealTempMaxC: 22,
    idealHumidityMinPct: 60,
    idealHumidityMaxPct: 70,
    yieldKgPerM2PerMonth: 4.5,
    avgMarketPricePerKg: 3.2,
    growthCycleDays: 30,
    lightHoursRequired: 14,
  },
  {
    id: "basil",
    name: "Basil",
    idealTempMinC: 20,
    idealTempMaxC: 28,
    idealHumidityMinPct: 60,
    idealHumidityMaxPct: 70,
    yieldKgPerM2PerMonth: 3.0,
    avgMarketPricePerKg: 18.0,
    growthCycleDays: 35,
    lightHoursRequired: 16,
  },
  {
    id: "kale",
    name: "Kale",
    idealTempMinC: 13,
    idealTempMaxC: 21,
    idealHumidityMinPct: 55,
    idealHumidityMaxPct: 70,
    yieldKgPerM2PerMonth: 3.8,
    avgMarketPricePerKg: 4.5,
    growthCycleDays: 45,
    lightHoursRequired: 14,
  },
  {
    id: "spinach",
    name: "Spinach",
    idealTempMinC: 12,
    idealTempMaxC: 20,
    idealHumidityMinPct: 60,
    idealHumidityMaxPct: 70,
    yieldKgPerM2PerMonth: 4.0,
    avgMarketPricePerKg: 5.0,
    growthCycleDays: 35,
    lightHoursRequired: 12,
  },
  {
    id: "strawberry",
    name: "Strawberry",
    idealTempMinC: 18,
    idealTempMaxC: 24,
    idealHumidityMinPct: 65,
    idealHumidityMaxPct: 75,
    yieldKgPerM2PerMonth: 2.5,
    avgMarketPricePerKg: 9.0,
    growthCycleDays: 60,
    lightHoursRequired: 16,
  },
  {
    id: "cherry_tomato",
    name: "Cherry Tomato",
    idealTempMinC: 20,
    idealTempMaxC: 27,
    idealHumidityMinPct: 65,
    idealHumidityMaxPct: 80,
    yieldKgPerM2PerMonth: 5.0,
    avgMarketPricePerKg: 4.8,
    growthCycleDays: 75,
    lightHoursRequired: 16,
  },
  {
    id: "arugula",
    name: "Arugula",
    idealTempMinC: 14,
    idealTempMaxC: 22,
    idealHumidityMinPct: 55,
    idealHumidityMaxPct: 70,
    yieldKgPerM2PerMonth: 3.5,
    avgMarketPricePerKg: 8.0,
    growthCycleDays: 30,
    lightHoursRequired: 12,
  },
  {
    id: "microgreens",
    name: "Microgreens (mixed)",
    idealTempMinC: 18,
    idealTempMaxC: 24,
    idealHumidityMinPct: 50,
    idealHumidityMaxPct: 70,
    yieldKgPerM2PerMonth: 2.0,
    avgMarketPricePerKg: 35.0,
    growthCycleDays: 14,
    lightHoursRequired: 14,
  },
  {
    id: "bell_pepper",
    name: "Bell Pepper",
    idealTempMinC: 21,
    idealTempMaxC: 28,
    idealHumidityMinPct: 60,
    idealHumidityMaxPct: 75,
    yieldKgPerM2PerMonth: 3.2,
    avgMarketPricePerKg: 5.5,
    growthCycleDays: 80,
    lightHoursRequired: 16,
  },
  {
    id: "chives",
    name: "Chives",
    idealTempMinC: 16,
    idealTempMaxC: 24,
    idealHumidityMinPct: 55,
    idealHumidityMaxPct: 70,
    yieldKgPerM2PerMonth: 2.2,
    avgMarketPricePerKg: 22.0,
    growthCycleDays: 40,
    lightHoursRequired: 14,
  },
];

export function getAllCrops(): Crop[] {
  return CROPS;
}

export function getCropById(id: string): Crop | undefined {
  return CROPS.find((c) => c.id === id);
}

export function getCropByName(name: string): Crop | undefined {
  const lower = name.toLowerCase();
  return CROPS.find((c) => c.name.toLowerCase() === lower);
}
