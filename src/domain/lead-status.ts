/**
 * Lead lifecycle for Phase 1. Every transition is a deliberate staff action and
 * writes an audit event. Nothing automatic can move a lead to `confirmed`.
 *
 *   new ──> contacted ──> qualified ──> confirmed
 *    │         │             │
 *    ├─────────┴─────────────┴──> ineligible | closed
 *    └──> duplicate
 *
 * Phase 2 extends `confirmed` into appointments / work orders.
 */
export const LEAD_STATUSES = ["new", "contacted", "qualified", "confirmed", "ineligible", "closed", "duplicate"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["contacted", "qualified", "ineligible", "closed", "duplicate"],
  contacted: ["qualified", "ineligible", "closed", "duplicate"],
  qualified: ["confirmed", "contacted", "ineligible", "closed"],
  confirmed: ["qualified", "closed"], // un-confirm (e.g. customer cancels) goes back to qualified
  ineligible: ["new"],
  closed: ["new"],
  duplicate: ["new"],
};

export const statusLabel: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  confirmed: "Appointment confirmed",
  ineligible: "Not eligible",
  closed: "Closed",
  duplicate: "Duplicate",
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Statuses that require extra data at transition time. */
export const REQUIRES: Partial<Record<LeadStatus, ("reason" | "scheduledFor" | "duplicateOf")[]>> = {
  ineligible: ["reason"],
  closed: ["reason"],
  confirmed: ["scheduledFor"],
};
