const TZ = "America/New_York";

export function fmtDateTime(v: string | Date | null | undefined): string {
  if (!v) return "";
  return new Date(v).toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function fmtRelative(v: string | Date): string {
  const mins = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return fmtDateTime(v);
}

/** Parse a <input type="datetime-local"> value as America/New_York wall-clock time. */
export function parseLocalNY(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Find the NY offset at that moment and correct for it.
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(guess))
    .reduce<Record<string, number>>((a, p) => (p.type !== "literal" && (a[p.type] = Number(p.value)), a), {});
  const asNY = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return new Date(guess - (asNY - guess));
}
