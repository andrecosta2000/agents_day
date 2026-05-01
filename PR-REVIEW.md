# PR Review: feat/data → main

## Blockers (must fix before PR)

**1. `mockClimate` seasonal phase is inverted — services/climate.ts:79** ✅ FIXED

The fallback `mockClimate` function produced January-as-hottest and July-as-coldest for
northern-hemisphere cities. The formula `Math.cos(((phase - 6) / 12) * 2 * Math.PI) * -seasonalSwing`
evaluated to `+swing` at phase 0 (Jan) and `-swing` at phase 6 (Jul) — exactly backwards.

**Fix applied:** Removed the negation (`-seasonalSwing` → `seasonalSwing`). July is now
the warmest month and January the coldest for northern hemisphere sites, as expected.
The `monthlySun` formula had the same inversion — also fixed. Additionally, the solar base
sunlight hours now vary by latitude (`10 - absLat * 0.04`) so Berlin and Lisbon produce
meaningfully different solar assessments.

**2. Silent climate fallback hides errors — services/climate.ts:68** ✅ FIXED

`catch { return mockClimate(lat); }` was swallowing all errors silently. The verify
script printed `fetched in 17ms` even when returning mock data, giving no signal that
the real API had failed.

**Fix applied:** Changed to `catch (err) { console.warn(...)` so mock activation is
always visible in logs.

**3. Invalid model name — services/research.ts:10, .env.example, .env.local**

```ts
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
```

`claude-opus-4-7` does not match any current model string. The current flagship is
`claude-opus-4-6`. Both `.env.example` and `.env.local` also have
`ANTHROPIC_MODEL=claude-opus-4-7`. API calls using this model name will fail with a
model-not-found error, meaning live demand research will never work even with a valid
`ANTHROPIC_API_KEY`.

**Fix:** Change the default in `research.ts` and both env files to `claude-opus-4-6`.

