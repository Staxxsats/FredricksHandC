import Link from "next/link";
import { getDb } from "@/server/db";
import { requireUser } from "@/server/session";
import { can } from "@/server/auth";
import { listLeads, dashboardCounts } from "@/server/leads";
import { statusLabel, type LeadStatus } from "@/domain/lead-status";
import { labels } from "@/domain/request";
import { fmtRelative, fmtDateTime } from "@/lib/time";
import { StatusPill } from "@/components/admin/Flash";

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "new", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "all", label: "All" },
];

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const db = await getDb();
  const { status = "open" } = await searchParams;
  const leads = await listLeads(db, user, { status });
  const counts = can(user, "leads:read_all") ? await dashboardCounts(db, user) : null;

  return (
    <>
      <h1 className="text-2xl font-black">{can(user, "leads:read_all") ? "Leads inbox" : "My assigned jobs"}</h1>
      {counts && (
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["New today", counts.today],
            ["Not yet contacted", counts.uncontacted],
            ["Awaiting confirmation", counts.awaiting_confirmation],
            ["Confirmed for today", counts.confirmed_today],
            ["Follow-ups due", counts.follow_ups_due],
          ].map(([l, n]) => (
            <li key={l as string} className="card p-4">
              <p className="text-3xl font-black">{n as number}</p>
              <p className="mt-1 text-sm font-semibold text-steel-dark">{l}</p>
            </li>
          ))}
        </ul>
      )}
      {counts && counts.safety_new > 0 && (
        <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-4 py-3 font-bold text-danger">
          {counts.safety_new} new request{counts.safety_new > 1 ? "s" : ""} mention a possible safety issue. Review first.
        </p>
      )}

      <nav aria-label="Filter leads" className="mt-8 flex gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/admin?status=${f.key}`} aria-current={status === f.key ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-bold ${status === f.key ? "bg-charcoal text-white" : "bg-white text-ink shadow-[var(--shadow-card)]"}`}>
            {f.label}
          </Link>
        ))}
      </nav>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase tracking-wider text-steel-dark">
            <tr>
              <th className="px-4 py-3">Ref</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Issue</th>
              <th className="px-4 py-3">Urgency</th><th className="px-4 py-3">ZIP</th><th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Received</th><th className="px-4 py-3">Next due</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-ink/60">No leads here yet.</td></tr>
            )}
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-black/5 hover:bg-porcelain">
                <td className="px-4 py-3 font-mono font-bold">
                  <Link href={`/admin/leads/${l.id}`} className="underline">{l.ref}</Link>
                  {l.safety_flag && <span className="ml-2 rounded bg-danger px-1.5 py-0.5 font-sans text-[0.65rem] font-bold text-white">SAFETY</span>}
                  {l.duplicate_of && l.status !== "duplicate" && <span className="ml-2 rounded bg-steel/40 px-1.5 py-0.5 font-sans text-[0.65rem] font-bold">POSSIBLE DUP</span>}
                </td>
                <td className="px-4 py-3 font-semibold">{l.customer_name}</td>
                <td className="px-4 py-3">{labels[l.issue]}</td>
                <td className="px-4 py-3">{labels[l.urgency]}</td>
                <td className="px-4 py-3">{l.zip}</td>
                <td className="px-4 py-3"><StatusPill status={l.status} label={statusLabel[l.status as LeadStatus]} /></td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtRelative(l.requested_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{l.next_due_at ? fmtDateTime(l.next_due_at) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-steel-dark">Times shown in America/New_York.</p>
    </>
  );
}
