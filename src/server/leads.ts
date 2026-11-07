/**
 * Office-side lead operations. Every function takes the acting staff user and
 * enforces permissions itself; callers (pages, server actions) cannot skip it.
 */
import { consentText } from "@/config/business";
import { canTransition, REQUIRES, type LeadStatus } from "@/domain/lead-status";
import { can, canViewLead, type StaffUser } from "./auth.ts";
import type { Db, Queryable } from "./db.ts";

export class AuthzError extends Error {
  constructor(msg = "Not allowed") {
    super(msg);
    this.name = "AuthzError";
  }
}
export class ValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "ValidationError";
  }
}

export interface LeadListItem {
  id: string;
  ref: string;
  status: LeadStatus;
  issue: string;
  urgency: string;
  zip: string;
  customer_name: string;
  requested_at: string;
  next_due_at: string | null;
  safety_flag: boolean;
  duplicate_of: string | null;
  assigned_name: string | null;
  source: string;
}

export async function listLeads(db: Queryable, user: StaffUser, opts: { status?: string } = {}): Promise<LeadListItem[]> {
  if (!user) throw new AuthzError();
  const params: unknown[] = [];
  const where: string[] = [];
  if (!can(user, "leads:read_all")) {
    if (user.role !== "technician") throw new AuthzError();
    params.push(user.id);
    where.push(`l.assigned_to = $${params.length}`);
  }
  if (opts.status === "open") where.push(`l.status IN ('new','contacted','qualified')`);
  else if (opts.status && opts.status !== "all") {
    params.push(opts.status);
    where.push(`l.status = $${params.length}`);
  }
  return db.query<LeadListItem>(
    `SELECT l.id, l.ref, l.status, l.issue, l.urgency, r.zip, c.name AS customer_name, l.requested_at, l.next_due_at,
            l.safety_flag, l.duplicate_of, u.name AS assigned_name, l.source
     FROM leads l JOIN customers c ON c.id = l.customer_id
     LEFT JOIN service_requests r ON r.lead_id = l.id
     LEFT JOIN users u ON u.id = l.assigned_to
     ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY (l.status = 'new') DESC, l.safety_flag DESC, l.requested_at DESC
     LIMIT 200`,
    params,
  );
}

export async function dashboardCounts(db: Queryable, user: StaffUser) {
  if (!can(user, "leads:read_all")) throw new AuthzError();
  const [row] = await db.query<Record<string, number>>(
    `SELECT
       count(*) FILTER (WHERE requested_at >= date_trunc('day', now() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York')::int AS today,
       count(*) FILTER (WHERE status = 'new')::int AS uncontacted,
       count(*) FILTER (WHERE status IN ('contacted','qualified'))::int AS awaiting_confirmation,
       count(*) FILTER (WHERE status = 'confirmed' AND (scheduled_for AT TIME ZONE 'America/New_York')::date = (now() AT TIME ZONE 'America/New_York')::date)::int AS confirmed_today,
       count(*) FILTER (WHERE next_due_at IS NOT NULL AND next_due_at <= now() AND status IN ('new','contacted','qualified'))::int AS follow_ups_due,
       count(*) FILTER (WHERE safety_flag AND status = 'new')::int AS safety_new
     FROM leads`,
  );
  return row;
}

