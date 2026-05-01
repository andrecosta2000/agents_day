import type { ZoningInfo, ZoneType } from "@/types/interfaces";

// Deterministic mock zoning based on lat/lng hash.
// In production, this would query municipal GIS APIs (NYC PLUTO, Chicago Open Data, etc.)
// Hash returns a stable value for the same coordinates so the demo is consistent.

function hash(lat: number, lng: number): number {
  const s = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface ZoneProfile {
  type: ZoneType;
  maxHeightM: number;
  restrictions: string[];
  pricePerM2Range: [number, number];
}

const PROFILES: ZoneProfile[] = [
  {
    type: "industrial",
    maxHeightM: 30,
    restrictions: [
      "No residential use",
      "Heavy machinery permitted",
      "Noise restrictions: 22:00-07:00",
    ],
    pricePerM2Range: [400, 1200],
  },
  {
    type: "agricultural",
    maxHeightM: 18,
    restrictions: [
      "Use limited to crop production and processing",
      "Pesticide handling regulations apply",
      "Water rights subject to municipal approval",
    ],
    pricePerM2Range: [150, 600],
  },
  {
    type: "mixed",
    maxHeightM: 24,
    restrictions: [
      "Mixed light-industrial and commercial use",
      "Building envelope: max 70% lot coverage",
    ],
    pricePerM2Range: [800, 2200],
  },
  {
    type: "residential",
    maxHeightM: 12,
    restrictions: [
      "Commercial agriculture not permitted",
      "Conversion to industrial use requires zoning variance",
    ],
    pricePerM2Range: [1500, 4500],
  },
];

export async function getZoning(lat: number, lng: number): Promise<ZoningInfo> {
  const h = hash(lat, lng);
  // Bias toward industrial/agricultural/mixed (better for vertical farming).
  const distribution: ZoneType[] = [
    "industrial", "industrial", "industrial",
    "agricultural", "agricultural",
    "mixed", "mixed",
    "residential",
  ];
  const type = distribution[h % distribution.length];
  const profile = PROFILES.find((p) => p.type === type)!;

  const [minPrice, maxPrice] = profile.pricePerM2Range;
  const priceRange = maxPrice - minPrice;
  const price = minPrice + ((h % 1000) / 1000) * priceRange;

  // Slight per-site height variation (±20% within zone limit).
  const heightJitter = ((h % 200) / 1000) - 0.1;
  const maxHeightM = Math.round(profile.maxHeightM * (1 + heightJitter));

  return {
    type,
    maxHeightM,
    restrictions: profile.restrictions,
    estimatedPricePerM2: Math.round(price),
  };
}
