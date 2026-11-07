import type { ReactNode } from "react";

export function Section({ children, tone = "light", className = "", id, labelledBy }: { children: ReactNode; tone?: "light" | "white" | "dark"; className?: string; id?: string; labelledBy?: string }) {
  const bg = { light: "bg-porcelain", white: "bg-white", dark: "on-dark bg-charcoal text-white" }[tone];
  return (
    <section id={id} aria-labelledby={labelledBy} className={`${bg} ${className}`}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">{children}</div>
    </section>
  );
}

export function Heading({ eyebrow, title, sub, id, tone = "light" }: { eyebrow?: string; title: string; sub?: string; id?: string; tone?: "light" | "dark" }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className={`eyebrow ${tone === "dark" ? "text-amber" : "text-steel-dark"}`}>{eyebrow}</p>}
      <h2 id={id} className="mt-2 text-[1.85rem] font-extrabold leading-[1.12] tracking-tight sm:text-[2.35rem]">{title}</h2>
      {sub && <p className={`mt-3 text-[1.05rem] leading-relaxed ${tone === "dark" ? "text-white/80" : "text-ink/75"}`}>{sub}</p>}
    </div>
  );
}
