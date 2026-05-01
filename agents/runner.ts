/**
 * Long-running agent supervisor — run from repo root `agents_day`:
 *   npx tsx agents/runner.ts
 * or `npm run agents:dev`
 */

import sites from "@/app/mocks/sites.json";

import { OrchestratorAgent } from "./Orchestrator";
import { SensorSimulator } from "./simulator";

const TICK_MS = 30_000;

async function main(): Promise<void> {
	const siteIds = (sites as { id: string }[]).map((s) => s.id);
	const simulator = new SensorSimulator();
	const orchestrator = new OrchestratorAgent(siteIds, simulator);

	await orchestrator.tick();
	setInterval(() => {
		void orchestrator.tick().catch((err) => {
			console.error("[UrbanFarm agents]", err);
		});
	}, TICK_MS);

	console.log(
		`[UrbanFarm agents] Orchestrator running for ${siteIds.length} site(s); tick every ${TICK_MS / 1000}s.`,
	);
}

void main();
