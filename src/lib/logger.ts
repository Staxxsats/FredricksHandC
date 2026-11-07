/**
 * Structured logger that never prints customer PII. Known sensitive keys are redacted,
 * and Error objects are reduced to name/message/stack.
 */
const SENSITIVE = /^(name|phone|email|street|unit|address|notes|tenant_?contact|token|password.*|cookie|authorization)$/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth]";
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack?.split("\n").slice(0, 5).join("\n") };
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE.test(k) ? "[redacted]" : scrub(v, depth + 1);
    return out;
  }
  return value;
}

function emit(level: "info" | "warn" | "error", event: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && level === "info") return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...(scrub(data ?? {}) as object) });
  (level === "error" ? console.error : console.log)(line);
}

export const logger = {
  info: (e: string, d?: Record<string, unknown>) => emit("info", e, d),
  warn: (e: string, d?: Record<string, unknown>) => emit("warn", e, d),
  error: (e: string, d?: Record<string, unknown>) => emit("error", e, d),
  scrub,
};