export async function getLeadDetail(db: Queryable, user: StaffUser, leadId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return null;
  const rows = await db.query<Record<string, unknown> & { assigned_to: string | null; customer_id: string }>(
    `SELECT l.*, c.name AS customer_name, c.phone, c.email, c.marketing_opted_out_at,
            p.street, p.unit, p.city, p.state, p.property_type, p.relationship,
            r.notes, r.system_running, r.system_type, r.system_age, r.preferred_day, r.preferred_window, r.zip, r.tenant_contact,
            au.name AS assigned_name, cu.name AS confirmed_by_name
     FROM leads l JOIN customers c ON c.id = l.customer_id
     LEFT JOIN properties p ON p.id = l.property_id
     LEFT JOIN service_requests r ON r.lead_id = l.id
     LEFT JOIN users au ON au.id = l.assigned_to
     LEFT JOIN users cu ON cu.id = l.confirmed_by
     WHERE l.id = $1`,
    [leadId],
  );
  const lead = rows[0];
  // Same response for "doesn't exist" and "not yours" so IDs can't be probed.
  if (!lead || !canViewLead(user, lead)) return null;

  const [consents, contacts, audit, duplicates] = await Promise.all([
    db.query<{ kind: string; granted: boolean; text_version: string; source: string; created_at: string }>(
      `SELECT DISTINCT ON (kind) kind, granted, text_version, source, created_at FROM consents
       WHERE customer_id = $1 ORDER BY kind, created_at DESC`,
      [lead.customer_id],
    ),
    db.query<{ channel: string; summary: string; created_at: string; user_name: string }>(
      `SELECT cl.channel, cl.summary, cl.created_at, u.name AS user_name FROM contact_logs cl JOIN users u ON u.id = cl.user_id
       WHERE cl.lead_id = $1 ORDER BY cl.created_at DESC`,
      [leadId],
    ),
    db.query<{ action: string; from_status: string | null; to_status: string | null; reason: string | null; created_at: string; actor: string | null; data: unknown }>(
      `SELECT a.action, a.from_status, a.to_status, a.reason, a.created_at, a.data,
              COALESCE(u.name, a.actor_type) AS actor
       FROM audit_events a LEFT JOIN users u ON a.actor_type = 'user' AND u.id::text = a.actor_id
       WHERE a.entity = 'lead' AND a.entity_id = $1 ORDER BY a.id DESC`,
      [leadId],
    ),
    db.query<{ id: string; ref: string; status: string; requested_at: string }>(
      `SELECT l2.id, l2.ref, l2.status, l2.requested_at FROM leads l2
       WHERE l2.customer_id = $1 AND l2.id <> $2 ORDER BY l2.requested_at DESC LIMIT 10`,
      [lead.customer_id, leadId],
    ),
  ]);
  return { lead, consents, contacts, audit, related: can(user, "leads:read_all") ? duplicates : [] };
}

async function loadForUpdate(q: Queryable, user: StaffUser, leadId: string) {
  if (!can(user, "leads:update")) throw new AuthzError();
  const rows = await q.query<{ id: string; status: LeadStatus; assigned_to: string | null }>(
    `SELECT id, status, assigned_to FROM leads WHERE id = $1 FOR UPDATE`,
    [leadId],
  );
  if (!rows[0]) throw new ValidationError("Lead not found");
  return rows[0];
}

async function audit(q: Queryable, user: StaffUser, leadId: string, action: string, extra: { from?: string; to?: string; reason?: string; data?: object } = {}) {
  await q.query(
    `INSERT INTO audit_events (actor_type, actor_id, entity, entity_id, action, from_status, to_status, reason, data)
     VALUES ('user', $1, 'lead', $2, $3, $4, $5, $6, $7)`,
    [user.id, leadId, action, extra.from ?? null, extra.to ?? null, extra.reason ?? null, JSON.stringify(extra.data ?? {})],
  );
}

export async function transitionLead(
  db: Db,
  user: StaffUser,
  leadId: string,
  to: LeadStatus,
  opts: { reason?: string; scheduledFor?: Date } = {},
) {
  return db.tx(async (q) => {
    const lead = await loadForUpdate(q, user, leadId);
    if (lead.status === to) return;
    if (!canTransition(lead.status, to)) throw new ValidationError(`Can't move a lead from ${lead.status} to ${to}`);
    const needs = REQUIRES[to] ?? [];
    if (needs.includes("reason") && !opts.reason?.trim()) throw new ValidationError("A reason is required");
    if (needs.includes("scheduledFor")) {
      if (!opts.scheduledFor || isNaN(opts.scheduledFor.getTime())) throw new ValidationError("Confirmed date and time are required");
    }
    const sets = ["status = $2", "updated_at = now()"];
    const params: unknown[] = [leadId, to];
    if (to === "contacted") sets.push("contacted_at = COALESCE(contacted_at, now())");
    if (to === "qualified") sets.push("qualified_at = COALESCE(qualified_at, now())");
    if (to === "confirmed") {
      params.push(opts.scheduledFor, user.id);
      sets.push(`confirmed_at = now()`, `scheduled_for = $${params.length - 1}`, `confirmed_by = $${params.length}`);
    }
    if (lead.status === "confirmed" && to !== "confirmed") sets.push("confirmed_at = NULL", "scheduled_for = NULL", "confirmed_by = NULL");
    if (to === "ineligible") {
      params.push(opts.reason);
      sets.push(`ineligible_reason = $${params.length}`);
    }
    await q.query(`UPDATE leads SET ${sets.join(", ")} WHERE id = $1`, params);
    await audit(q, user, leadId, "lead.status_changed", {
      from: lead.status,
      to,
      reason: opts.reason,
      data: opts.scheduledFor ? { scheduled_for: opts.scheduledFor.toISOString() } : {},
    });
    if (to === "confirmed") {
      // Phase 2 adapters (calendar, customer notice) consume this. Disabled providers mark it skipped.
      await q.query(`INSERT INTO outbox_events (event_type, idempotency_key, payload) VALUES ('appointment.confirmed', $1, $2)`, [
        `appointment.confirmed:${leadId}:${opts.scheduledFor!.toISOString()}`,
        JSON.stringify({ lead_id: leadId }),
      ]);
    }
  });
}