**4. PagerDuty integration is entirely unimplemented — agents/**

The user-reported "PagerDuty integration is not working" is because Member 2's entire
work does not exist yet — only `agents/README.md` was committed. All six planned files
are missing:

| File | Status |
|------|--------|
| `agents/simulator.ts` | ❌ not created |
| `agents/SiteAgent.ts` | ❌ not created |
| `agents/Orchestrator.ts` | ❌ not created |
| `agents/pagerduty.ts` | ❌ not created |
| `agents/eventQueue.ts` | ❌ not created |
| `agents/incidentStore.ts` | ❌ not created |

The API route stubs in `/app/api/incidents/` have `TODO (Member 2): replace with
incidentStore` comments throughout. The current PR (`feat/data → main`) does not block
this — Member 2's work should land as a separate PR. However the PR description should
make this dependency explicit so reviewers don't expect a working PagerDuty flow.

## High-priority issues

**5. `thinking: { type: "adaptive" }` is non-standard — services/research.ts:153**

```ts
thinking: { type: "adaptive" },
```

The Anthropic API accepts `"enabled"` or `"disabled"` for the thinking type, not
`"adaptive"`. The TypeScript SDK may accept this value without a compile error while
the API silently ignores or rejects it. Verify this is a valid field value; if not,
change to `{ type: "enabled", budget_tokens: 8000 }` or remove it.

**6. Solar assessment identical for all cities — services/solar.ts + climate.ts mock**

Partially resolved by the climate.ts fix above (sunlight base hours now vary by
latitude). The solar service should be re-tested for Lisbon vs. Berlin to confirm
meaningful differences now propagate.

**7. `seed-cache.ts` labels seeded data as `source: "live"` — line 393**

```ts
source: "live", // labeled as live so frontend treats them like fresh research
```

The comment acknowledges this is intentional, but reviewers and demo audiences will
believe a real Claude API call happened when the data is hand-curated. Consider a
distinct `"seed"` value in `DemandResearchResult.source`, or at minimum document this
more prominently in the README.

**8. `output_config.effort` placement — services/research.ts:151**

```ts
output_config: {
  format: { type: "json_schema", schema: RESEARCH_SCHEMA },
  effort: "medium",
},
```

`tsc` passes (SDK types accept it), but confirm that `effort` is valid inside
`output_config` and not a top-level parameter. If silently ignored, the research agent
may consume more tokens than intended.

## Nice-to-haves

**9. `SITE_REGISTRY` duplicated in three places**

`/api/sites/route.ts`, `/api/sites/deployed/route.ts`, and
`/api/sites/[id]/report/route.ts` all define the same three hardcoded sites.
The existing review noted two — there are actually three. Extracting to
`lib/site-registry.ts` would prevent drift when adding sites.

**10. Mock-data `cropId` prefix mismatch**

Mock `reports.json` uses `"crop-lettuce"`, `"crop-basil"` for `HvacCost.cropId`.
The service layer (`crops.ts`) uses `"lettuce"`, `"basil"`. No runtime impact (mock
and live paths are separate), but it's confusing if someone cross-references.

**11. `SensorGauges` component is orphaned**

`SensorGauges.tsx` renders a `SensorReading` and `getSensorReading()` is wired in
`lib/api.ts`, but no page imports it. Presumably waiting for Member 2. Consider adding
a `// TODO: wire into operations/[id] once incidentStore lands` comment.

## What looks good

- **Type contract is clean.** `tsc --noEmit` passes with strict mode. All frontend
  components import from `@/types/interfaces` and shapes match. Optional `Demand` fields
  (`trend`, `confidence`, `rationale`, `sources`) are correctly optional and mock JSON
  omitting them is valid.

- **Demand resolution path is solid.** `demand.ts` follows cache → live research →
  fallback cleanly, with `console.warn` on live failure and graceful skip when
  `ANTHROPIC_API_KEY` is absent.

- **Prompt caching is correctly structured.** The system prompt in `research.ts` uses
  `cache_control: { type: "ephemeral" }`. The city name is in the user message only,
  so the cache won't be invalidated across cities. `web_search` has `max_uses: 6`.

- **Optimizer LP constraints are wired correctly.** `totalArea`, per-crop demand caps,
  and diversification (`MAX_SHARE_PER_CROP = 0.35`) are all present. Negative-profit
  crops are pruned before solving.

- **ROI math is correct.** Revenue − HVAC − energy − water matches; investment =
  land + fit-out + solar is composed correctly. `breakevenYears = -1` for
  never-profitable cases is handled.

- **`seed-cache.ts` output is structurally identical to live research.** The
  `DemandResearchResult` shape (demands + profiles) matches what `getDemandResearch`
  returns. Cache path naming and `_cachedAt` timestamp match `demand.ts`'s reader.

- **Frontend mock layer is well-designed.** `lib/api.ts` gates every fetch call behind
  `shouldUseApiMocks()` (defaults to `true`). Mock JSON shapes match interface types.
  Frontend renders correctly with `NEXT_PUBLIC_USE_MOCKS=true`.

- **Frontend ↔ service coverage is complete for the feasibility flow.** Every fetch
  call in `lib/api.ts` has a corresponding service or stub: `getSites` ↔ registry,
  `getSiteReport` ↔ full pipeline, `getProduceDemand` ↔ `demand.ts`, incidents/sensors
  are stubs with clear `TODO (Member 2)` markers.

- **Verify script exercises the full pipeline.** All three cities (Lisbon, New York,
  Berlin) complete without errors, produce 3+ crop allocations, positive monthly profit,
  and a finite breakeven.

## Summary: what Member 2 needs to build before PagerDuty works

1. `agents/simulator.ts` — generates sensor readings and injects anomalies
2. `agents/incidentStore.ts` — in-memory + persisted incident store
3. `agents/pagerduty.ts` — Events API v2 wrapper, `PAGERDUTY_MOCK` gate
4. `agents/eventQueue.ts` — offline-safe local queue
5. `agents/SiteAgent.ts` — monitor → diagnose → act → escalate loop
6. `agents/Orchestrator.ts` — cross-site coordination
7. Wire `incidentStore` into `/api/incidents` and `/api/sites/[id]/sensors`
