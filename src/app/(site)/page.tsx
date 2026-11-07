import Link from "next/link";
import { businessConfig as b } from "@/config/business";
import { home, faqs } from "@/content/site";
import { IssueCards } from "@/components/site/IssueCards";
import { Faq, faqJsonLd } from "@/components/site/Faq";
import { Section, Heading } from "@/components/site/Section";
import { HeroActions } from "@/components/site/HeroActions";

const serviceTiles = [
  { href: "/heating", title: "Heating", body: "Furnaces and heat pumps that won't start, won't keep up, or won't stop." },
  { href: "/cooling", title: "Cooling & AC", body: "Warm air, frozen lines, water leaks, and systems that quit on hot days." },
  { href: "/repairs", title: "Diagnostics & Repairs", body: "Test first, then fix. Capacitors, motors, drains, thermostats, and more." },
  { href: "/maintenance", title: "Seasonal Maintenance", body: "Spring and fall checkups to catch small problems before they're big ones." },
];

export default function HomePage() {
  const [h1a, h1b] = splitHeadline(home.heroHeadline);
  return (
    <>
      {/* HERO */}
      <section className="on-dark relative overflow-hidden bg-charcoal text-white" aria-labelledby="hero-title">
        <div aria-hidden="true" className="livery pointer-events-none absolute inset-x-0 bottom-0 h-[150px] opacity-95 sm:h-[190px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-40 pt-12 sm:px-6 sm:pb-52 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:pb-56">
          <div>
            <p className="eyebrow text-amber">{home.heroEyebrow}</p>
            <h1 id="hero-title" className="mt-4 text-[2.55rem] font-black leading-[1.02] tracking-[-0.02em] sm:text-[3.6rem] lg:text-[4.1rem]">
              {h1a}
              <span className="block text-amber">{h1b}</span>
            </h1>
            <p className="mt-5 max-w-xl text-[1.1rem] leading-relaxed text-white/80">{home.heroSub}</p>
            <HeroActions />
            <ul className="mt-8 grid gap-2 text-[0.95rem] text-white/85 sm:grid-cols-3 sm:gap-4">
              {home.heroPoints.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-[0.45em] h-2 w-2 shrink-0 rotate-45 bg-amber" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Yard-sign panel: the board's sign language, minus the rejected emblem */}
          <div aria-hidden="true" className="relative hidden lg:block">
            <div className="relative mx-auto w-[92%] rotate-[-2.5deg] overflow-hidden rounded-[18px] bg-porcelain p-8 text-ink shadow-[0_30px_60px_rgb(0_0_0/0.35)]">
              <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(-12deg,transparent_0_38%,var(--color-amber)_38%_62%,var(--color-steel)_62%_86%,transparent_86%)]" />
              <p className="relative text-[2.6rem] font-black italic leading-none tracking-tight">{b.wordmarkPrimary}</p>
              <p className="relative mt-2 inline-flex -skew-x-12 overflow-hidden rounded-[3px] text-[0.8rem] font-extrabold italic tracking-[0.18em]">
                <span className="bg-amber px-3 py-1">HEATING &amp;</span>
                <span className="bg-steel px-3 py-1">COOLING</span>
              </p>
              <p className="relative mt-7 text-[1.6rem] font-extrabold leading-[1.15]">Need heat? Need air?</p>
              <p className="relative mb-16 mt-1 text-[1.6rem] font-extrabold leading-[1.15] text-amber-deep">Call {b.shortName}.</p>
            </div>
            <div className="mx-auto -mt-2 flex w-[60%] justify-between px-10">
              <span className="h-16 w-2 rounded-b bg-steel/70" />
              <span className="h-16 w-2 rounded-b bg-steel/70" />
            </div>
          </div>
        </div>
      </section>

      {/* ISSUE SELECTOR: pulled up over the hero livery */}
      <section aria-labelledby="issues-title" className="relative z-10 -mt-24 sm:-mt-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-[20px] bg-porcelain p-5 shadow-[var(--shadow-lift)] sm:p-8">
            <h2 id="issues-title" className="text-[1.6rem] font-extrabold leading-tight tracking-tight sm:text-[2rem]">{home.issuesTitle}</h2>
            <p className="mt-1.5 text-ink/70">{home.issuesSub}</p>
            <div className="mt-6">
              <IssueCards />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST CUES: verifiable commitments only */}
      <Section labelledBy="trust-title" className="!pt-14">
        <h2 id="trust-title" className="sr-only">Our commitments</h2>
        <ul className="grid gap-6 md:grid-cols-3">
          {home.trust.map((t, i) => (
            <li key={t.title} className="flex gap-4">
              <span className="text-[2.2rem] font-black leading-none text-amber-deep" aria-hidden="true">0{i + 1}</span>
              <div>
                <h3 className="text-lg font-extrabold">{t.title}</h3>
                <p className="mt-1 leading-relaxed text-ink/75">{t.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* CORE SERVICES */}
      <Section tone="white" labelledBy="services-title">
        <Heading id="services-title" eyebrow="Services" title={home.servicesTitle} />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {serviceTiles.map((s, i) => (
            <li key={s.href}>
              <Link href={s.href} className={`group flex h-full flex-col justify-between rounded-[var(--radius-card)] p-6 transition-transform duration-150 hover:-translate-y-0.5 sm:p-8 ${i === 0 ? "on-dark bg-charcoal text-white" : i === 3 ? "bg-amber text-ink" : "bg-porcelain"}`}>
                <div>
                  <h3 className="text-[1.45rem] font-extrabold">{s.title}</h3>
                  <p className={`mt-2 leading-relaxed ${i === 0 ? "text-white/80" : "text-ink/75"}`}>{s.body}</p>
                </div>
                <span className="mt-6 font-bold underline decoration-2 underline-offset-4 group-hover:decoration-4">Learn more <span aria-hidden="true">→</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* HOW IT WORKS */}
      <Section tone="dark" labelledBy="process-title" id="how-it-works">
        <Heading id="process-title" eyebrow="The process" title={home.process.title} tone="dark" />
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {home.process.steps.map((s, i) => (
            <li key={s.title} className="relative rounded-[var(--radius-card)] bg-charcoal-2 p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber text-lg font-black text-ink">{i + 1}</span>
              <h3 className="mt-4 text-lg font-extrabold">{s.title}</h3>
              <p className="mt-1.5 leading-relaxed text-white/75">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-2xl text-white/70">Sending a request doesn't book an appointment by itself. We'll confirm a time with you directly.</p>
      </Section>

      {/* MAINTENANCE */}
      <Section labelledBy="plan-title">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Heading id="plan-title" eyebrow="Maintenance" title={home.maintenance.title} sub={home.maintenance.body} />
            <ul className="mt-6 space-y-3">
              {home.maintenance.points.map((p) => (
                <li key={p} className="flex items-center gap-3 font-semibold">
                  <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-charcoal text-xs text-amber">✓</span>
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-steel-dark">{home.maintenance.note}</p>
            <Link href="/maintenance" className="btn btn-dark mt-6">Request plan details</Link>
          </div>
          <div aria-hidden="true" className="grid grid-cols-2 gap-4">
            <div className="rounded-[var(--radius-card)] bg-amber p-6">
              <p className="eyebrow">Spring</p>
              <p className="mt-10 text-2xl font-black">Cooling check</p>
            </div>
            <div className="on-dark translate-y-8 rounded-[var(--radius-card)] bg-charcoal p-6 text-white">
              <p className="eyebrow text-amber">Fall</p>
              <p className="mt-10 text-2xl font-black">Heating check</p>
            </div>
          </div>
        </div>
      </Section>

      {/* SERVICE AREA */}
      <Section tone="white" labelledBy="area-title">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <Heading
            id="area-title"
            eyebrow="Service area"
            title={home.areaTitle}
            sub={`We're starting in ${b.serviceAreaCommunities.join(", ")} and nearby communities in ${b.serviceAreaLabel}. Enter your ZIP in the request form to see if we can take your request.`}
          />
          <Link href="/service-area" className="btn btn-outline">See our area</Link>
        </div>
      </Section>

      {/* ABOUT: honest approach copy, no invented biography. Reviews intentionally hidden until real ones exist. */}

      {/* FAQ */}
      <Section labelledBy="faq-title">
        <Heading id="faq-title" eyebrow="Questions" title="Good to know" />
        <div className="mt-8 max-w-3xl">
          <Faq items={faqs} />
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }} />
      </Section>

      {/* ENDCAP */}
      <section className="on-dark relative overflow-hidden bg-charcoal text-white" aria-labelledby="endcap-title">
        <div aria-hidden="true" className="absolute -right-24 top-0 hidden h-full w-[34%] skew-x-[-14deg] bg-amber md:block" />
        <div aria-hidden="true" className="absolute -right-24 top-0 hidden h-full w-[17%] skew-x-[-14deg] bg-steel md:block" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 id="endcap-title" className="max-w-[16ch] text-[2.1rem] font-black leading-[1.05] sm:text-[3rem]">{home.closing}</h2>
          <HeroActions compact />
        </div>
      </section>
    </>
  );
}

function splitHeadline(h: string): [string, string] {
  const i = h.indexOf(". ");
  return i > 0 ? [h.slice(0, i + 1), h.slice(i + 2)] : [h, ""];
}
