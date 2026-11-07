/** Client-safe request constants and helpers (no zod, keeps the public bundle small). */
export const ISSUES = ["no-heat", "ac-not-cooling", "noise-leak-airflow", "maintenance", "other"] as const;
export const SYSTEM_RUNNING = ["yes", "partially", "no", "not_sure"] as const;
export const URGENCY = ["asap", "few_days", "flexible"] as const;
export const SYSTEM_TYPES = ["central_ac", "heat_pump", "gas_furnace", "electric_furnace", "mini_split", "not_sure"] as const;
export const SYSTEM_AGES = ["0-5", "6-10", "11-15", "16+", "not_sure"] as const;
export const PROPERTY_TYPES = ["home", "rental", "other"] as const;
export const RELATIONSHIPS = ["owner", "tenant", "property_manager"] as const;
export const WINDOWS = ["morning", "midday", "afternoon", "any"] as const;
export const SOURCES = [
  "google_organic", "google_business_profile", "google_ads", "facebook", "nextdoor",
  "referral", "partner", "direct", "phone", "offline", "other",
] as const;

export const labels: Record<string, string> = {
  "no-heat": "No heat",
  "ac-not-cooling": "AC not cooling",
  "noise-leak-airflow": "Noise, leak, or airflow",
  maintenance: "Tune-up / maintenance",
  other: "Something else",
  yes: "Yes",
  partially: "Partially",
  no: "No",
  not_sure: "Not sure",
  asap: "As soon as possible",
  few_days: "In the next few days",
  flexible: "I'm flexible",
  central_ac: "Central AC",
  heat_pump: "Heat pump",
  gas_furnace: "Gas furnace",
  electric_furnace: "Electric furnace",
  mini_split: "Ductless mini-split",
  "0-5": "0–5 years",
  "6-10": "6–10 years",
  "11-15": "11–15 years",
  "16+": "16+ years",
  home: "Home I live in",
  rental: "Rental property",
  owner: "I own it",
  tenant: "I rent it",
  property_manager: "I manage it",
  morning: "Morning (8–11)",
  midday: "Midday (11–2)",
  afternoon: "Afternoon (2–5)",
  any: "Any time",
};

/** Normalize a US phone number to +1XXXXXXXXXX, or null if invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const d = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) return null; // NANP area/exchange can't start with 0/1
  return `+1${d}`;
}

export function formatPhone(e164: string): string {
  const d = e164.replace(/^\+1/, "");
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const SAFETY_PATTERNS = [
  /\bgas\s*(smell|leak|odor|odour)\b/i,
  /\bsmell\w*\s+(of\s+)?(gas|natural gas|propane|rotten eggs?)\b/i,
  /\brotten egg/i,
  /\bcarbon monoxide\b/i,
  /\bco\s*(alarm|detector|leak)\b/i,
  /\bsmoke\b/i,
  /\bfire\b/i,
  /\bflames?\b/i,
  /\bspark(s|ing)?\b/i,
  /\bburning (wire|plastic|electrical)/i,
  /\belectrical (burning|smell|fire)/i,
];

/** Plain keyword check. Deterministic on purpose: no LLM decides safety messaging. */
export function detectSafetyConcern(text: string): boolean {
  return SAFETY_PATTERNS.some((p) => p.test(text));
}

const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L

export function generateRef(rand: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = rand(6);
  let s = "";
  for (const b of bytes) s += REF_ALPHABET[b % REF_ALPHABET.length];
  return `FHC-${s}`;
}

/** Map referrer + UTM to a lead source. */
export function inferSource(utm: Record<string, string> = {}, referrer?: string): (typeof SOURCES)[number] {
  const src = (utm.utm_source || "").toLowerCase();
  const med = (utm.utm_medium || "").toLowerCase();
  if (src.includes("gbp") || src.includes("business_profile")) return "google_business_profile";
  if (src.includes("google") && (med.includes("cpc") || med.includes("paid"))) return "google_ads";
  if (src.includes("facebook") || src.includes("fb")) return "facebook";
  if (src.includes("nextdoor")) return "nextdoor";
  if (src.includes("referral") || med.includes("referral")) return "referral";
  if (src.includes("partner")) return "partner";
  if (src) return "other";
  let host = "";
  try {
    host = referrer ? new URL(referrer).hostname : "";
  } catch {}
  if (/google\./.test(host)) return "google_organic";
  if (/facebook\.com|fb\.com/.test(host)) return "facebook";
  if (/nextdoor\.com/.test(host)) return "nextdoor";
  if (host) return "referral";
  return "direct";
}
