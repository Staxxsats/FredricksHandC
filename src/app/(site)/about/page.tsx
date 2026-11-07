import type { Metadata } from "next";
import Link from "next/link";
import { about } from "@/content/site";
import { PageHero } from "@/components/site/ServicePage";
import { Section, Heading } from "@/components/site/Section";

export const metadata: Metadata = { title: "About", description: about.lead, alternates: { canonical: "/about" } };

export default function Page() {
  return (
    <>
      <PageHero eyebrow="About us" title={about.title} lead={about.lead} />
      <Section labelledBy="approach">
        <Heading id="approach" eyebrow="How we work" title="Our approach" />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {about.approach.map((x, i) => (
            <li key={x.title} className={`rounded-[var(--radius-card)] p-6 ${i % 3 === 0 ? "on-dark bg-charcoal text-white" : "card"}`}>
              <h3 className="text-lg font-extrabold">{x.title}</h3>
              <p className={`mt-1 ${i % 3 === 0 ? "text-white/80" : "text-ink/75"}`}>{x.body}</p>
            </li>
          ))}
        </ul>
        <Link href="/book" className="btn btn-amber mt-10">Request Service</Link>
      </Section>
    </>
  );
}
