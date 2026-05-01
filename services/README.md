# Services — Member 1

**Branch:** `feat/data`  
**Owner:** Member 1  
**Purpose:** All external data integrations and the intelligence layer (optimizer, energy modeling, ROI).

## Modules to Build

| File | Status | Description |
|------|--------|-------------|
| `zoning.ts` | [ ] | Zoning type, max height, restrictions by lat/lng |
| `climate.ts` | [ ] | Monthly temp, humidity, sunlight via OpenMeteo |
| `crops.ts` | [ ] | Static crop database |
| `hvac.ts` | [ ] | HVAC energy gap calculator |
| `solar.ts` | [ ] | Solar potential and ROI calculator |
| `water.ts` | [ ] | Nearby water sources via OpenStreetMap Overpass |
| `demand.ts` | [ ] | Produce demand per city |
| `optimizer.ts` | [ ] | Crop mix linear optimizer |
| `roi.ts` | [ ] | ROI aggregator |

## Exported Function Signatures

```typescript
// zoning.ts
getZoning(lat: number, lng: number): Promise<ZoningInfo>

// climate.ts
getClimate(lat: number, lng: number): Promise<ClimateData>

// crops.ts
getAllCrops(): Crop[]
getCropById(id: string): Crop | undefined

// hvac.ts
getHvacCost(crop: Crop, climate: ClimateData, areaM2: number): HvacCost

// solar.ts
getSolarAssessment(lat: number, lng: number, roofAreaM2: number): Promise<SolarAssessment>

// water.ts
getWaterSources(lat: number, lng: number, radiusM: number): Promise<WaterSource[]>

// demand.ts
getProduceDemand(city: string): Promise<Demand[]>

// optimizer.ts
optimizeCropMix(availableAreaM2: number, floors: number, demand: Demand[], climate: ClimateData): CropPlan

// roi.ts
calculateRoi(cropPlan: CropPlan, solar: SolarAssessment, site: Site): Roi
```

All types imported from `@/types/interfaces.ts`.

## Mock Fallbacks

Every function must have a mock fallback used when:
- `process.env.NODE_ENV === 'test'`
- Real API call fails
- API key is missing

## Notes

_Use this section to communicate changes to teammates._
