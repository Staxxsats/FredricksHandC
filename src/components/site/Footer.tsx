import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { businessConfig as b } from "@/config/business";
import { nav } from "@/content/site";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="on-dark bg-charcoal text-white/85">
      <div aria-hidden="true" className="h-2 w-full bg-[linear-gradient(90deg,var(--color-amber)_0_60%,var(--color-steel)_60%)]" />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <BrandMark size="md" />
          <p className="mt-5 max-w-xs text-[0.95rem] leading-relaxed text-white/75">{b.primaryTagline}</p>
          <Link href="/book" className="btn btn-amber mt-6">Request Service</Link>
        </div>
        <div>
          <h2 className="eyebrow text-amber">Services</h2>
          <ul className="mt-4 space-y-2.5">
            {nav.services.map((s) => <li key={s.href}><Link href={s.href} className="hover:text-white">{s.label}</Link></li>)}
            <li><Link href="/maintenance" className="hover:text-white">Comfort Plan</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="eyebrow text-amber">Company</h2>
          <ul className="mt-4 space-y-2.5">
            <li><Link href="/about" className="hover:text-white">About</Link></li>
            <li><Link href="/service-area" className="hover:text-white">Service area</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="eyebrow text-amber">Contact</h2>
          <ul className="mt-4 space-y-2.5">
            {b.publicPhone && <li><a href={`tel:${b.publicPhone}`} className="hover:text-white">{b.publicPhoneDisplay}</a></li>}
            {b.publicEmail && <li><a href={`mailto:${b.publicEmail}`} className="hover:text-white">{b.publicEmail}</a></li>}
            <li><Link href="/book" className="hover:text-white">Send a service request</Link></li>
            <li className="text-white/70">Serving {b.serviceAreaLabel}</li>
            {b.businessHours && <li className="text-white/70">{b.businessHours}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-white/65 sm:flex-row sm:justify-between sm:px-6">
          <p>© {year} {b.legalName ?? b.displayName}</p>
          <p className="flex gap-5">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
