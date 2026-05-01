/**
 * Offline-capable Event Queue
 *
 * PagerDuty events are written to a local JSON file before being sent so
 * that no alert is lost when the network is unavailable.  A sync loop
 * (started lazily on first enqueue) retries pending events every 30 s.
 *
 * Queue file: /tmp/urbanfarm-queue.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const QUEUE_PATH =
  process.env.EVENT_QUEUE_PATH ?? "/tmp/urbanfarm-queue.json";

const SYNC_INTERVAL_MS = 30_000;
const PAGERDUTY_EVENTS_URL = "https://events.pagerduty.com/v2/enqueue";

// ── Queue entry ──────────────────────────────────────────────────────────

export type QueuedEventStatus = "pending" | "sent" | "failed";

export interface QueuedEvent {
  id: string;
  payload: PagerDutyEventPayload;
  enqueuedAt: string;
  status: QueuedEventStatus;
  attempts: number;
  lastAttemptAt?: string;
  error?: string;
}

// ── PagerDuty Events API v2 payload shape ─────────────────────────────────

export interface PagerDutyEventPayload {
  routing_key: string;
  event_action: "trigger" | "acknowledge" | "resolve";
  dedup_key?: string;
  payload?: {
    summary: string;
    severity: "info" | "warning" | "error" | "critical";
    source: string;
    timestamp?: string;
    custom_details?: Record<string, unknown>;
  };
  links?: Array<{ href: string; text: string }>;
  images?: Array<{ src: string; href?: string; alt?: string }>;
  client?: string;
  client_url?: string;
}

// ── In-memory queue (mirrors the file) ───────────────────────────────────

let queue: QueuedEvent[] = [];
let queueLoaded = false;
let syncTimer: ReturnType<typeof setInterval> | null = null;

async function loadQueue(): Promise<void> {
  if (queueLoaded) return;
  queueLoaded = true;
  try {
    const raw = await fs.readFile(QUEUE_PATH, "utf8");
    queue = JSON.parse(raw) as QueuedEvent[];
  } catch {
    queue = [];
  }
}

async function saveQueue(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(QUEUE_PATH), { recursive: true });
    await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2), "utf8");
  } catch (err) {
    console.warn(`[eventQueue] save failed: ${(err as Error).message}`);
  }
}

// ── Connectivity check ────────────────────────────────────────────────────

async function isConnected(): Promise<boolean> {
  try {
    const res = await fetch("https://events.pagerduty.com", {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

// ── Delivery ─────────────────────────────────────────────────────────────

async function deliverEvent(event: QueuedEvent): Promise<void> {
  const mock = process.env.PAGERDUTY_MOCK !== "false";

  if (mock) {
    console.log(
      `[pagerduty:mock] ${event.payload.event_action.toUpperCase()} ` +
        `dedup_key=${event.payload.dedup_key ?? "—"} ` +
        `summary="${event.payload.payload?.summary ?? "—"}"`,
    );
    event.status = "sent";
    return;
  }

  const apiKey = process.env.PAGERDUTY_API_KEY;
  if (!apiKey) throw new Error("PAGERDUTY_API_KEY not configured");

  const payload = { ...event.payload, routing_key: apiKey };

  const res = await fetch(PAGERDUTY_EVENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PagerDuty HTTP ${res.status}: ${body}`);
  }
}

// ── Sync loop ─────────────────────────────────────────────────────────────

async function syncPending(): Promise<void> {
  const pending = queue.filter((e) => e.status === "pending");
  if (pending.length === 0) return;

  const connected = await isConnected();
  if (!connected) {
    console.warn(`[eventQueue] offline — ${pending.length} events queued`);
    return;
  }

  for (const event of pending) {
    event.attempts += 1;
    event.lastAttemptAt = new Date().toISOString();
    try {
      await deliverEvent(event);
      event.status = "sent";
    } catch (err) {
      event.error = (err as Error).message;
      if (event.attempts >= 5) {
        event.status = "failed";
        console.error(`[eventQueue] giving up on event ${event.id}: ${event.error}`);
      }
    }
  }

  await saveQueue();
}

function startSyncLoop(): void {
  if (syncTimer) return;
  syncTimer = setInterval(() => {
    void syncPending();
  }, SYNC_INTERVAL_MS);
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Add a PagerDuty event to the queue and attempt immediate delivery.
 * Returns the queued event ID.
 */
export async function enqueue(payload: PagerDutyEventPayload): Promise<string> {
  await loadQueue();

  const event: QueuedEvent = {
    id: randomUUID(),
    payload,
    enqueuedAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
  };

  queue.push(event);
  await saveQueue();

  // Attempt immediate delivery — fall through to sync loop on failure.
  try {
    await deliverEvent(event);
    await saveQueue();
  } catch (err) {
    event.error = (err as Error).message;
    console.warn(`[eventQueue] immediate delivery failed, will retry: ${event.error}`);
    await saveQueue();
  }

  startSyncLoop();
  return event.id;
}

/** Return all queued events (for observability). */
export async function getQueue(): Promise<QueuedEvent[]> {
  await loadQueue();
  return [...queue];
}

/** Remove sent/failed events older than `maxAgeMs`. */
export async function pruneQueue(maxAgeMs = 7 * 24 * 3600 * 1000): Promise<void> {
  await loadQueue();
  const cutoff = Date.now() - maxAgeMs;
  queue = queue.filter(
    (e) =>
      e.status === "pending" ||
      new Date(e.enqueuedAt).getTime() > cutoff,
  );
  await saveQueue();
}
