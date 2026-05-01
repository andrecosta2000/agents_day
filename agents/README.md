# Agents & PagerDuty — Member 2

**Branch:** `feat/agents`  
**Owner:** Member 2  
**Purpose:** Autonomous on-site agents, multi-agent orchestration, and PagerDuty incident integration.

## Files to Build

| File | Status | Description |
|------|--------|-------------|
| `simulator.ts` | [ ] | Generates sensor readings, injects anomalies |
| `SiteAgent.ts` | [ ] | On-site agent: monitor → diagnose → act → escalate |
| `Orchestrator.ts` | [ ] | Coordinates multiple SiteAgents, detects cross-site patterns |
| `pagerduty.ts` | [ ] | PagerDuty Events API v2 integration |
| `eventQueue.ts` | [ ] | Offline-capable local event queue (JSON/SQLite) |
| `incidentStore.ts` | [ ] | In-memory + persisted incident store |

## Agent Behavior

```
SiteAgent loop (runs every 30s):
  1. Read sensor data from simulator
  2. Check all values against thresholds
  3. If anomaly detected:
     a. Attempt automated fix (up to 3 tries)
     b. If resolved → log success, close incident
     c. If not resolved → escalate to Orchestrator
  4. Orchestrator decides: cross-site pattern? → PagerDuty
```

## Sensor Thresholds

| Sensor | Normal Range |
|--------|-------------|
| Temperature | 18–28°C |
| Humidity | 60–80% |
| pH | 5.5–6.5 |
| Water flow | 2–10 L/min |
| Light | 5000–20000 lux |

## PagerDuty Integration

Uses [Events API v2](https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTgx-send-an-alert-event).

Set `PAGERDUTY_MOCK=true` in `.env.local` to log incidents locally instead of calling PagerDuty.

Incident payload includes:
- Site ID and name
- Sensor snapshot at time of anomaly
- All agent actions attempted
- Severity mapped from: `low→info`, `medium→warning`, `high→error`, `critical→critical`

## Offline Resilience

Events are written to a local queue file (`/tmp/urbanfarm-queue.json`) first, then synced to PagerDuty when connectivity is available. The SiteAgent checks connectivity before syncing.

## API Routes Provided

These routes are registered in `/app/api/` — coordinate with Member 2 on file placement:

```
GET  /api/incidents?siteId={id}  → Incident[]
POST /api/incidents/{id}/resolve → { status }
```

## Notes

_Use this section to communicate changes to teammates._
