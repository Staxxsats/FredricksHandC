import type { Metadata } from "next";
import Link from "next/link";
import { businessConfig as b } from "@/config/business";
import { PageHero } from "@/components/site/ServicePage";
import { Section } from "@/components/site/Section";

export const metadata: Metadata = { title: "Contact", description: `Contact ${b.displayName}.`, alternates: { canonical: "/contact" } };

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's get your comfort back" lead="The quickest way to reach us is a service request. It goes straight to our inbox and gets a reference number." cta={{ href: "/book", label: "Request Service" }} />
      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card p-6">
            <h2 className="eyebrow text-steel-dark">Service requests</h2>
            <p className="mt-2 font-semibold">Online, any time</p>
            <Link href="/book" className="mt-3 inline-block font-bold underline">Start a request</Link>
          </div>
          {b.publicPhone && (
            <div className="card p-6">
              <h2 className="eyebrow text-steel-dark">Phone</h2>
              <a href={`tel:${b.publicPhone}`} className="mt-2 block text-xl font-extrabold">{b.publicPhoneDisplay}</a>
            </div>
          )}
          {b.publicEmail && (
            <div className="card p-6">
              <h2 className="eyebrow text-steel-dark">Email</h2>
              <a href={`mailto:${b.publicEmail}`} className="mt-2 block font-extrabold">{b.publicEmail}</a>
            </div>
          )}
          <div className="card p-6">
            <h2 className="eyebrow text-steel-dark">Area</h2>
            <p className="mt-2 font-semibold">{b.serviceAreaLabel}</p>
            <Link href="/service-area" className="mt-3 inline-block font-bold underline">See our area</Link>
          </div>
          {b.businessHours && (
            <div className="card p-6">
              <h2 className="eyebrow text-steel-dark">Hours</h2>
              <p className="mt-2 font-semibold">{b.businessHours}</p>
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
