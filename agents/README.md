# Agents & PagerDuty — Member 3

**Branch:** `feat/agents`  
**Owner:** Member 3  
**Scope:** Sensor simulation, on-site agents, orchestrator, offline queues, PagerDuty Events API v2, incident persistence, API routes.

## Components

| Module | Role |
|--------|------|
| [`simulator.ts`](simulator.ts) | Time-series generator per site; sticky anomalies until fixed or escalated. |
| [`SiteAgent.ts`](SiteAgent.ts) | Class-based agent: threshold checks, up to **3** remediation attempts, structured action log. |
| [`Orchestrator.ts`](Orchestrator.ts) | Coordinates all sites; **human escalation authority** (PagerDuty only after orchestrator processes a handoff). |
| [`eventQueue.ts`](eventQueue.ts) | JSON queue under `.urbanfarm/` when offline or failed sends; flushed when connectivity returns. |
| [`incidentStore.ts`](incidentStore.ts) | Atomic JSON store for `Incident` records (bootstraps once from [`app/mocks/incidents.json`](../app/mocks/incidents.json) if empty). |
| [`pagerduty.ts`](pagerduty.ts) | Events API v2 `trigger` / `resolve`; **`PAGERDUTY_MOCK=true`** writes mock payloads to `.urbanfarm/pagerduty-mock.jsonl`. |
| [`runner.ts`](runner.ts) | Process supervisor (`npm run agents:dev`) — ~30s tick loop. |

## Sensor event schema

Aligned with [`types/interfaces.ts`](../types/interfaces.ts) `SensorReading`:

```json
{
  "siteId": "site-lx-01",
  "timestamp": "2026-05-01T12:00:00.000Z",
  "tempC": 23.4,
  "humidityPct": 72,
  "ph": 6.0,
  "waterFlowLPerMin": 6.1,
  "lightLux": 12000
}
```

Thresholds:

| Sensor | Normal range |
|--------|----------------|
| Temperature | 18–28 °C |
| Humidity | 60–80 % |
| pH | 5.5–6.5 |
| Water flow | 2–10 L/min |
| Light | 5000–20000 lux |

## Agent behavior

### SiteAgent (per site)

State machine (conceptual): **Idle → Acting** while an anomaly is sticky; returns to **Monitoring/Idle** after local success or passes control upward.

Loop each orchestrator tick (~30 s):

1. Receive latest `SensorReading` (+ optional injected anomaly metadata from simulator).
2. If all sensors in range → reset internal attempt counters.
3. If out of range → increment remediation attempt (max **3**).
   - **Auto-resolvable** anomalies (simulator flag): attempt **2** succeeds → log success; simulator clears sticky reading.
   - **Non-auto-resolvable**: attempts **1–3** fail → build **handoff** payload for orchestrator.

Logged actions are examples such as: `Adjusted HVAC setpoint to 22°C`, `Increased irrigation flow 15%`, `Extended photoperiod 45 minutes`.

**SiteAgents never call PagerDuty.**

### OrchestratorAgent

1. Runs every site each tick through `SensorSimulator` + `SiteAgent`.
2. On **handoff** (site exhausted automation):
   - Records a sliding **20-minute** window of `{ siteId, anomalyKind }`.
   - If **≥2 distinct sites** share the same anomaly kind in that window → severity is bumped toward **`critical`** (correlated incident).
   - Persists an `Incident` with `status: "escalated"` and fires **PagerDuty Events API v2** `trigger` (or enqueues when offline).
   - Clears simulator sticky state so the site can generate new telemetry cycles.
3. **Human escalation** is defined as that PagerDuty trigger (or queued equivalent). No separate human channel in code.

### Offline resilience

- Set `AGENT_OFFLINE=true` or provide `AGENT_CONNECTIVITY_URL` that fails probing → outbound events go to `.urbanfarm/outbound-events.json`.
- When connectivity is restored, `flushQueueSoon()` drains the queue via [`pagerduty.ts`](pagerduty.ts).

## HTTP API (Member 3)

Implemented under [`app/api/incidents/`](../app/api/incidents/):

- `GET /api/incidents?siteId={id}` → `Incident[]` (newest first).
- `POST /api/incidents/{id}/resolve` → `{ "status": "resolved" }`; updates store and sends Events API **`resolve`** with `dedup_key` = incident id (see `pagerdutyIncidentId` field).

Frontend switches off mocks with `NEXT_PUBLIC_USE_MOCKS=false` in [`lib/api.ts`](../lib/api.ts).

## PagerDuty — application integration (Events API v2)

Official reference: [Send an alert event (Events API v2)](https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTgx-send-an-alert-event).

1. Create an **Events API v2** integration in PagerDuty and copy the **integration key** (routing key).
2. Put it in `.env.local` as **`PAGERDUTY_ROUTING_KEY`**.
3. Set **`PAGERDUTY_MOCK=true`** for demos without network credentials (default in `.env.example`).
4. UrbanFarm sends:
   - **`trigger`** on orchestrator escalation with `dedup_key = incident.id`, `custom_details` including site id, sensor snapshot, actions attempted, severity.
   - **`resolve`** when `POST /api/incidents/{id}/resolve` succeeds (or when queued flush runs).

Severity mapping: `low→info`, `medium→warning`, `high→error`, `critical→critical`.

## Optional: PagerDuty Remote MCP (developer tooling)

This does **not** replace Events API v2 for the app. It connects Cursor / VS Code to PagerDuty-hosted MCP tools.

Docs: [Remote MCP Server Setup](https://pagerduty.github.io/pagerduty-mcp-server/docs/remote-server/setup).

Example Cursor fragment (`~/.cursor/mcp.json` or project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "pagerduty": {
      "url": "https://mcp.pagerduty.com/mcp"
    }
  }
}
```

Use API-key auth with header `Authorization: Token token=<PAGERDUTY_API_KEY>` per PagerDuty docs. EU tenants: `https://mcp.eu.pagerduty.com/mcp`.

## Running locally

From `agents_day/`:

```bash
npm run dev                 # Next.js (incidents API)
npm run agents:dev          # Background simulator + agents (separate terminal)
```

Ensure `.env.local` exists if you toggle mocks or PagerDuty modes. Persisted data lives in **`.urbanfarm/`** (gitignored).

## Notes for teammates

- **Member 2 / API layout:** Incident routes live under [`app/api/incidents/`](../app/api/incidents/) as documented in [`app/api/README.md`](../app/api/README.md).
- **`PAGERDUTY_API_KEY`** in `.env.example` is for REST/MCP-style tokens only — **not** the Events routing key.
