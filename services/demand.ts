import type { Demand } from "@/types/interfaces";
import { getAllCrops } from "./crops";

// Per-capita monthly consumption estimates (kg/person/month) for vertical-farm-relevant crops.
// Based on typical European/US dietary surveys.
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

// Population estimates for demo cities (rough metro-area numbers).
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

// Local price multipliers vs. baseline crop price (reflects market premium).
const CITY_PRICE_MULTIPLIER: Record<string, number> = {
  "New York": 1.35,
  "Chicago": 1.10,
  "Los Angeles": 1.30,
  "San Francisco": 1.45,
  "Boston": 1.25,
  "Seattle": 1.20,
  "Lisbon": 0.85,
  "Porto": 0.80,
  "Madrid": 0.95,
  "Barcelona": 1.00,
  "Berlin": 1.05,
  "Amsterdam": 1.15,
  "Paris": 1.30,
  "London": 1.40,
  "Dubai": 1.50,
};

const DEFAULT_POPULATION = 1000000;
const DEFAULT_PRICE_MULTIPLIER = 1.0;

export async function getProduceDemand(city: string): Promise<Demand[]> {
  const population = CITY_POPULATIONS[city] ?? DEFAULT_POPULATION;
  const priceMult = CITY_PRICE_MULTIPLIER[city] ?? DEFAULT_PRICE_MULTIPLIER;

  return getAllCrops().map((crop) => {
    const perCapita = PER_CAPITA_KG_PER_MONTH[crop.name] ?? 0.10;
    return {
      crop: crop.name,
      demandKgPerMonth: Math.round(perCapita * population),
      pricePerKg: Number((crop.avgMarketPricePerKg * priceMult).toFixed(2)),
    };
  });
}

export function getSupportedCities(): string[] {
  return Object.keys(CITY_POPULATIONS);
}
