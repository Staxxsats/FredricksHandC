import { businessConfig as b } from "@/config/business";

/**
 * Temporary typographic wordmark. The previously generated "F" emblem was REJECTED by the
 * owner and must not be reused or redrawn. When a new mark is approved, swap the
 * implementation here; every page uses this one component.
 */
export function BrandMark({ tone = "dark", size = "md", className = "" }: { tone?: "dark" | "light"; size?: "sm" | "md" | "lg"; className?: string }) {
  const primary = tone === "dark" ? "text-white" : "text-charcoal";
  const scale = { sm: "text-[1.15rem]", md: "text-[1.45rem]", lg: "text-[2.6rem] sm:text-[3.4rem]" }[size];
  const bar = { sm: "text-[0.5rem] py-[2px]", md: "text-[0.6rem] py-[3px]", lg: "text-[0.95rem] sm:text-[1.2rem] py-[5px]" }[size];
  return (
    <span className={`inline-flex flex-col leading-none select-none ${className}`} aria-label={b.displayName} role="img">
      <span className={`${primary} ${scale} font-black italic tracking-[-0.01em]`} style={{ fontVariationSettings: "'wght' 900" }}>
        {b.wordmarkPrimary}
      </span>
      <span aria-hidden="true" className={`mt-[0.28em] flex -skew-x-12 overflow-hidden rounded-[3px] font-extrabold italic tracking-[0.18em] text-ink ${bar}`}>
        <span className="bg-amber pl-[0.9em] pr-[0.35em] skew-x-12">HEATING&nbsp;&amp;</span>
        <span className="bg-steel pl-[0.35em] pr-[0.9em] skew-x-12">COOLING</span>
      </span>
    </span>
  );
}
