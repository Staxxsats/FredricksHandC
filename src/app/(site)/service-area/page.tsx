import type { Metadata } from "next";
import Link from "next/link";
import { businessConfig as b } from "@/config/business";
import { PageHero } from "@/components/site/ServicePage";
import { Section, Heading } from "@/components/site/Section";

export const metadata: Metadata = {
  title: "Service area",
  description: `Where Frederick's Heating & Cooling takes service requests in ${b.serviceAreaLabel}.`,
  alternates: { canonical: "/service-area" },
};

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Our area" title={`Serving ${b.serviceAreaCommunities.join(", ")} and nearby`} lead={`We're starting close to home in ${b.serviceAreaLabel} and growing carefully, so we can actually show up for the customers we take on.`} />
      <Section labelledBy="check">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <Heading id="check" eyebrow="Check your ZIP" title="The fastest way to know" sub="Start a request and enter your ZIP code. You'll know right away whether we're taking requests there, before you share any contact details." />
            <Link href="/book" className="btn btn-amber mt-6">Check my ZIP</Link>
          </div>
          <div className="card p-6">
            <h3 className="font-extrabold">Communities</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {b.serviceAreaCommunities.map((c) => <li key={c} className="rounded-full bg-porcelain px-4 py-2 font-semibold">{c}</li>)}
            </ul>
            <p className="mt-4 text-sm text-steel-dark">We list a community only once we're ready to serve it.</p>
          </div>
        </div>
      </Section>
    </>
  );
}
