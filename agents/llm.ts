/**
 * Lightweight LLM client used by `SiteAgent` to draft remediation actions.
 *
 * Talks to a Groq-hosted Llama model via the OpenAI-compatible REST endpoint
 * — no extra SDK install required. The provider is intentionally narrow:
 * one structured-output call, ~5s timeout, fail-soft. If anything goes wrong
 * (no key, HTTP error, malformed JSON, network blocked) we return `null` and
 * the caller falls back to its deterministic action ladder.
 *
 * Configure with:
 *   GROQ_API_KEY=gsk_...        # https://console.groq.com/keys (free, no card)
 *   GROQ_MODEL=...              # optional, defaults below
 *   AGENT_LLM_DISABLED=true     # demo kill-switch
 */
import type { AgentAction, SensorReading } from "@/types/interfaces";
import type { AnomalyKind } from "./thresholds";
import { THRESHOLDS } from "./thresholds";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const TIMEOUT_MS = 5_000;

export interface RemediationInput {
	siteId: string;
	reading: SensorReading;
	anomalyKind: AnomalyKind;
	attemptNumber: 1 | 2 | 3;
	priorActions: AgentAction[];
}

export interface RemediationDecision {
	action: string;
	rationale: string;
}

const SYSTEM_PROMPT = `You are an autonomous on-site operations agent for an indoor vertical farm.

Your job: when a sensor reading is out of acceptable range, propose ONE specific physical/control remediation action a building automation system can execute right now (e.g. "Drop HVAC setpoint to 21°C", "Pulse irrigation line for 90 seconds", "Increase LED PAR drive 5%").

Hard rules:
- Output ONLY a single JSON object: {"action": "<imperative sentence, ≤90 chars>", "rationale": "<one short sentence explaining the expected effect, ≤140 chars>"}.
- Do NOT include markdown, prose, or any text outside the JSON object.
- Never repeat (or trivially rephrase) any action listed under "Previously failed attempts".
- The action MUST target the specific anomaly kind given. Don't drift to other sensors.
- Be concrete: name a setpoint, duty cycle, valve, or duration where reasonable.`;

const KIND_LABELS: Record<AnomalyKind, string> = {
	temp: "Air temperature",
	humidity: "Relative humidity",
	ph: "Irrigation pH",
	waterFlow: "Water flow",
	light: "PAR / lux",
};

function thresholdRangeFor(kind: AnomalyKind): string {
	switch (kind) {
		case "temp":
			return `${THRESHOLDS.tempC.min}–${THRESHOLDS.tempC.max} °C`;
		case "humidity":
			return `${THRESHOLDS.humidityPct.min}–${THRESHOLDS.humidityPct.max} % RH`;
		case "ph":
			return `${THRESHOLDS.ph.min}–${THRESHOLDS.ph.max} pH`;
		case "waterFlow":
			return `${THRESHOLDS.waterFlowLPerMin.min}–${THRESHOLDS.waterFlowLPerMin.max} L/min`;
		case "light":
			return `${THRESHOLDS.lightLux.min}–${THRESHOLDS.lightLux.max} lux`;
	}
}

function currentValueFor(kind: AnomalyKind, r: SensorReading): string {
	switch (kind) {
		case "temp":
			return `${r.tempC.toFixed(1)} °C`;
		case "humidity":
			return `${r.humidityPct} % RH`;
		case "ph":
			return `${r.ph} pH`;
		case "waterFlow":
			return `${r.waterFlowLPerMin} L/min`;
		case "light":
			return `${r.lightLux} lux`;
	}
}

function buildUserPrompt(input: RemediationInput): string {
	const { siteId, reading, anomalyKind, attemptNumber, priorActions } = input;
	const failed = priorActions
		.filter((a) => a.result !== "success")
		.map((a, i) => `  ${i + 1}. ${a.action}`)
		.join("\n");

	const lines = [
		`Site: ${siteId}`,
		`Attempt: ${attemptNumber} of 3 (after this we escalate to a human operator).`,
		`Anomaly kind: ${KIND_LABELS[anomalyKind]}`,
		`Current value: ${currentValueFor(anomalyKind, reading)} (acceptable: ${thresholdRangeFor(anomalyKind)})`,
		`Full snapshot: temp=${reading.tempC.toFixed(1)}°C, humidity=${reading.humidityPct}%, pH=${reading.ph}, water=${reading.waterFlowLPerMin}L/min, light=${reading.lightLux}lux`,
		failed
			? `Previously failed attempts (do NOT repeat):\n${failed}`
			: "No previous attempts on this anomaly yet.",
		`Return JSON now.`,
	];
	return lines.join("\n");
}

function extractJsonObject(raw: string): unknown {
	const trimmed = raw.trim();
	try {
		return JSON.parse(trimmed);
	} catch {}
	const start = trimmed.indexOf("{");
	const end = trimmed.lastIndexOf("}");
	if (start === -1 || end === -1 || end <= start) return null;
	try {
		return JSON.parse(trimmed.slice(start, end + 1));
	} catch {
		return null;
	}
}

function isLlmDisabled(): boolean {
	return process.env.AGENT_LLM_DISABLED === "true";
}

/**
 * Ask the model to propose ONE remediation action.
 * Returns `null` on any failure — caller MUST handle that path.
 */
export async function decideRemediation(
	input: RemediationInput,
): Promise<RemediationDecision | null> {
	if (isLlmDisabled()) return null;
	const apiKey = process.env.GROQ_API_KEY;
	if (!apiKey) return null;

	const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const res = await fetch(GROQ_URL, {
			method: "POST",
			signal: controller.signal,
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model,
				temperature: 0.4,
				max_tokens: 220,
				response_format: { type: "json_object" },
				messages: [
					{ role: "system", content: SYSTEM_PROMPT },
					{ role: "user", content: buildUserPrompt(input) },
				],
			}),
		});

		if (!res.ok) {
			const errText = await res.text().catch(() => "");
			console.warn(
				`[llm] groq HTTP ${res.status} site=${input.siteId} kind=${input.anomalyKind} :: ${errText.slice(0, 240)}`,
			);
			return null;
		}

		const json = (await res.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		const content = json.choices?.[0]?.message?.content;
		if (!content) return null;

		const parsed = extractJsonObject(content);
		if (!parsed || typeof parsed !== "object") return null;

		const obj = parsed as { action?: unknown; rationale?: unknown };
		if (typeof obj.action !== "string" || typeof obj.rationale !== "string") {
			return null;
		}
		const action = obj.action.trim();
		const rationale = obj.rationale.trim();
		if (!action || !rationale) return null;

		console.log(
			`[llm] decision site=${input.siteId} kind=${input.anomalyKind} attempt=${input.attemptNumber} :: ${action}`,
		);
		return { action, rationale };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.warn(
			`[llm] decideRemediation threw site=${input.siteId} kind=${input.anomalyKind} :: ${msg}`,
		);
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
}