export async function assignLead(db: Db, user: StaffUser, leadId: string, assigneeId: string | null) {
  if (!can(user, "leads:assign")) throw new AuthzError();
  return db.tx(async (q) => {
    const lead = await loadForUpdate(q, user, leadId);
    if (assigneeId) {
      const ok = await q.query(`SELECT 1 FROM users WHERE id = $1 AND active`, [assigneeId]);
      if (!ok.length) throw new ValidationError("Unknown staff member");
    }
    await q.query(`UPDATE leads SET assigned_to = $2, updated_at = now() WHERE id = $1`, [leadId, assigneeId]);
    await audit(q, user, leadId, "lead.assigned", { data: { from: lead.assigned_to, to: assigneeId } });
  });
}

export async function setFollowUp(db: Db, user: StaffUser, leadId: string, nextStep: string, dueAt: Date | null) {
  return db.tx(async (q) => {
    await loadForUpdate(q, user, leadId);
    if (nextStep.length > 300) throw new ValidationError("Keep the next step under 300 characters");
    await q.query(`UPDATE leads SET next_step = $2, next_due_at = $3, updated_at = now() WHERE id = $1`, [leadId, nextStep || null, dueAt]);
    await audit(q, user, leadId, "lead.follow_up_set", { data: { next_step: nextStep, due_at: dueAt?.toISOString() ?? null } });
  });
}

export async function logContact(db: Db, user: StaffUser, leadId: string, channel: string, summary: string) {
  if (!["phone", "text", "email", "in_person", "note"].includes(channel)) throw new ValidationError("Pick a contact type");
  if (!summary.trim() || summary.length > 2000) throw new ValidationError("Add a short summary");
  return db.tx(async (q) => {
    await loadForUpdate(q, user, leadId);
    await q.query(`INSERT INTO contact_logs (lead_id, user_id, channel, summary) VALUES ($1,$2,$3,$4)`, [leadId, user.id, channel, summary.trim()]);
    await audit(q, user, leadId, "lead.contact_logged", { data: { channel } });
  });
}

export async function markDuplicate(db: Db, user: StaffUser, leadId: string, ofRef: string) {
  return db.tx(async (q) => {
    const lead = await loadForUpdate(q, user, leadId);
    const target = await q.query<{ id: string }>(`SELECT id FROM leads WHERE ref = $1 AND id <> $2`, [ofRef.trim().toUpperCase(), leadId]);
    if (!target[0]) throw new ValidationError("No other lead with that reference");
    if (!canTransition(lead.status, "duplicate")) throw new ValidationError(`Can't mark a ${lead.status} lead as duplicate`);
    await q.query(`UPDATE leads SET status = 'duplicate', duplicate_of = $2, updated_at = now() WHERE id = $1`, [leadId, target[0].id]);
    await audit(q, user, leadId, "lead.status_changed", { from: lead.status, to: "duplicate", reason: `Duplicate of ${ofRef}` });
  });
}

/** Staff-recorded consent change (e.g. customer asks to stop marketing). Append-only history. */
export async function recordConsent(db: Db, user: StaffUser, leadId: string, kind: "service_contact" | "marketing", granted: boolean) {
  return db.tx(async (q) => {
    await loadForUpdate(q, user, leadId);
    const [{ customer_id }] = await q.query<{ customer_id: string }>(`SELECT customer_id FROM leads WHERE id = $1`, [leadId]);
    await q.query(
      `INSERT INTO consents (customer_id, lead_id, kind, granted, text_version, text_shown, source, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,'staff_update',$7)`,
      [customer_id, leadId, kind, granted, consentText[kind].version, consentText[kind].text, user.id],
    );
    if (kind === "marketing") {
      await q.query(`UPDATE customers SET marketing_opted_out_at = ${granted ? "NULL" : "now()"} WHERE id = $1`, [customer_id]);
      if (!granted) {
        await q.query(`INSERT INTO outbox_events (event_type, idempotency_key, payload) VALUES ('customer.opted_out', $1, $2)`, [
          `customer.opted_out:${customer_id}:${Date.now()}`,
          JSON.stringify({ customer_id }),
        ]);
      }
    }
    await audit(q, user, leadId, "consent.recorded", { data: { kind, granted } });
  });
}

export async function listStaff(db: Queryable, user: StaffUser) {
  if (!can(user, "leads:assign")) throw new AuthzError();
  return db.query<{ id: string; name: string; role: string }>(`SELECT id, name, role FROM users WHERE active ORDER BY name`);
}
