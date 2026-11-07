import { redirect } from "next/navigation";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/session";
import { can } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { businessConfig as b } from "@/config/business";
import { fmtDateTime } from "@/lib/time";
import { Flash } from "@/components/admin/Flash";
import { addZipAction, toggleZipAction, toggleCategoryAction, runOutboxAction } from "../../actions";

const readiness: [string, boolean][] = [
  ["Final business name spelling verified", false],
  ["Legal entity / DBA registered", b.legalName !== null],
  ["Licensed conditioned-air contractor structure verified", false],
  ["Insurance in place", false],
  ["Public phone number", b.publicPhone !== null],
  ["Business email and domain owned", b.publicEmail !== null && b.publicDomain !== null],
  ["Business hours set", b.businessHours !== null],
  ["Service ZIPs approved by owner", false],
  ["Diagnostic fee and pricing approved", b.publicPricingApproved],
  ["Service categories approved", b.serviceCategoriesApproved],
  ["Privacy policy and terms reviewed", false],
  ["New-lead email alert connected", false],
  ["Production database and backups configured", Boolean(process.env.DATABASE_URL)],
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const user = await requireUser();
  if (!can(user, "settings:manage")) redirect("/admin");
  const sp = await searchParams;
  const s = await getSettings(await getDb(), user);

  return (
    <>
      <h1 className="text-2xl font-black">Settings &amp; system status</h1>
      <div className="mt-6"><Flash ok={sp.ok} err={sp.err} /></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="h-zips">
          <h2 id="h-zips" className="text-lg font-black">Service ZIP codes</h2>
          <p className="mt-1 text-sm text-ink/70">Requests are accepted only from active ZIPs. Customers in other ZIPs get an honest &quot;not in your area&quot; message and no data is saved.</p>
          <ul className="mt-4 divide-y divide-black/5">
            {s.zips.length === 0 && <li className="py-3 text-sm text-danger">No ZIPs configured. The request form will turn everyone away.</li>}
            {s.zips.map((z) => (
              <li key={z.zip} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span><strong className="font-mono">{z.zip}</strong> <span className="text-ink/70">{z.label}</span>{!z.active && <span className="ml-2 text-xs font-bold text-danger">INACTIVE</span>}</span>
                <form action={toggleZipAction}><input type="hidden" name="zip" value={z.zip} /><input type="hidden" name="active" value={String(!z.active)} /><button className="text-xs font-bold underline">{z.active ? "Deactivate" : "Activate"}</button></form>
              </li>
            ))}
          </ul>
          <form action={addZipAction} className="mt-4 flex gap-2">
            <label htmlFor="zip" className="sr-only">ZIP</label>
            <input id="zip" name="zip" inputMode="numeric" maxLength={5} placeholder="ZIP" required className="field-input max-w-[7rem] font-mono" />
            <label htmlFor="label" className="sr-only">Label</label>
            <input id="label" name="label" placeholder="Label (e.g. Snellville)" className="field-input" />
            <button className="btn btn-dark min-h-[48px] px-4 text-sm">Add</button>
          </form>
        </section>

        <section className="card p-6" aria-labelledby="h-cats">
          <h2 id="h-cats" className="text-lg font-black">Request categories</h2>
          <p className="mt-1 text-sm text-ink/70">Disabled categories disappear from the request form and are rejected by the server.</p>
          <ul className="mt-4 divide-y divide-black/5">
            {s.categories.map((c) => (
              <li key={c.slug} className="flex items-center justify-between py-2 text-sm">
                <span className="font-semibold">{c.label} {!c.public_enabled && <span className="ml-2 text-xs font-bold text-danger">OFF</span>}</span>
                <form action={toggleCategoryAction}><input type="hidden" name="slug" value={c.slug} /><input type="hidden" name="enabled" value={String(!c.public_enabled)} /><button className="text-xs font-bold underline">{c.public_enabled ? "Disable" : "Enable"}</button></form>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6" aria-labelledby="h-int">
          <h2 id="h-int" className="text-lg font-black">Integrations</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {s.integrations.map((i) => (
              <li key={i.key} className="flex items-start gap-3">
                <span className={`mt-0.5 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${i.connected ? "bg-success text-white" : "bg-black/10"}`}>{i.connected ? "Working" : "Not connected"}</span>
                <span><strong>{i.label}.</strong> {i.note}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6" aria-labelledby="h-ready">
          <h2 id="h-ready" className="text-lg font-black">Launch readiness</h2>
          <p className="mt-1 text-sm text-ink/70">Site mode: <strong>{b.siteMode}</strong>. Items come from the business config and must be verified by the owner.</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {readiness.map(([label, done]) => (
              <li key={label} className="flex gap-2"><span aria-hidden="true" className={done ? "text-success" : "text-danger"}>{done ? "✓" : "✗"}</span><span>{label}<span className="sr-only">{done ? " (done)" : " (blocked)"}</span></span></li>
            ))}
          </ul>
        </section>

        <section className="card p-6 lg:col-span-2" aria-labelledby="h-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="h-auto" className="text-lg font-black">Automation queue</h2>
            <form action={runOutboxAction}><button className="btn btn-outline min-h-[40px] px-4 py-1.5 text-sm">Process now</button></form>
          </div>
          <p className="mt-1 text-sm text-ink/70">
            {s.outboxCounts.map((c) => `${c.status}: ${c.n}`).join(" · ") || "No events yet."} Events with no connected provider are marked skipped with the reason, never silently treated as sent.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-steel-dark"><tr><th className="py-2">#</th><th>Event</th><th>Status</th><th>Attempts</th><th>Note</th><th>Created</th></tr></thead>
              <tbody>
                {s.outbox.map((e) => (
                  <tr key={e.id} className="border-t border-black/5">
                    <td className="py-2">{e.id}</td><td className="font-mono">{e.event_type}</td><td>{e.status}</td><td>{e.attempts}</td><td className="text-ink/70">{e.last_error}</td><td className="whitespace-nowrap">{fmtDateTime(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
