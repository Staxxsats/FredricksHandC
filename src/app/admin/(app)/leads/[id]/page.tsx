import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/session";
import { can } from "@/server/auth";
import { getLeadDetail, listStaff } from "@/server/leads";
import { statusLabel, TRANSITIONS, REQUIRES, type LeadStatus } from "@/domain/lead-status";
import { labels, formatPhone } from "@/domain/request";
import { fmtDateTime } from "@/lib/time";
import { Flash, StatusPill } from "@/components/admin/Flash";
import { transitionAction, assignAction, followUpAction, contactAction, duplicateAction, consentAction } from "../../../actions";

export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const db = await getDb();
  const detail = await getLeadDetail(db, user, id);
  if (!detail) notFound();
  const { lead: l, consents, contacts, audit, related } = detail;
  const status = l.status as LeadStatus;
  const canEdit = can(user, "leads:update");
  const staff = can(user, "leads:assign") ? await listStaff(db, user) : [];
  const consent = (k: string) => consents.find((c) => c.kind === k);
  const s = (k: string) => (l[k] == null ? "" : String(l[k]));

  return (
    <>
      <Link href="/admin" className="text-sm font-bold underline">← All leads</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-black">{s("ref")}</h1>
        <StatusPill status={status} label={statusLabel[status]} />
        {Boolean(l.safety_flag) && <span className="rounded bg-danger px-2 py-0.5 text-xs font-bold text-white">SAFETY MENTIONED</span>}
      </div>
      <p className="mt-1 text-sm text-steel-dark">Received {fmtDateTime(s("requested_at"))} · source: {s("source")}{l.referrer_host ? ` (${s("referrer_host")})` : ""}</p>
      <div className="mt-6"><Flash ok={sp.ok} err={sp.err} /></div>

      {Boolean(l.duplicate_of) && status !== "duplicate" && (
        <p className="mb-6 rounded-lg bg-steel/20 px-4 py-3 text-sm font-semibold">Possible duplicate: this phone number has another open request from the last 14 days. Review below before contacting.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6" aria-labelledby="h-req">
            <h2 id="h-req" className="text-lg font-black">Request</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Item k="Issue" v={labels[s("issue")]} /><Item k="Urgency" v={labels[s("urgency")]} />
              <Item k="System running" v={labels[s("system_running")]} /><Item k="System" v={[labels[s("system_type")], labels[s("system_age")]].filter(Boolean).join(", ") || "Not specified"} />
              <Item k="Preferred (request only)" v={[s("preferred_day"), labels[s("preferred_window")]].filter(Boolean).join(", ") || "No preference"} />
              <Item k="ZIP eligible" v={l.zip_eligible ? "Yes" : "No"} />
            </dl>
            {s("notes") && <blockquote className="mt-4 rounded-lg bg-porcelain p-4 text-sm leading-relaxed">“{s("notes")}”</blockquote>}
            {status === "confirmed" && (
              <p className="mt-4 rounded-lg bg-success/10 p-3 text-sm font-semibold text-success">
                Confirmed for {fmtDateTime(s("scheduled_for"))} by {s("confirmed_by_name")} on {fmtDateTime(s("confirmed_at"))}
              </p>
            )}
          </section>

          <section className="card p-6" aria-labelledby="h-cust">
            <h2 id="h-cust" className="text-lg font-black">Customer &amp; property</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Item k="Name" v={s("customer_name")} />
              <Item k="Phone" v={<a className="underline" href={`tel:${s("phone")}`}>{formatPhone(s("phone"))}</a>} />
              <Item k="Email" v={s("email") || "—"} />
              <Item k="Relationship" v={labels[s("relationship")]} />
              <Item k="Address" v={[s("street"), s("unit"), s("city"), `${s("state")} ${s("zip")}`].filter(Boolean).join(", ")} />
              <Item k="Property" v={labels[s("property_type")] ?? s("property_type")} />
              {s("tenant_contact") && <Item k="Landlord / PM" v={s("tenant_contact")} />}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <a className="btn btn-outline min-h-[40px] px-3 py-1.5 text-sm" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s("street"), s("city"), s("zip")].join(" "))}`}>Open in Maps</a>
            </div>
          </section>

          <section className="card p-6" aria-labelledby="h-consent">
            <h2 id="h-consent" className="text-lg font-black">Consent &amp; communication limits</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(["service_contact", "marketing"] as const).map((k) => {
                const c = consent(k);
                return (
                  <li key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-porcelain px-3 py-2">
                    <span>
                      <strong>{k === "service_contact" ? "Service contact" : "Marketing"}:</strong>{" "}
                      {c ? (c.granted ? "Yes" : "No") : "Not recorded"}
                      {c && <span className="text-steel-dark"> · v{c.text_version} · {c.source.replace("_", " ")} · {fmtDateTime(c.created_at)}</span>}
                    </span>
                    {canEdit && (
                      <form action={consentAction}>
                        <input type="hidden" name="leadId" value={s("id")} /><input type="hidden" name="kind" value={k} />
                        <input type="hidden" name="granted" value={c?.granted ? "false" : "true"} />
                        <button className="text-xs font-bold underline">{c?.granted ? "Record opt-out" : "Record opt-in"}</button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card p-6" aria-labelledby="h-hist">
            <h2 id="h-hist" className="text-lg font-black">Contact history</h2>
            {contacts.length === 0 ? <p className="mt-2 text-sm text-ink/60">No contact logged yet.</p> : (
              <ul className="mt-3 space-y-3 text-sm">
                {contacts.map((c, i) => (
                  <li key={i} className="border-l-4 border-amber pl-3">
                    <p className="font-semibold">{c.channel.replace("_", " ")} · {c.user_name} · {fmtDateTime(c.created_at)}</p>
                    <p className="text-ink/80">{c.summary}</p>
                  </li>
                ))}
              </ul>
            )}
            {canEdit && (
              <form action={contactAction} className="mt-4 space-y-2">
                <input type="hidden" name="leadId" value={s("id")} />
                <div className="flex gap-2">
                  <label className="sr-only" htmlFor="channel">Channel</label>
                  <select id="channel" name="channel" className="field-input max-w-[9rem]">
                    <option value="phone">Phone</option><option value="text">Text</option><option value="email">Email</option><option value="in_person">In person</option><option value="note">Note</option>
                  </select>
                  <label className="sr-only" htmlFor="summary">Summary</label>
                  <input id="summary" name="summary" required placeholder="What happened?" className="field-input" />
                </div>
                <button className="btn btn-dark min-h-[40px] px-4 py-2 text-sm">Log contact</button>
              </form>
            )}
          </section>

          <section className="card p-6" aria-labelledby="h-audit">
            <h2 id="h-audit" className="text-lg font-black">Audit trail</h2>
            <ol className="mt-3 space-y-1.5 text-sm">
              {audit.map((a, i) => (
                <li key={i} className="flex flex-wrap gap-x-2">
                  <span className="whitespace-nowrap text-steel-dark">{fmtDateTime(a.created_at)}</span>
                  <span className="font-semibold">{a.actor}</span>
                  <span>{a.action}{a.from_status || a.to_status ? `: ${a.from_status ?? "∅"} → ${a.to_status ?? ""}` : ""}</span>
                  {a.reason && <span className="text-ink/70">({a.reason})</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {canEdit && (
          <aside className="space-y-6">
            <section className="card p-6" aria-labelledby="h-status">
              <h2 id="h-status" className="text-lg font-black">Move this lead</h2>
              <div className="mt-3 space-y-3">
                {TRANSITIONS[status].filter((t) => t !== "duplicate").map((to) => (
                  <form key={to} action={transitionAction} className="rounded-lg border border-black/10 p-3">
                    <input type="hidden" name="leadId" value={s("id")} /><input type="hidden" name="to" value={to} />
                    {REQUIRES[to]?.includes("scheduledFor") && (
                      <div className="mb-2">
                        <label htmlFor={`when-${to}`} className="field-label text-sm">Confirmed date &amp; time (agreed with customer)</label>
                        <input id={`when-${to}`} name="scheduledFor" type="datetime-local" required className="field-input" />
                      </div>
                    )}
                    {REQUIRES[to]?.includes("reason") && (
                      <div className="mb-2">
                        <label htmlFor={`reason-${to}`} className="field-label text-sm">Reason</label>
                        <input id={`reason-${to}`} name="reason" required className="field-input" />
                      </div>
                    )}
                    <button className={`btn w-full min-h-[42px] py-2 text-sm ${to === "confirmed" ? "btn-amber" : "btn-outline"}`}>
                      {to === "confirmed" ? "Confirm appointment" : status === "confirmed" && to === "qualified" ? "Undo confirmation (customer cancelled)" : `Mark ${statusLabel[to].toLowerCase()}`}
                    </button>
                  </form>
                ))}
              </div>
              <p className="mt-3 text-xs text-steel-dark">Only confirm once you've agreed a time with the customer. Calendar and text reminders aren't connected yet.</p>
            </section>

            {staff.length > 0 && (
              <section className="card p-6" aria-labelledby="h-assign">
                <h2 id="h-assign" className="text-lg font-black">Assigned to</h2>
                <form action={assignAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="leadId" value={s("id")} />
                  <label htmlFor="assignee" className="sr-only">Assignee</label>
                  <select id="assignee" name="assignee" defaultValue={s("assigned_to")} className="field-input">
                    <option value="">Unassigned</option>
                    {staff.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role.replace("_", " ")})</option>)}
                  </select>
                  <button className="btn btn-dark min-h-[48px] px-4 text-sm">Save</button>
                </form>
              </section>
            )}

            <section className="card p-6" aria-labelledby="h-follow">
              <h2 id="h-follow" className="text-lg font-black">Next step</h2>
              <form action={followUpAction} className="mt-3 space-y-2">
                <input type="hidden" name="leadId" value={s("id")} />
                <label htmlFor="nextStep" className="sr-only">Next step</label>
                <input id="nextStep" name="nextStep" defaultValue={s("next_step")} placeholder="e.g. Call back after 5pm" className="field-input" />
                <label htmlFor="dueAt" className="field-label text-sm">Due</label>
                <input id="dueAt" name="dueAt" type="datetime-local" className="field-input" />
                {l.next_due_at ? <p className="text-xs text-steel-dark">Currently due {fmtDateTime(s("next_due_at"))}</p> : null}
                <button className="btn btn-dark min-h-[42px] w-full py-2 text-sm">Save follow-up</button>
              </form>
            </section>

            {TRANSITIONS[status].includes("duplicate") && (
              <section className="card p-6" aria-labelledby="h-dup">
                <h2 id="h-dup" className="text-lg font-black">Duplicate?</h2>
                <form action={duplicateAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="leadId" value={s("id")} />
                  <label htmlFor="ofRef" className="sr-only">Original reference</label>
                  <input id="ofRef" name="ofRef" placeholder="FHC-XXXXXX" required className="field-input font-mono" />
                  <button className="btn btn-outline min-h-[48px] px-4 text-sm">Merge</button>
                </form>
              </section>
            )}

            {related.length > 0 && (
              <section className="card p-6" aria-labelledby="h-rel">
                <h2 id="h-rel" className="text-lg font-black">Other requests from this customer</h2>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {related.map((r) => (
                    <li key={r.id}><Link href={`/admin/leads/${r.id}`} className="font-mono font-bold underline">{r.ref}</Link> · {statusLabel[r.status as LeadStatus]} · {fmtDateTime(r.requested_at)}</li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        )}
      </div>
    </>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-steel-dark">{k}</dt>
      <dd className="mt-0.5 font-semibold">{v}</dd>
    </div>
  );
}
