"use client";
import Link from "next/link";
import { businessConfig as b } from "@/config/business";
import { track } from "@/lib/analytics";

/** Primary request CTA plus a phone CTA that only renders when a real number is configured. */
export function HeroActions({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${compact ? "mt-7" : "mt-8"}`}>
      <Link href="/book" onClick={() => track("hero_request_clicked", { location: compact ? "endcap" : "hero" })} className="btn btn-amber px-7 text-[1.05rem]">
        Request Service <span aria-hidden="true">→</span>
      </Link>
      {b.publicPhone ? (
        <a href={`tel:${b.publicPhone}`} onClick={() => track("call_clicked", { location: compact ? "endcap" : "hero" })} className="btn btn-ghost-light px-7 text-[1.05rem]">
          Call {b.shortName} · {b.publicPhoneDisplay}
        </a>
      ) : !compact ? (
        <a href="#how-it-works" className="btn btn-ghost-light px-7 text-[1.05rem]">How it works</a>
      ) : null}
    </div>
  );
}
