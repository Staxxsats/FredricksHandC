import { z } from "zod";
import { ISSUES, SYSTEM_RUNNING, URGENCY, SYSTEM_TYPES, SYSTEM_AGES, PROPERTY_TYPES, RELATIONSHIPS, WINDOWS, normalizePhone } from "./request-shared";

export * from "./request-shared";

const trimmed = (max: number) => z.string().trim().max(max);
const optEnum = <T extends readonly [string, ...string[]]>(v: T) =>
  z.enum(v).optional().or(z.literal("").transform(() => undefined));

export const serviceRequestSchema = z
  .object({
    idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
    // Step 1
    issue: z.enum(ISSUES),
    notes: trimmed(1500).optional().default(""),
    // Step 2
    zip: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"),
    systemRunning: z.enum(SYSTEM_RUNNING),
    urgency: z.enum(URGENCY),
    safetyConcern: z.boolean().optional().default(false),
    // Step 3
    systemType: optEnum(SYSTEM_TYPES),
    systemAge: optEnum(SYSTEM_AGES),
    propertyType: z.enum(PROPERTY_TYPES),
    street: trimmed(160).min(3, "Enter the street address"),
    unit: trimmed(40).optional().default(""),
    city: trimmed(80).optional().default(""),
    preferredDay: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
    preferredWindow: optEnum(WINDOWS),
    // Step 4
    name: trimmed(120).min(2, "Enter your name"),
    phone: z.string().trim().transform((v, ctx) => {
      const n = normalizePhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit mobile number" });
        return z.NEVER;
      }
      return n;
    }),
    email: z.string().trim().max(200).email("Enter a valid email or leave it blank").optional().or(z.literal("").transform(() => undefined)),
    relationship: z.enum(RELATIONSHIPS),
    tenantContact: trimmed(300).optional().default(""),
    consentService: z.literal(true, { message: "We need your OK to contact you about this request" }),
    consentMarketing: z.boolean().default(false),
    // Attribution (no PII)
    attribution: z
      .object({
        landingPath: trimmed(300).optional(),
        referrer: trimmed(500).optional(),
        utm: z.record(z.string().max(40), z.string().max(200)).optional(),
      })
      .optional()
      .default({}),
    // Anti-spam
    website: z.string().max(0, "spam").optional().default(""), // honeypot: real users never fill this
    startedAt: z.number().int().positive(),
  })
  .superRefine((v, ctx) => {
    if (v.relationship === "tenant" && v.tenantContact.length < 3) {
      ctx.addIssue({ code: "custom", path: ["tenantContact"], message: "Add your landlord or property manager's contact, or confirm you have permission" });
    }
  });

export type ServiceRequestInput = z.input<typeof serviceRequestSchema>;
export type ServiceRequest = z.output<typeof serviceRequestSchema>;

