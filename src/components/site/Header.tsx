"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { nav } from "@/content/site";
import { businessConfig as b } from "@/config/business";
import { track } from "@/lib/analytics";

export function Header() {
  const [open, setOpen] = useState(false);
  const [svcOpen, setSvcOpen] = useState(false);
  const pathname = usePathname();
  const svcRef = useRef<HTMLDivElement>(null);
  const tel = b.publicPhone ? `tel:${b.publicPhone}` : null;

  // Close menus after navigation (render-time state adjustment, no effect needed).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
    setSvcOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(false), setSvcOpen(false));
    const onClick = (e: MouseEvent) => svcRef.current && !svcRef.current.contains(e.target as Node) && setSvcOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <header className="on-dark sticky top-0 z-40 bg-charcoal text-white shadow-[0_1px_0_rgb(255_255_255/0.06)]">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label={`${b.displayName} home`}>
          <BrandMark size="sm" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          <div className="relative" ref={svcRef}>
            <button
              type="button"
              className="rounded-md px-3 py-2 text-[0.95rem] font-semibold hover:text-amber"
              aria-expanded={svcOpen}
              aria-controls="services-menu"
              onClick={() => setSvcOpen((v) => !v)}
            >
              Services <span aria-hidden="true">▾</span>
            </button>
            {svcOpen && (
              <ul id="services-menu" className="absolute left-0 top-full mt-2 w-60 overflow-hidden rounded-xl bg-white py-2 text-ink shadow-[var(--shadow-lift)]">
                {nav.services.map((s) => (
                  <li key={s.href}>
                    <Link href={s.href} className="block px-4 py-2.5 font-semibold hover:bg-porcelain">
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {nav.main.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-[0.95rem] font-semibold hover:text-amber" aria-current={pathname === n.href ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {tel && (
            <a href={tel} onClick={() => track("call_clicked", { location: "header" })} className="btn btn-ghost-light hidden min-h-[44px] px-4 py-2 sm:inline-flex">
              {b.publicPhoneDisplay}
            </a>
          )}
          <Link href="/book" onClick={() => track("hero_request_clicked", { location: "header" })} className="btn btn-amber hidden min-h-[44px] px-4 py-2 sm:inline-flex">
            Request Service
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border-2 border-white/25 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-white/10 bg-charcoal px-4 pb-6 pt-2 lg:hidden">
          <p className="eyebrow mt-3 text-amber">Services</p>
          <ul className="mt-1">
            {nav.services.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="block py-3 text-lg font-semibold">{s.label}</Link>
              </li>
            ))}
          </ul>
          <ul className="mt-2 border-t border-white/10 pt-2">
            {nav.main.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block py-3 text-lg font-semibold">{n.label}</Link>
              </li>
            ))}
          </ul>
          <Link href="/book" className="btn btn-amber mt-4 w-full">Request Service</Link>
        </nav>
      )}
    </header>
  );
}
