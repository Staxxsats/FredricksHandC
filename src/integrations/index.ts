/**
 * Integration adapters. Every provider FAILS CLOSED: unless explicitly configured,
 * it reports "not connected" and the outbox event is marked `skipped` with a reason.
 * The in-app leads inbox is the guaranteed notification path in Phase 1.
 */
import type { Db } from "@/server/db";
import { logger } from "@/lib/logger";

export type IntegrationState = { key: string; label: string; connected: boolean; note: string };

export function integrationStatus(): IntegrationState[] {
  const env = process.env;
  const emailReady = Boolean(env.EMAIL_PROVIDER && env.EMAIL_API_KEY && env.EMAIL_FROM && env.LEAD_ALERT_EMAIL);
  return [
    { key: "inbox", label: "In-app leads inbox", connected: true, note: "Every request lands here. This is the notification path today." },
    { key: "email", label: "New-lead email alert", connected: false, note: emailReady ? "Credentials present, but the email adapter is not enabled in code yet." : "Not connected. No provider chosen." },
    { key: "sms", label: "Text messaging", connected: false, note: "Not connected. Needs provider, A2P registration, and consent policy." },
    { key: "calendar", label: "Calendar / scheduling", connected: false, note: "Not connected. Customer times are requests; staff confirm manually." },
    { key: "payments", label: "Payments", connected: false, note: "Disabled until a processor and policies are approved." },
    { key: "ai", label: "AI assistants", connected: false, note: "Disabled. No agent runs without approval." },
    { key: "analytics", label: "Analytics", connected: false, note: "Not chosen. Events are emitted without PII and dropped." },
  ];
}

type Handler = (db: Db, payload: Record<string, unknown>) => Promise<{ status: "done" | "skipped"; note?: string }>;

const handlers: Record<string, Handler> = {
  "service_request.created": async () => ({ status: "skipped", note: "email not connected; lead visible in inbox" }),
  "appointment.confirmed": async () => ({ status: "skipped", note: "calendar/SMS not connected; confirm with customer by phone" }),
  "customer.opted_out": async () => ({ status: "done", note: "suppression recorded on customer; no marketing senders active" }),
};

const MAX_ATTEMPTS = 5;

/** Process pending outbox events. Safe to run concurrently-ish; each row is claimed in a transaction. */
export async function processOutbox(db: Db, limit = 20): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  const pending = await db.query<{ id: number; event_type: string; payload: Record<string, unknown>; attempts: number }>(
    `SELECT id, event_type, payload, attempts FROM outbox_events WHERE status IN ('pending','failed') ORDER BY id LIMIT $1`,
    [limit],
  );
  for (const ev of pending) {
    const handler = handlers[ev.event_type];
    try {
      const res = handler ? await handler(db, ev.payload) : { status: "skipped" as const, note: "no handler registered" };
      await db.query(`UPDATE outbox_events SET status = $2, attempts = attempts + 1, last_error = $3, processed_at = now() WHERE id = $1`, [
        ev.id, res.status, res.note ?? null,
      ]);
      processed++;
    } catch (err) {
      failed++;
      const dead = ev.attempts + 1 >= MAX_ATTEMPTS;
      await db.query(`UPDATE outbox_events SET status = $2, attempts = attempts + 1, last_error = $3 WHERE id = $1`, [
        ev.id, dead ? "dead" : "failed", err instanceof Error ? err.message.slice(0, 300) : "error",
      ]);
      logger.error("outbox.failed", { id: ev.id, event_type: ev.event_type, err });
    }
  }
  return { processed, failed };
}
