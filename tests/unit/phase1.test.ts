/**
 * Phase 1 acceptance tests, mapped to spec section 19 "Booking and CRM".
 * Runs against a real (embedded, in-memory) Postgres.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { resetDbForTests, type Db } from "@/server/db";
import { submitServiceRequest } from "@/server/intake";
import { createUser, authenticate, canViewLead, type StaffUser } from "@/server/auth";
import { listLeads, getLeadDetail, transitionLead, assignLead, recordConsent, AuthzError, ValidationError } from "@/server/leads";
import { setCategoryEnabled } from "@/server/settings";
import { processOutbox } from "@/integrations";
import { normalizePhone, detectSafetyConcern, inferSource } from "@/domain/request";
import { canTransition } from "@/domain/lead-status";
import { sanitize } from "@/lib/analytics";
import { logger } from "@/lib/logger";

let db: Db;
let owner: StaffUser, dispatcher: StaffUser, tech: StaffUser, tech2: StaffUser;
let keyN = 0;

function req(overrides: Record<string, unknown> = {}) {
  keyN++;
  return {
    idempotencyKey: `test-key-${String(keyN).padStart(6, "0")}-abcdef`,
    issue: "ac-not-cooling",
    notes: "Upstairs is warm",
    zip: "30078",
    systemRunning: "partially",
    urgency: "asap",
    systemType: "not_sure",
    systemAge: "not_sure",
    propertyType: "home",
    street: "100 Example St",
    unit: "",
    city: "Snellville",
    preferredDay: "2026-11-10",
    preferredWindow: "morning",
    name: "Test Person",
    phone: "(404) 555-0134",
    email: "",
    relationship: "owner",
    tenantContact: "",
    consentService: true,
    consentMarketing: false,
    attribution: { landingPath: "/book?issue=ac-not-cooling", utm: { utm_source: "nextdoor", utm_campaign: "fall" } },
    website: "",
    startedAt: Date.now() - 60_000,
    ...overrides,
  };
}
const ctx = { ipHash: "test-ip" };

beforeEach(async () => {
  db = await resetDbForTests();
  await db.query(`INSERT INTO service_zips (zip, label) VALUES ('30078', 'Test'), ('30039', 'Test')`);
  owner = await createUser(db, { email: "o@example.test", name: "Owner", role: "owner_admin", password: "test-password-123" });
  dispatcher = await createUser(db, { email: "d@example.test", name: "Dispatch", role: "dispatcher", password: "test-password-123" });
  tech = await createUser(db, { email: "t@example.test", name: "Tech", role: "technician", password: "test-password-123" });
  tech2 = await createUser(db, { email: "t2@example.test", name: "Tech2", role: "technician", password: "test-password-123" });
});

describe("1. valid in-area lead saves once with expected values and attribution", () => {
  it("creates customer, property, lead, request, consents, audit and outbox", async () => {
    const r = await submitServiceRequest(db, req(), ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ref).toMatch(/^FHC-[2-9A-HJKMNP-Z]{6}$/);
    const [lead] = await db.query<Record<string, unknown>>(`SELECT * FROM leads WHERE ref = $1`, [r.ref]);
    expect(lead.status).toBe("new");
    expect(lead.source).toBe("nextdoor");
    expect(lead.utm).toEqual({ utm_source: "nextdoor", utm_campaign: "fall" });
    expect(lead.landing_path).toBe("/book?issue=ac-not-cooling");
    expect(lead.confirmed_at).toBeNull();
    const [c] = await db.query<{ phone: string }>(`SELECT phone FROM customers`);
    expect(c.phone).toBe("+14045550134");
    expect((await db.query(`SELECT 1 FROM service_requests`)).length).toBe(1);
    expect((await db.query(`SELECT 1 FROM audit_events WHERE action = 'lead.created'`)).length).toBe(1);
    const [ob] = await db.query<{ payload: Record<string, unknown> }>(`SELECT payload FROM outbox_events`);
    expect(Object.keys(ob.payload).sort()).toEqual(["lead_id", "ref"]); // no PII in event payload
  });
});

describe("2. duplicate click / retry does not create two records", () => {
  it("same idempotency key returns same ref", async () => {
    const body = req();
    const [a, b] = await Promise.all([submitServiceRequest(db, body, ctx), submitServiceRequest(db, body, ctx)]);
    const c = await submitServiceRequest(db, body, ctx);
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (a.ok && b.ok && c.ok) {
      expect(new Set([a.ref, b.ref, c.ref]).size).toBe(1);
      expect(c.replay).toBe(true);
    }
    expect((await db.query(`SELECT 1 FROM leads`)).length).toBe(1);
  });
  it("a second genuine request from the same phone is kept but flagged, never discarded", async () => {
    const a = await submitServiceRequest(db, req(), ctx);
    const b = await submitServiceRequest(db, req({ issue: "no-heat" }), ctx);
    expect(a.ok && b.ok).toBe(true);
    const rows = await db.query<{ duplicate_of: string | null }>(`SELECT duplicate_of FROM leads ORDER BY requested_at`);
    expect(rows.length).toBe(2);
    expect(rows.filter((r) => r.duplicate_of).length).toBe(1);
  });
});

describe("3. out-of-area ZIP", () => {
  it("is refused truthfully and saves nothing", async () => {
    const r = await submitServiceRequest(db, req({ zip: "90210" }), ctx);
    expect(r).toEqual({ ok: false, code: "out_of_area" });
    expect((await db.query(`SELECT 1 FROM customers`)).length).toBe(0);
  });
  it("deactivated ZIPs are refused too", async () => {
    await db.query(`UPDATE service_zips SET active = false WHERE zip = '30039'`);
    expect((await submitServiceRequest(db, req({ zip: "30039" }), ctx)).ok).toBe(false);
  });
});

describe("4. unknown system type is accepted", () => {
  it("accepts not_sure and blank system details", async () => {
    expect((await submitServiceRequest(db, req({ systemType: "", systemAge: "" }), ctx)).ok).toBe(true);
    expect((await submitServiceRequest(db, req({ systemType: "not_sure", phone: "4045550199" }), ctx)).ok).toBe(true);
  });
});

describe("5. failure does not claim success", () => {
  it("database failure throws (API returns 503) and nothing partial is saved", async () => {
    await db.query(`ALTER TABLE consents ADD CONSTRAINT boom CHECK (kind = 'nope')`); // force a failure mid-transaction
    await expect(submitServiceRequest(db, req(), ctx)).rejects.toThrow();
    expect((await db.query(`SELECT 1 FROM leads`)).length).toBe(0);
    expect((await db.query(`SELECT 1 FROM customers`)).length).toBe(0);
  });
  it("invalid input returns field errors, no record", async () => {
    const r = await submitServiceRequest(db, req({ phone: "123", consentService: false, street: "" }), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok && r.code === "invalid") expect(Object.keys(r.fieldErrors).sort()).toEqual(["consentService", "phone", "street"]);
  });
});

describe("spam defenses", () => {
  it("honeypot, too-fast submissions and rate limit are rejected", async () => {
    expect(await submitServiceRequest(db, req({ website: "http://spam" }), ctx)).toEqual({ ok: false, code: "rejected" });
    expect(await submitServiceRequest(db, req({ startedAt: Date.now() - 500 }), ctx)).toEqual({ ok: false, code: "rejected" });
    const results = [];
    for (let i = 0; i < 7; i++) results.push(await submitServiceRequest(db, req({ phone: `40455501${10 + i}` }), { ipHash: "flood" }));
    expect(results.filter((r) => !r.ok && r.code === "rate_limited").length).toBe(2);
  });
  it("tenants must give landlord/PM contact", async () => {
    const r = await submitServiceRequest(db, req({ relationship: "tenant" }), ctx);
    expect(r.ok).toBe(false);
  });
});

describe("6. unauthenticated access", () => {
  it("service layer refuses a null user", async () => {
    await submitServiceRequest(db, req(), ctx);
    await expect(listLeads(db, null as unknown as StaffUser)).rejects.toBeInstanceOf(AuthzError);
    expect(canViewLead(null, { assigned_to: null })).toBe(false);
  });
  it("wrong password and unknown email fail", async () => {
    expect(await authenticate(db, "o@example.test", "wrong-password-xx")).toBeNull();
    expect(await authenticate(db, "nobody@example.test", "test-password-123")).toBeNull();
    expect((await authenticate(db, "O@Example.test", "test-password-123"))?.role).toBe("owner_admin");
  });
});

describe("7. technician cannot access unrelated customer records", () => {
  it("sees only assigned leads; others look like not-found", async () => {
    const a = await submitServiceRequest(db, req(), ctx);
    const b = await submitServiceRequest(db, req({ phone: "4045550177" }), ctx);
    if (!a.ok || !b.ok) throw new Error("setup");
    const [la] = await db.query<{ id: string }>(`SELECT id FROM leads WHERE ref = $1`, [a.ref]);
    const [lb] = await db.query<{ id: string }>(`SELECT id FROM leads WHERE ref = $1`, [b.ref]);
    await assignLead(db, owner, la.id, tech.id);
    expect((await listLeads(db, tech)).map((l) => l.id)).toEqual([la.id]);
    expect(await getLeadDetail(db, tech, la.id)).not.toBeNull();
    expect(await getLeadDetail(db, tech, lb.id)).toBeNull();
    expect(await getLeadDetail(db, tech2, la.id)).toBeNull();
    await expect(transitionLead(db, tech, la.id, "contacted")).rejects.toBeInstanceOf(AuthzError);
    await expect(assignLead(db, dispatcher, la.id, tech2.id)).resolves.toBeUndefined();
    await expect(setCategoryEnabled(db, dispatcher, "other", false)).rejects.toBeInstanceOf(AuthzError);
  });
});

describe("8. consents persist with version/timestamp and can be changed", () => {
  it("records both consent kinds and appends staff changes", async () => {
    const r = await submitServiceRequest(db, req({ consentMarketing: true }), ctx);
    if (!r.ok) throw new Error("setup");
    const [l] = await db.query<{ id: string }>(`SELECT id FROM leads`);
    let d = await getLeadDetail(db, owner, l.id);
    expect(d!.consents.find((c) => c.kind === "marketing")!.granted).toBe(true);
    expect(d!.consents.find((c) => c.kind === "service_contact")!.text_version).toMatch(/^2026-/);
    await recordConsent(db, dispatcher, l.id, "marketing", false);
    d = await getLeadDetail(db, owner, l.id);
    expect(d!.consents.find((c) => c.kind === "marketing")!.granted).toBe(false);
    expect((await db.query(`SELECT 1 FROM consents WHERE kind = 'marketing'`)).length).toBe(2); // history kept
    const [c] = await db.query<{ marketing_opted_out_at: string | null }>(`SELECT marketing_opted_out_at FROM customers`);
    expect(c.marketing_opted_out_at).not.toBeNull();
    expect((await db.query(`SELECT 1 FROM outbox_events WHERE event_type = 'customer.opted_out'`)).length).toBe(1);
  });
  it("marketing consent is never assumed", async () => {
    const r = await submitServiceRequest(db, req({ consentMarketing: undefined }), ctx);
    expect(r.ok).toBe(true);
    const [m] = await db.query<{ granted: boolean }>(`SELECT granted FROM consents WHERE kind = 'marketing'`);
    expect(m.granted).toBe(false);
  });
});

describe("9. preferred time never becomes Confirmed without a confirmation event", () => {
  it("new lead with preferred time is not confirmed; confirm requires staff + time; DB enforces it", async () => {
    await submitServiceRequest(db, req(), ctx);
    const [l] = await db.query<{ id: string; status: string; scheduled_for: string | null }>(`SELECT id, status, scheduled_for FROM leads`);
    expect(l.status).toBe("new");
    expect(l.scheduled_for).toBeNull();
    await expect(transitionLead(db, owner, l.id, "confirmed", { scheduledFor: new Date() })).rejects.toBeInstanceOf(ValidationError); // must qualify first
    await transitionLead(db, owner, l.id, "qualified");
    await expect(transitionLead(db, owner, l.id, "confirmed")).rejects.toThrow(/required/);
    await expect(db.query(`UPDATE leads SET status = 'confirmed' WHERE id = $1`, [l.id])).rejects.toThrow(); // DB check constraint
    const when = new Date("2026-11-12T14:00:00Z");
    await transitionLead(db, dispatcher, l.id, "confirmed", { scheduledFor: when });
    const [after] = await db.query<{ status: string; confirmed_by: string; scheduled_for: Date }>(`SELECT status, confirmed_by, scheduled_for FROM leads`);
    expect(after.status).toBe("confirmed");
    expect(after.confirmed_by).toBe(dispatcher.id);
    expect(new Date(after.scheduled_for).toISOString()).toBe(when.toISOString());
  });
  it("disconnected providers mark notification events skipped, not done", async () => {
    await submitServiceRequest(db, req(), ctx);
    await processOutbox(db);
    const [e] = await db.query<{ status: string; last_error: string }>(`SELECT status, last_error FROM outbox_events`);
    expect(e.status).toBe("skipped");
    expect(e.last_error).toMatch(/not connected/);
  });
});

describe("10. owner actions create correct audit history", () => {
  it("status, assignment and un-confirm are all audited in order", async () => {
    await submitServiceRequest(db, req(), ctx);
    const [l] = await db.query<{ id: string }>(`SELECT id FROM leads`);
    await transitionLead(db, owner, l.id, "contacted");
    await assignLead(db, owner, l.id, tech.id);
    await transitionLead(db, owner, l.id, "qualified");
    await transitionLead(db, owner, l.id, "confirmed", { scheduledFor: new Date(Date.now() + 86400000) });
    await transitionLead(db, owner, l.id, "qualified", {}); // customer cancelled
    await expect(transitionLead(db, owner, l.id, "ineligible")).rejects.toThrow(/reason/);
    const rows = await db.query<{ action: string; from_status: string | null; to_status: string | null; actor_id: string | null }>(
      `SELECT action, from_status, to_status, actor_id FROM audit_events WHERE entity = 'lead' ORDER BY id`,
    );
    expect(rows.map((r) => `${r.action}:${r.from_status ?? ""}>${r.to_status ?? ""}`)).toEqual([
      "lead.created:>new",
      "lead.status_changed:new>contacted",
      "lead.assigned:>",
      "lead.status_changed:contacted>qualified",
      "lead.status_changed:qualified>confirmed",
      "lead.status_changed:confirmed>qualified",
    ]);
    expect(rows.slice(1).every((r) => r.actor_id === owner.id)).toBe(true);
    const [after] = await db.query<{ confirmed_at: string | null }>(`SELECT confirmed_at FROM leads`);
    expect(after.confirmed_at).toBeNull();
  });
});

describe("operations: unsupported category cannot be requested", () => {
  it("disabled category is rejected server-side", async () => {
    await setCategoryEnabled(db, owner, "maintenance", false);
    expect(await submitServiceRequest(db, req({ issue: "maintenance" }), ctx)).toEqual({ ok: false, code: "category_unavailable" });
  });
});

describe("domain helpers", () => {
  it("phone normalization", () => {
    expect(normalizePhone("404-555-0134")).toBe("+14045550134");
    expect(normalizePhone("1 (404) 555 0134")).toBe("+14045550134");
    expect(normalizePhone("055-555-0134")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
  });
  it("safety detection", () => {
    expect(detectSafetyConcern("I smell gas near the furnace")).toBe(true);
    expect(detectSafetyConcern("CO alarm keeps beeping")).toBe(true);
    expect(detectSafetyConcern("there's smoke from the vent")).toBe(true);
    expect(detectSafetyConcern("AC is blowing warm air")).toBe(false);
  });
  it("source inference", () => {
    expect(inferSource({}, "https://www.google.com/")).toBe("google_organic");
    expect(inferSource({ utm_source: "google", utm_medium: "cpc" })).toBe("google_ads");
    expect(inferSource({}, undefined)).toBe("direct");
  });
  it("state machine", () => {
    expect(canTransition("new", "confirmed")).toBe(false);
    expect(canTransition("qualified", "confirmed")).toBe(true);
  });
  it("analytics strips PII-bearing keys", () => {
    expect(sanitize({ issue: "no-heat", name: "Jane", phone: "404", step: 2 })).toEqual({ issue: "no-heat", step: 2 });
  });
  it("logger redacts PII", () => {
    expect(logger.scrub({ phone: "+14045550134", nested: { email: "a@b.c", ok: 1 } })).toEqual({ phone: "[redacted]", nested: { email: "[redacted]", ok: 1 } });
  });
});
