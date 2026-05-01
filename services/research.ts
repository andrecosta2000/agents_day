/**
 * Demand Research Agent.
 *
 * Uses the Claude API with the web_search tool to research current produce
 * demand signals for a given city — restaurant trends, supply-chain news,
 * price moves, social trends, retail availability — and structures the
 * result as a list of trending crops with estimated monthly demand,
 * price, agronomic profile, trend direction, and source citations.
 *
 * The model is instructed to return JSON conforming to a fixed schema
 * (structured outputs via output_config.format), so callers can rely on
 * the shape without parsing free text.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Demand, DemandResearchResult, CropProfile } from "@/types/interfaces";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
const MAX_SEARCHES = 6;

interface ResearchedCrop {
  name: string;
  estimated_monthly_demand_kg: number;
  estimated_price_per_kg_eur: number;
  trend: "rising" | "stable" | "falling";
  confidence: number;
  ideal_temp_min_c: number;
  ideal_temp_max_c: number;
  ideal_humidity_min_pct: number;
  ideal_humidity_max_pct: number;
  yield_kg_per_m2_per_month: number;
  rationale: string;
  sources: { url: string; snippet: string }[];
}

interface ResearchPayload {
  city: string;
  as_of: string;
  trending_crops: ResearchedCrop[];
}

const RESEARCH_SCHEMA = {
  type: "object",
  properties: {
    city: { type: "string" },
    as_of: { type: "string" },
    trending_crops: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          estimated_monthly_demand_kg: { type: "number" },
          estimated_price_per_kg_eur: { type: "number" },
          trend: { type: "string", enum: ["rising", "stable", "falling"] },
          confidence: { type: "number" },
          ideal_temp_min_c: { type: "number" },
          ideal_temp_max_c: { type: "number" },
          ideal_humidity_min_pct: { type: "number" },
          ideal_humidity_max_pct: { type: "number" },
          yield_kg_per_m2_per_month: { type: "number" },
          rationale: { type: "string" },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: { type: "string" },
                snippet: { type: "string" },
              },
              required: ["url", "snippet"],
              additionalProperties: false,
            },
          },
        },
        required: [
          "name",
          "estimated_monthly_demand_kg",
          "estimated_price_per_kg_eur",
          "trend",
          "confidence",
          "ideal_temp_min_c",
          "ideal_temp_max_c",
          "ideal_humidity_min_pct",
          "ideal_humidity_max_pct",
          "yield_kg_per_m2_per_month",
          "rationale",
          "sources",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["city", "as_of", "trending_crops"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a market-research analyst specializing in urban food demand for vertical farming feasibility studies.

Your task: research the current produce-demand landscape for a target city and return a structured list of crops that a vertical farm should consider growing there. Crops should be:
  - Suitable for hydroponic / indoor vertical farming (greens, herbs, microgreens, fruiting plants, edible flowers)
  - In active local demand (restaurants buying, retailers stocking, consumers seeking)
  - Within reasonable agronomic feasibility for indoor cultivation

Method:
  1. Use web_search to investigate the city's current food scene: restaurant menus and trends, grocery chain promotions, food media, supply-chain reports, agricultural statistics.
  2. Look for specific signals: shortages, price spikes, "trending" produce, new restaurant openings featuring particular ingredients, supermarket pricing reports.
  3. Estimate monthly demand by combining per-capita consumption norms with the local population scale and any specific signals you find.
  4. Estimate retail / wholesale price per kg in EUR. If sources quote USD/GBP, convert.
  5. Return between 6 and 12 crops, prioritizing high-margin and high-demand ones.

For each crop, include 1–3 web sources (URLs you actually opened) and a short rationale citing the signal.

Be honest about confidence: 0.9 if you found direct numeric data, 0.5 if you're estimating from population × per-capita, 0.3 if it's a guess from general knowledge.`;

/**
 * Run the demand research agent for a city.
 *
 * Throws if no ANTHROPIC_API_KEY is configured. Caller should fall back
 * to static demand in that case.
 */
export async function researchDemand(city: string): Promise<DemandResearchResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        type: "web_search_20260209",
        name: "web_search",
        max_uses: MAX_SEARCHES,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: RESEARCH_SCHEMA,
      },
      effort: "medium",
    },
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: `Research current produce demand for vertical farming in ${city}. Return the structured list per the schema.`,
      },
    ],
  });

  // The structured-output text block contains a JSON string.
  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  if (!textBlock) {
    throw new Error("No text block in research response");
  }

  let payload: ResearchPayload;
  try {
    payload = JSON.parse(textBlock.text);
  } catch (err) {
    throw new Error(`Failed to parse research JSON: ${(err as Error).message}`);
  }

  return mapPayload(city, payload);
}

function mapPayload(requestedCity: string, payload: ResearchPayload): DemandResearchResult {
  const demands: Demand[] = [];
  const profiles: CropProfile[] = [];

  for (const c of payload.trending_crops) {
    demands.push({
      crop: c.name,
      demandKgPerMonth: Math.round(c.estimated_monthly_demand_kg),
      pricePerKg: Number(c.estimated_price_per_kg_eur.toFixed(2)),
      trend: c.trend,
      confidence: Number(c.confidence.toFixed(2)),
      rationale: c.rationale,
      sources: c.sources,
    });
    profiles.push({
      name: c.name,
      idealTempMinC: c.ideal_temp_min_c,
      idealTempMaxC: c.ideal_temp_max_c,
      idealHumidityMinPct: c.ideal_humidity_min_pct,
      idealHumidityMaxPct: c.ideal_humidity_max_pct,
      yieldKgPerM2PerMonth: c.yield_kg_per_m2_per_month,
    });
  }

  return {
    city: payload.city || requestedCity,
    asOf: payload.as_of || new Date().toISOString().slice(0, 10),
    source: "live",
    demands,
    profiles,
  };
}
