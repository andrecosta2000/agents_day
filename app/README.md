# Frontend — Member 3

**Branch:** `feat/frontend`  
**Owner:** Member 3  
**Purpose:** All UI components and pages. Consumes the API defined in `/app/api/README.md`.

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage` | City selector + map |
| `/sites/[id]` | `SiteDetailPage` | Full report for a site |

## Components to Build

| File | Status | Description |
|------|--------|-------------|
| `components/CitySelector.tsx` | [x] | Search/dropdown to pick a city |
| `components/SiteMap.tsx` | [x] | Leaflet map with scored markers |
| `components/SiteDetailPanel.tsx` | [x] | Zoning, climate, energy summary |
| `components/CropPlanChart.tsx` | [x] | Bar/pie chart of crop mix allocations |
| `components/RoiDashboard.tsx` | [x] | Revenue, costs, breakeven card |
| `components/IncidentFeed.tsx` | [x] | Live agent incidents with resolve button |

## API Calls

Code against these endpoints (see `/app/api/README.md` for full response shapes):

```typescript
fetch(`/api/sites?city=${city}`)           // → Site[]
fetch(`/api/sites/${id}/report`)           // → SiteReport
fetch(`/api/produce-demand?city=${city}`)  // → Demand[]
fetch(`/api/incidents?siteId=${id}`)       // → Incident[]
fetch(`/api/incidents/${id}/resolve`, { method: 'POST' })
```

## Mock Data

Use local mock JSON files in `/app/mocks/` while the backend is not ready. The fetch calls should be identical — just swap the source.

## Stack

- **Next.js App Router** — pages in `/app`
- **Tailwind CSS** — styling
- **Leaflet.js** — map (`react-leaflet` wrapper)
- **Recharts** — charts

## Notes

- Home uses `/?city=Lisbon|Porto`: server loads `getSites` + `getProduceDemand`; client map is `dynamic(..., { ssr: false })`.
- Added `components/AppShell.tsx` + `components/DemandSnippet.tsx` for layout and demand summary.
