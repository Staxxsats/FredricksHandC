/** Simple single-weight line icons for the issue cards. Deliberately plain: no mascots, no emblem. */
export function IssueIcon({ slug, className = "" }: { slug: string; className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" className={className}>
      {slug === "no-heat" && (<><path {...p} d="M16 4c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-8z" /><path {...p} d="M5 27h22" /></>)}
      {slug === "ac-not-cooling" && (<><path {...p} d="M16 3v26M5 9.5l22 13M27 9.5l-22 13" /><path {...p} d="M12.5 5.5 16 8l3.5-2.5M12.5 26.5 16 24l3.5 2.5" /></>)}
      {slug === "noise-leak-airflow" && (<><path {...p} d="M4 12h14a4 4 0 1 0-4-4M4 18h20a4 4 0 1 1-4 4M4 24h8" /></>)}
      {slug === "maintenance" && (<><rect {...p} x="5" y="7" width="22" height="20" rx="3" /><path {...p} d="M5 13h22M11 4v6M21 4v6M12 20l3 3 6-6" /></>)}
      {slug === "other" && (<><circle {...p} cx="16" cy="16" r="12" /><path {...p} d="M12.5 12.5a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.3-1.5 2.3v.5M16 22.5v.5" /></>)}
    </svg>
  );
}
