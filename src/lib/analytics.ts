/**
 * Privacy-conscious conversion events. Payloads may contain ONLY coarse, non-identifying
 * values (issue slug, step number, page location). No names, phones, emails, addresses,
 * or free text. No provider is chosen yet, so events go to window.dataLayer if a future
 * tag manager defines it, and are otherwise dropped.
 */
export type AnalyticsEvent =
  | "hero_request_clicked"
  | "call_clicked"
  | "issue_selected"
  | "service_request_started"
  | "service_request_step_completed"
  | "service_request_submitted"
  | "service_request_failed"
  | "maintenance_interest_submitted";

const ALLOWED_KEYS = new Set(["location", "issue", "step", "reason", "zip_eligible", "urgency"]);

export function sanitize(props: Record<string, string | number | boolean | undefined>) {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!ALLOWED_KEYS.has(k) || v === undefined) continue;
    if (typeof v === "string" && v.length > 40) continue;
    out[k] = v;
  }
  return out;
}

export function track(event: AnalyticsEvent, props: Record<string, string | number | boolean | undefined> = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  const payload = { event, ...sanitize(props) };
  if (Array.isArray(w.dataLayer)) w.dataLayer.push(payload);
  if (process.env.NODE_ENV === "development") console.debug("[analytics]", payload);
}
