import { createHash } from "node:crypto";

/** Salted hash of the client IP for rate limiting. Raw IPs are never stored. */
export function hashIp(headers: Headers): string {
  const ip = (headers.get("x-forwarded-for") || "").split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
  const salt = process.env.IP_HASH_SALT || "dev-only-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** Same-origin check for public POST endpoints (basic CSRF/abuse guard). */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  const host = headers.get("x-forwarded-host") || headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
