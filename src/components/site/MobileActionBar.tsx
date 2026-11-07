"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { businessConfig as b } from "@/config/business";
import { track } from "@/lib/analytics";

/** Sticky bottom bar on phones. Hidden on the request flow so it never covers form fields. */
export function MobileActionBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/book")) return null;
  return (
    <>
      <div className="h-[76px] sm:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 p-3 backdrop-blur sm:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="flex gap-2">
          {b.publicPhone && (
            <a href={`tel:${b.publicPhone}`} onClick={() => track("call_clicked", { location: "mobile_bar" })} className="btn btn-dark flex-1">
              Call
            </a>
          )}
          <Link href="/book" onClick={() => track("hero_request_clicked", { location: "mobile_bar" })} className="btn btn-amber flex-[2]">
            Request Service
          </Link>
        </div>
      </div>
    </>
  );
}
