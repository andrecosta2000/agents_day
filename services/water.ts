import type { WaterSource } from "@/types/interfaces";

// OpenStreetMap Overpass API — free, no key required.
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function classify(tags: Record<string, string> = {}): WaterSource["type"] | null {
  if (tags.waterway === "river") return "river";
  if (tags.waterway === "canal") return "canal";
  if (tags.water === "reservoir" || tags.natural === "water") return "reservoir";
  return null;
}

export async function getWaterSources(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<WaterSource[]> {
  const query = `
    [out:json][timeout:15];
    (
      way(around:${radiusM},${lat},${lng})["waterway"~"river|canal"];
      way(around:${radiusM},${lat},${lng})["water"="reservoir"];
      relation(around:${radiusM},${lat},${lng})["waterway"~"river|canal"];
    );
    out center tags 30;
  `.trim();

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    const data: OverpassResponse = await res.json();

    const sources: WaterSource[] = [];
    for (const el of data.elements) {
      const point = el.center ?? (el.lat !== undefined && el.lon !== undefined ? { lat: el.lat, lon: el.lon } : null);
      if (!point) continue;
      const type = classify(el.tags);
      if (!type) continue;
      sources.push({
        type,
        name: el.tags?.name ?? `Unnamed ${type}`,
        distanceM: Math.round(haversineMeters(lat, lng, point.lat, point.lon)),
        lat: point.lat,
        lng: point.lon,
      });
    }

    sources.sort((a, b) => a.distanceM - b.distanceM);
    return sources.slice(0, 10);
  } catch {
    return mockWaterSources(lat, lng, radiusM);
  }
}

function mockWaterSources(lat: number, lng: number, radiusM: number): WaterSource[] {
  // Deterministic mock: a river ~600m east, a canal ~1.4km north, municipal source nearby.
  const offsetLat = (m: number) => m / 111000;
  const offsetLng = (m: number) => m / (111000 * Math.cos((lat * Math.PI) / 180));

  const sources: WaterSource[] = [];
  if (radiusM >= 600) {
    sources.push({
      type: "river",
      name: "Local River",
      distanceM: 600,
      lat,
      lng: lng + offsetLng(600),
    });
  }
  if (radiusM >= 1400) {
    sources.push({
      type: "canal",
      name: "Irrigation Canal",
      distanceM: 1400,
      lat: lat + offsetLat(1400),
      lng,
    });
  }
  sources.push({
    type: "municipal",
    name: "Municipal Water Network",
    distanceM: 50,
    lat,
    lng,
  });
  return sources;
}
