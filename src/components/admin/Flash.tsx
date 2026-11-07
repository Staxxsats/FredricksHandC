export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <p role={err ? "alert" : "status"} className={`mb-6 rounded-lg px-4 py-3 font-semibold ${err ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
      {err || ok}
    </p>
  );
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  const tone: Record<string, string> = {
    new: "bg-amber text-ink",
    contacted: "bg-steel/30 text-ink",
    qualified: "bg-charcoal text-white",
    confirmed: "bg-success text-white",
    ineligible: "bg-black/10 text-ink/70",
    closed: "bg-black/10 text-ink/70",
    duplicate: "bg-black/10 text-ink/70",
  };
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${tone[status] ?? "bg-black/10"}`}>{label}</span>;
}
