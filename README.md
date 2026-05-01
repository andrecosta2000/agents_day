# UrbanFarm Optimizer

A site selection and feasibility platform for urban vertical farming. Helps investors find the best urban locations and optimize crop mix for maximum profitability.

## Team & Branches

| Member | Branch | Component | Brief |
|--------|--------|-----------|-------|
| Member 1 | `feat/data` | Data Services & Optimizer | [`/services/README.md`](./services/README.md) |
| Member 2 | `feat/backend` | Backend API | [`/app/api/README.md`](./app/api/README.md) |
| Member 3 | `feat/frontend` | Frontend & UI | [`/app/README.md`](./app/README.md) |

## Project Structure

```
/
├── types/
│   └── interfaces.ts        # Shared types — all members import from here
├── services/                # Member 1 — data integrations & optimizer
├── agents/                  # Member 3 — autonomous agents & PagerDuty
├── app/
│   ├── api/                 # Member 2 — API routes
│   └── components/          # Member 3 — UI components
└── .env.example             # Copy to .env.local and fill in keys
```

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

### CSS toolchain (Tailwind)

This project uses **Tailwind CSS v3** with PostCSS + Autoprefixer (no `@tailwindcss/oxide`). That avoids native Oxide bindings that often fail on locked-down macOS with **`code signature invalid (errno 85)`**. If you previously used Tailwind v4 here, configs live in [`tailwind.config.ts`](tailwind.config.ts), [`postcss.config.mjs`](postcss.config.mjs), and [`app/globals.css`](app/globals.css).

Dev and production builds default to **`next dev/build --webpack`** so Turbopack is not required when native SWC cannot load.

If native addons still fail after a clean install, try **Node 20 or 22 LTS**, delete `node_modules` and `package-lock.json`, run `npm install` again, or resolve macOS quarantine/signing for binaries under `node_modules` (IT/security policies sometimes block them).


## API Contract

All frontend↔backend communication (see `/app/api/README.md`):

```
GET  /api/sites?city={city}
GET  /api/sites/{id}/report
GET  /api/produce-demand?city={city}
GET  /api/incidents?siteId={id}
POST /api/incidents/{id}/resolve
```

## Shared Types

All members import from `@/types/interfaces.ts`. Never duplicate — update the shared file and note the change in your README.

## Integration Order

1. `/services` merges first (Member 1)
2. `/app/api` integrates services; `/agents` wires incidents & PagerDuty (Member 3)
3. `/app/components` swaps mocks for real endpoints (Member 3)
