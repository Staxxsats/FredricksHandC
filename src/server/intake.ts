/**
 * Public service-request intake. Everything for one request is written in a single
 * transaction (customer, property, lead, request, consents, audit, outbox) BEFORE the
 * customer sees a success message.
 */
import { consentText } from "@/config/business";
import { serviceRequestSchema, detectSafetyConcern, generateRef, inferSource } from "@/domain/request";
import type { Db, Queryable } from "./db.ts";
import { logger } from "@/lib/logger";

export type IntakeResult =
  | { ok: true; ref: string; replay: boolean; safetyFlag: boolean }
  | { ok: false; code: "invalid"; fieldErrors: Record<string, string> }
  | { ok: false; code: "out_of_area" | "category_unavailable" | "rate_limited" | "rejected" };

const MIN_FILL_MS = 4000;
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const DUPLICATE_WINDOW_DAYS = 14;

export async function isZipEligible(db: Queryable, zip: string): Promise<boolean> {
  const rows = await db.query(`SELECT 1 FROM service_zips WHERE zip = $1 AND active`, [zip]);
  return rows.length > 0;
}

export async function enabledCategories(db: Queryable): Promise<string[]> {
  const rows = await db.query<{ slug: string }>(`SELECT slug FROM service_categories WHERE public_enabled ORDER BY sort_order`);
  return rows.map((r) => r.slug);
}

