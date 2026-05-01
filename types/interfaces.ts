// Shared types — all team members import from here

export type ZoneType = "agricultural" | "industrial" | "residential" | "mixed" | "unknown";

export interface Site {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zone: ZoneType;
  maxHeightM: number;
  areaM2: number;
  score: number; // 0-100 composite score
  city: string;
}

export interface ZoningInfo {
  type: ZoneType;
  maxHeightM: number;
  restrictions: string[];
  estimatedPricePerM2: number;
}

export interface ClimateData {
  monthlyAvgTempC: number[];      // 12 values
  monthlyAvgHumidityPct: number[]; // 12 values
  monthlyAvgSunlightHours: number[]; // 12 values
  annualAvgTempC: number;
  annualAvgHumidityPct: number;
}

export interface Crop {
  id: string;
  name: string;
  idealTempMinC: number;
  idealTempMaxC: number;
  idealHumidityMinPct: number;
  idealHumidityMaxPct: number;
  yieldKgPerM2PerMonth: number;
  avgMarketPricePerKg: number;
  growthCycleDays: number;
  lightHoursRequired: number;
}

export interface HvacCost {
  cropId: string;
  monthlyKwh: number;
  monthlyCostEur: number;
  annualCostEur: number;
}

export interface SolarAssessment {
  annualKwhGeneration: number;
  installationCostEur: number;
  annualGridCostEur: number;
  roiYears: number;
  recommendation: "solar" | "grid" | "hybrid";
}

export interface WaterSource {
  type: "river" | "canal" | "reservoir" | "municipal";
  name: string;
  distanceM: number;
  lat: number;
  lng: number;
}

export interface Demand {
  crop: string;
  demandKgPerMonth: number;
  pricePerKg: number;
}

export interface CropAllocation {
  crop: Crop;
  allocatedM2: number;
  floorsUsed: number;
  monthlyYieldKg: number;
  monthlyRevenueEur: number;
  monthlyHvacCostEur: number;
  monthlyProfitEur: number;
}

export interface CropPlan {
  allocations: CropAllocation[];
  totalMonthlyRevenueEur: number;
  totalMonthlyCostEur: number;
  totalMonthlyProfitEur: number;
  breakevenMonths: number;
}

export interface Roi {
  monthlyRevenueEur: number;
  monthlyHvacCostEur: number;
  monthlyEnergyCostEur: number;
  monthlyWaterCostEur: number;
  monthlyNetProfitEur: number;
  annualNetProfitEur: number;
  estimatedInvestmentEur: number;
  breakevenYears: number;
}

export interface SiteReport {
  site: Site;
  zoning: ZoningInfo;
  climate: ClimateData;
  hvacCosts: HvacCost[];
  solar: SolarAssessment;
  waterSources: WaterSource[];
  cropPlan: CropPlan;
  roi: Roi;
}

// Agent & Incident types

export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "open" | "agent_resolving" | "escalated" | "resolved";

export interface SensorReading {
  siteId: string;
  timestamp: string;
  tempC: number;
  humidityPct: number;
  ph: number;
  waterFlowLPerMin: number;
  lightLux: number;
}

export interface AgentAction {
  timestamp: string;
  action: string;
  result: "success" | "failed" | "pending";
}

export interface Incident {
  id: string;
  siteId: string;
  severity: SeverityLevel;
  status: IncidentStatus;
  description: string;
  sensorSnapshot: SensorReading;
  agentActions: AgentAction[];
  createdAt: string;
  updatedAt: string;
  pagerdutyIncidentId?: string;
}
