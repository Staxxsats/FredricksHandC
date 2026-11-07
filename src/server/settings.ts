import { can, type StaffUser } from "./auth.ts";
import type { Db, Queryable } from "./db.ts";
import { AuthzError, ValidationError } from "./leads.ts";
import { integrationStatus, processOutbox } from "@/integrations";

export async function getSettings(db: Queryable, user: StaffUser) {
  if (!can(user, "settings:manage")) throw new AuthzError();
  const [zips, categories, outbox, outboxCounts] = await Promise.all([
    db.query<{ zip: string; label: string | null; active: boolean }>(`SELECT zip, label, active FROM service_zips ORDER BY zip`),
    db.query<{ slug: string; label: string; public_enabled: boolean }>(`SELECT slug, label, public_enabled FROM service_categories ORDER BY sort_order`),
    db.query<{ id: number; event_type: string; status: string; attempts: number; last_error: string | null; created_at: string }>(
      `SELECT id, event_type, status, attempts, last_error, created_at FROM outbox_events ORDER BY id DESC LIMIT 25`,
    ),
    db.query<{ status: string; n: number }>(`SELECT status, count(*)::int AS n FROM outbox_events GROUP BY status`),
  ]);
  return { zips, categories, outbox, outboxCounts, integrations: integrationStatus() };
}

async function audit(q: Queryable, user: StaffUser, entity: string, id: string, action: string, data: object) {
  await q.query(`INSERT INTO audit_events (actor_type, actor_id, entity, entity_id, action, data) VALUES ('user',$1,$2,$3,$4,$5)`, [
    user.id, entity, id, action, JSON.stringify(data),
  ]);
}

export async function addZip(db: Db, user: StaffUser, zip: string, label: string) {
  if (!can(user, "settings:manage")) throw new AuthzError();
  if (!/^\d{5}$/.test(zip.trim())) throw new ValidationError("ZIP must be 5 digits");
  await db.tx(async (q) => {
    await q.query(`INSERT INTO service_zips (zip, label, active) VALUES ($1,$2,true) ON CONFLICT (zip) DO UPDATE SET active = true, label = EXCLUDED.label`, [
      zip.trim(), label.trim() || null,
    ]);
    await audit(q, user, "service_zip", zip.trim(), "service_zip.enabled", { label });
  });
}

export async function setZipActive(db: Db, user: StaffUser, zip: string, active: boolean) {
  if (!can(user, "settings:manage")) throw new AuthzError();
  await db.tx(async (q) => {
    await q.query(`UPDATE service_zips SET active = $2 WHERE zip = $1`, [zip, active]);
    await audit(q, user, "service_zip", zip, active ? "service_zip.enabled" : "service_zip.disabled", {});
  });
}

export async function setCategoryEnabled(db: Db, user: StaffUser, slug: string, enabled: boolean) {
  if (!can(user, "settings:manage")) throw new AuthzError();
  await db.tx(async (q) => {
    await q.query(`UPDATE service_categories SET public_enabled = $2 WHERE slug = $1`, [slug, enabled]);
    await audit(q, user, "service_category", slug, enabled ? "category.enabled" : "category.disabled", {});
  });
}

export async function runOutbox(db: Db, user: StaffUser) {
  if (!can(user, "settings:manage")) throw new AuthzError();
  return processOutbox(db);
}
