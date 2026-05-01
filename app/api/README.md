# Backend API — Member 2

**Branch:** `feat/backend`  
**Owner:** Member 2  
**Purpose:** API routes and incident management. Imports from `/services`. Exposes endpoints consumed by the frontend.

## Routes

### `GET /api/sites?city={city}`
Returns candidate vertical farming sites near the city.

**Response:**
```typescript
Site[]
// { id, name, lat, lng, zone, maxHeightM, areaM2, score, city }
```

---

### `GET /api/sites/[id]/report`
Full feasibility report for a single site.

**Response:**
```typescript
SiteReport
// { site, zoning, climate, hvacCosts, solar, waterSources, cropPlan, roi }
```

---

### `GET /api/produce-demand?city={city}`
Local produce consumption data for the city.

**Response:**
```typescript
Demand[]
// { crop, demandKgPerMonth, pricePerKg }
```

---

### `GET /api/incidents?siteId={id}`
All incidents for a site, ordered by most recent. _(Implemented under [`incidents/`](./incidents/) — Member 3 agents layer.)_

**Response:**
```typescript
Incident[]
// { id, siteId, severity, status, description, sensorSnapshot, agentActions, createdAt, updatedAt }
```

---

### `POST /api/incidents/[id]/resolve`
Mark an incident as resolved.

**Response:**
```typescript
{ status: "resolved" }
```

---

## Mock Data

Every route must return realistic mock data when `services` are not yet integrated. Place mock data files in `/app/api/mocks/`.

## Integration with Services

Import from `@/services/*` once Member 1 has merged their branch. Until then, use mocks.

## Notes

_Use this section to communicate changes to teammates._