/** Fixed-window rate limit keyed by a salted IP hash (raw IPs are never stored). */
export async function hitRateLimit(db: Queryable, key: string, max = RATE_LIMIT.max, windowMs = RATE_LIMIT.windowMs): Promise<boolean> {
  const rows = await db.query<{ count: number }>(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, now(), 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - ($2 || ' milliseconds')::interval THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - ($2 || ' milliseconds')::interval THEN now() ELSE rate_limits.window_start END
     RETURNING count`,
    [key, String(windowMs)],
  );
  return rows[0].count > max;
}

export async function submitServiceRequest(
  db: Db,
  raw: unknown,
  ctx: { ipHash: string; now?: number },
): Promise<IntakeResult> {
  const parsed = serviceRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path.join(".") || "_";
      if (k === "website") return { ok: false, code: "rejected" }; // honeypot tripped
      fieldErrors[k] ??= i.message;
    }
    return { ok: false, code: "invalid", fieldErrors };
  }
  const v = parsed.data;
  const now = ctx.now ?? Date.now();

  // Idempotent replay: same key returns the original reference, never a second record.
  const existing = await db.query<{ ref: string; safety_flag: boolean }>(
    `SELECT l.ref, l.safety_flag FROM service_requests r JOIN leads l ON l.id = r.lead_id WHERE r.idempotency_key = $1`,
    [v.idempotencyKey],
  );
  if (existing[0]) return { ok: true, ref: existing[0].ref, replay: true, safetyFlag: existing[0].safety_flag };

  if (now - v.startedAt < MIN_FILL_MS || v.startedAt > now + 60_000) return { ok: false, code: "rejected" };
  if (await hitRateLimit(db, `intake:${ctx.ipHash}`)) return { ok: false, code: "rate_limited" };
  if (!(await isZipEligible(db, v.zip))) return { ok: false, code: "out_of_area" };
  if (!(await enabledCategories(db)).includes(v.issue)) return { ok: false, code: "category_unavailable" };

  const safetyFlag = v.safetyConcern || detectSafetyConcern(v.notes);
  const utm = v.attribution.utm ?? {};
  const source = inferSource(utm, v.attribution.referrer);
  let referrerHost: string | null = null;
  try {
    referrerHost = v.attribution.referrer ? new URL(v.attribution.referrer).hostname : null;
  } catch {}

  try {
    const ref = await db.tx(async (q) => {
      // Reuse an existing customer record with the same phone; update email if newly provided.
      const cust = await q.query<{ id: string }>(`SELECT id FROM customers WHERE phone = $1 ORDER BY created_at DESC LIMIT 1`, [v.phone]);
      let customerId = cust[0]?.id;
      if (customerId) {
        await q.query(`UPDATE customers SET email = COALESCE(email, $2) WHERE id = $1`, [customerId, v.email ?? null]);
      } else {
        customerId = (await q.query<{ id: string }>(
          `INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3) RETURNING id`,
          [v.name, v.phone, v.email ?? null],
        ))[0].id;
      }

      const propertyId = (await q.query<{ id: string }>(
        `INSERT INTO properties (customer_id, street, unit, city, zip, property_type, relationship)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [customerId, v.street, v.unit || null, v.city || null, v.zip, v.propertyType, v.relationship],
      ))[0].id;

      // Flag (never discard) likely duplicates: same phone, open lead in the last 14 days.
      const dup = await q.query<{ id: string }>(
        `SELECT l.id FROM leads l JOIN customers c ON c.id = l.customer_id
         WHERE c.phone = $1 AND l.status NOT IN ('closed','ineligible','duplicate')
           AND l.requested_at > now() - ($2 || ' days')::interval
         ORDER BY l.requested_at ASC LIMIT 1`,
        [v.phone, String(DUPLICATE_WINDOW_DAYS)],
      );

      let ref = generateRef();
      for (let i = 0; i < 5; i++) {
        const clash = await q.query(`SELECT 1 FROM leads WHERE ref = $1`, [ref]);
        if (!clash.length) break;
        ref = generateRef();
      }

      const leadId = (await q.query<{ id: string }>(
        `INSERT INTO leads (ref, customer_id, property_id, channel, source, utm, referrer_host, landing_path,
                            issue, urgency, zip_eligible, safety_flag, duplicate_of)
         VALUES ($1,$2,$3,'web',$4,$5,$6,$7,$8,$9,true,$10,$11) RETURNING id`,
        [ref, customerId, propertyId, source, JSON.stringify(utm), referrerHost, v.attribution.landingPath ?? null,
         v.issue, v.urgency, safetyFlag, dup[0]?.id ?? null],
      ))[0].id;

      await q.query(
        `INSERT INTO service_requests (lead_id, idempotency_key, issue, notes, system_running, urgency, zip,
                                       system_type, system_age, preferred_day, preferred_window, tenant_contact)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [leadId, v.idempotencyKey, v.issue, v.notes || null, v.systemRunning, v.urgency, v.zip,
         v.systemType ?? null, v.systemAge ?? null, v.preferredDay ?? null, v.preferredWindow ?? null, v.tenantContact || null],
      );

      for (const kind of ["service_contact", "marketing"] as const) {
        const granted = kind === "service_contact" ? v.consentService : v.consentMarketing;
        await q.query(
          `INSERT INTO consents (customer_id, lead_id, kind, granted, text_version, text_shown, source)
           VALUES ($1,$2,$3,$4,$5,$6,'web_form')`,
          [customerId, leadId, kind, granted, consentText[kind].version, consentText[kind].text],
        );
      }

      await q.query(
        `INSERT INTO audit_events (actor_type, entity, entity_id, action, to_status, data)
         VALUES ('customer', 'lead', $1, 'lead.created', 'new', $2)`,
        [leadId, JSON.stringify({ source, issue: v.issue, urgency: v.urgency, duplicate_of: dup[0]?.id ?? null, safety_flag: safetyFlag })],
      );

      // Outbox payload carries IDs only; notification adapters look up what they need.
      await q.query(
        `INSERT INTO outbox_events (event_type, idempotency_key, payload) VALUES ('service_request.created', $1, $2)`,
        [`service_request.created:${leadId}`, JSON.stringify({ lead_id: leadId, ref })],
      );
      return ref;
    });
    return { ok: true, ref, replay: false, safetyFlag };
  } catch (err) {
    // Concurrent double-submit: the unique idempotency key lost the race. Return the winner.
    const again = await db.query<{ ref: string; safety_flag: boolean }>(
      `SELECT l.ref, l.safety_flag FROM service_requests r JOIN leads l ON l.id = r.lead_id WHERE r.idempotency_key = $1`,
      [v.idempotencyKey],
    );
    if (again[0]) return { ok: true, ref: again[0].ref, replay: true, safetyFlag: again[0].safety_flag };
    logger.error("intake.failed", { err });
    throw err;
  }
}
