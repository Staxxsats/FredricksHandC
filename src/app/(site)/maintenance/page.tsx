import type { Metadata } from "next";
import Link from "next/link";
import { home } from "@/content/site";
import { PageHero } from "@/components/site/ServicePage";
import { Section, Heading } from "@/components/site/Section";

export const metadata: Metadata = {
  title: "Comfort Plan & seasonal maintenance",
  description: "Spring cooling and fall heating checkups. The Frederick's Comfort Plan is being finalized; request details.",
  alternates: { canonical: "/maintenance" },
};

// WORKING OFFER: terms, price, and coverage are not final. No paid enrollment until approved.
const included = [
  { title: "Spring cooling inspection", body: "Before the first hot stretch, we check your AC or heat pump in cooling mode." },
  { title: "Fall heating inspection", body: "Before the first cold snap, we check your furnace or heat pump in heating mode." },
  { title: "Notes on system health", body: "A written summary of what we checked and anything to keep an eye on." },
  { title: "Reminders", body: "We reach out when your next visit is due, so you don't have to remember." },
];

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Maintenance" title={home.maintenance.title} lead={home.maintenance.body} cta={{ href: "/book?issue=maintenance", label: "Request plan details" }} />
      <Section labelledBy="incl">
        <Heading id="incl" eyebrow="What we're planning" title="Two visits a year, built around Georgia seasons" />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {included.map((x) => (
            <li key={x.title} className="card p-6">
              <h3 className="text-lg font-extrabold">{x.title}</h3>
              <p className="mt-1 text-ink/75">{x.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 rounded-xl border-2 border-charcoal/15 bg-white p-6">
          <h3 className="font-extrabold">Not included</h3>
          <p className="mt-1 text-ink/75">Repairs, refrigerant, parts, and equipment replacement are separate unless the final plan terms say otherwise.</p>
        </div>
      </Section>
      <Section tone="white" labelledBy="status">
        <Heading id="status" eyebrow="Plan status" title="Terms are still being finalized" sub="We'll publish pricing, coverage, renewal, and cancellation terms before anyone can enroll. Until then, send a request and we'll share the details when they're ready." />
        <Link href="/book?issue=maintenance" className="btn btn-amber mt-6">Request plan details</Link>
        <p className="mt-3 text-sm text-steel-dark">No payment is collected online.</p>
      </Section>
    </>
  );
}
