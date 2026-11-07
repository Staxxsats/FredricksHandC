"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/server/db";
import { authenticate, createSession, destroySession, SESSION_COOKIE } from "@/server/auth";
import { requireUser } from "@/server/session";
import { hitRateLimit } from "@/server/intake";
import { transitionLead, assignLead, setFollowUp, logContact, markDuplicate, recordConsent, AuthzError, ValidationError } from "@/server/leads";
import { addZip, setZipActive, setCategoryEnabled, runOutbox } from "@/server/settings";
import { LEAD_STATUSES, type LeadStatus } from "@/domain/lead-status";
import { hashIp } from "@/lib/ip";
import { parseLocalNY } from "@/lib/time";
import { logger } from "@/lib/logger";

export async function loginAction(_: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");
  const db = await getDb();
  const h = await headers();
  if (await hitRateLimit(db, `login:${hashIp(h)}`, 10, 15 * 60 * 1000)) return { error: "Too many attempts. Wait 15 minutes and try again." };
  const user = await authenticate(db, email, password);
  if (!user) return { error: "That email and password don't match." };
  const { token, expiresAt } = await createSession(db, user.id);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  await db.query(`INSERT INTO audit_events (actor_type, actor_id, entity, entity_id, action) VALUES ('user',$1,'user',$1,'auth.login')`, [user.id]);
  redirect("/admin");
}

export async function logoutAction() {
  const c = await cookies();
  await destroySession(await getDb(), c.get(SESSION_COOKIE)?.value);
  c.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/** Runs a staff mutation and redirects back with a short message. */
async function run(back: string, fn: () => Promise<unknown>, okMsg: string) {
  let target = `${back}?ok=${encodeURIComponent(okMsg)}`;
  try {
    await fn();
  } catch (err) {
    if (err instanceof AuthzError || err instanceof ValidationError) target = `${back}?err=${encodeURIComponent(err.message)}`;
    else {
      logger.error("admin.action_failed", { err });
      target = `${back}?err=${encodeURIComponent("Something went wrong. Nothing was changed.")}`;
    }
  }
  revalidatePath(back);
  redirect(target);
}

const leadPath = (form: FormData) => {
  const id = String(form.get("leadId") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ValidationError("Bad lead id");
  return { id, back: `/admin/leads/${id}` };
};

export async function transitionAction(form: FormData) {
  const user = await requireUser();
  const { id, back } = leadPath(form);
  const to = String(form.get("to")) as LeadStatus;
  if (!LEAD_STATUSES.includes(to)) redirect(`${back}?err=Unknown+status`);
  const when = form.get("scheduledFor") ? parseLocalNY(String(form.get("scheduledFor"))) : undefined;
  await run(back, async () => transitionLead(await getDb(), user, id, to, { reason: String(form.get("reason") || "") || undefined, scheduledFor: when ?? undefined }), "Status updated");
}

export async function assignAction(form: FormData) {
  const user = await requireUser();
  const { id, back } = leadPath(form);
  const assignee = String(form.get("assignee") || "") || null;
  await run(back, async () => assignLead(await getDb(), user, id, assignee), "Assignment saved");
}

export async function followUpAction(form: FormData) {
  const user = await requireUser();
  const { id, back } = leadPath(form);
  const due = form.get("dueAt") ? parseLocalNY(String(form.get("dueAt"))) : null;
  await run(back, async () => setFollowUp(await getDb(), user, id, String(form.get("nextStep") || ""), due), "Follow-up saved");
}

export async function contactAction(form: FormData) {
  const user = await requireUser();
  const { id, back } = leadPath(form);
  await run(back, async () => logContact(await getDb(), user, id, String(form.get("channel")), String(form.get("summary") || "")), "Contact logged");
}

export async function duplicateAction(form: FormData) {
  const user = await requireUser();
  const { id, back } = leadPath(form);
  await run(back, async () => markDuplicate(await getDb(), user, id, String(form.get("ofRef") || "")), "Marked as duplicate");
}

export async function consentAction(form: FormData) {
  const user = await requireUser();
  const { id, back } = leadPath(form);
  const kind = String(form.get("kind")) === "service_contact" ? "service_contact" : "marketing";
  await run(back, async () => recordConsent(await getDb(), user, id, kind, form.get("granted") === "true"), "Consent updated");
}

export async function addZipAction(form: FormData) {
  const user = await requireUser();
  await run("/admin/settings", async () => addZip(await getDb(), user, String(form.get("zip") || ""), String(form.get("label") || "")), "ZIP added");
}

export async function toggleZipAction(form: FormData) {
  const user = await requireUser();
  await run("/admin/settings", async () => setZipActive(await getDb(), user, String(form.get("zip")), form.get("active") === "true"), "ZIP updated");
}

export async function toggleCategoryAction(form: FormData) {
  const user = await requireUser();
  await run("/admin/settings", async () => setCategoryEnabled(await getDb(), user, String(form.get("slug")), form.get("enabled") === "true"), "Category updated");
}

export async function runOutboxAction() {
  const user = await requireUser();
  await run("/admin/settings", async () => runOutbox(await getDb(), user), "Automation queue processed");
}
