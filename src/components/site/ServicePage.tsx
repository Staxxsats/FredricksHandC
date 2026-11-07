import Link from "next/link";
import { services } from "@/content/site";
import { businessConfig as b } from "@/config/business";
import { Section, Heading } from "./Section";
import { Faq, faqJsonLd } from "./Faq";

export function PageHero({ eyebrow, title, lead, cta }: { eyebrow: string; title: string; lead: string; cta?: { href: string; label: string } }) {
  return (
    <section className="on-dark relative overflow-hidden bg-charcoal text-white">
      <div aria-hidden="true" className="absolute -right-10 bottom-0 h-full w-[38%] skew-x-[-14deg] bg-amber/90 max-md:hidden" />
      <div aria-hidden="true" className="absolute -right-10 bottom-0 h-full w-[18%] skew-x-[-14deg] bg-steel max-md:hidden" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="eyebrow text-amber">{eyebrow}</p>
        <h1 className="mt-3 max-w-[18ch] text-[2.4rem] font-black leading-[1.05] tracking-tight sm:text-[3.2rem]">{title}</h1>
        <p className="mt-4 max-w-xl text-[1.1rem] leading-relaxed text-white/80">{lead}</p>
        {cta && <Link href={cta.href} className="btn btn-amber mt-7">{cta.label} <span aria-hidden="true">→</span></Link>}
      </div>
    </section>
  );
}

export function ServicePage({ kind }: { kind: keyof typeof services }) {
  const s = services[kind];
  const others = (Object.keys(services) as (keyof typeof services)[]).filter((k) => k !== kind);
  return (
    <>
      <PageHero eyebrow={`${s.title} · ${b.serviceAreaLabel}`} title={s.lead} lead={s.intro} cta={{ href: `/book?issue=${s.issue}`, label: "Request Service" }} />
      <Section labelledBy="symptoms">
        <Heading id="symptoms" eyebrow="Common signs" title="Sound familiar?" />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {s.symptoms.map((x) => (
            <li key={x.title} className="card border-l-4 border-amber p-5">
              <h3 className="font-extrabold">{x.title}</h3>
              <p className="mt-1 text-ink/75">{x.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 rounded-xl border-2 border-danger/30 bg-white p-5">
          <p className="font-extrabold text-danger">Smell gas, see smoke, or hear a CO alarm?</p>
          <p className="mt-1 text-ink/80">Leave the home and call 911 or your gas utility from outside. Don't wait for a service appointment.</p>
        </div>
      </Section>
      <Section tone="white" labelledBy="expect">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <Heading id="expect" eyebrow="What to expect" title="Diagnosis first, then a clear price" />
            <p className="mt-4 leading-relaxed text-ink/80">{s.expect}</p>
            <Link href={`/book?issue=${s.issue}`} className="btn btn-dark mt-6">Request Service</Link>
          </div>
          <div>
            <h2 className="text-xl font-extrabold">Questions</h2>
            <div className="mt-4"><Faq items={s.faqs} /></div>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(s.faqs)) }} />
          </div>
        </div>
      </Section>
      <Section labelledBy="more">
        <h2 id="more" className="text-xl font-extrabold">Other services</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {others.map((k) => (
            <li key={k}><Link href={`/${k}`} className="btn btn-outline">{services[k].title}</Link></li>
          ))}
          <li><Link href="/maintenance" className="btn btn-outline">Comfort Plan</Link></li>
        </ul>
      </Section>
    </>
  );
}
