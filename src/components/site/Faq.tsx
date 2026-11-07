export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-charcoal/10 rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-1 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[1.02rem] font-bold [&::-webkit-details-marker]:hidden">
            {f.q}
            <span aria-hidden="true" className="text-xl font-black text-amber-deep transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="pb-5 leading-relaxed text-ink/80">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
