/**
 * Single source of truth for public business facts.
 *
 * Every `null` here is an UNVERIFIED owner fact. The site is written to hide
 * or degrade gracefully when a value is null: no fake phone numbers, no
 * invented address, no "open now". See LAUNCH_READINESS.md.
 */
export const businessConfig = {
  /** VERIFY BEFORE LIVE: final spelling (Frederick's vs Fredrick's) not locked. */
  displayName: "Frederick's Heating & Cooling",
  shortName: "Frederick's",
  wordmarkPrimary: "FREDERICK'S",
  wordmarkDescriptor: "HEATING & COOLING",
  legalName: null as string | null,
  primaryTagline: "When comfort matters, call Frederick's.",
  heroHeadline: "Call Frederick's. Comfort starts here.",
  directResponseLine: "Need heat? Need air? Call Frederick's.",
  brandStyle: "bold-neighborhood",
  publicPhone: null as string | null, // E.164, e.g. "+16785550100" once a real line exists
  publicPhoneDisplay: null as string | null,
  publicEmail: null as string | null,
  publicDomain: null as string | null,
  publicStreetAddress: null as string | null, // never invent or expose a home address
  /** WORKING ASSUMPTION: owner review before live. */
  serviceAreaLabel: "the Gwinnett area",
  serviceAreaCommunities: ["Snellville"] as string[], // add only owner-approved communities
  businessHours: null as string | null,
  timeZone: "America/New_York",
  emergencyServiceEnabled: false,
  instantBookingEnabled: false,
  siteMode: "prelaunch" as "prelaunch" | "live",
  publicPricingApproved: false,
  serviceCategoriesApproved: false,
  membershipSalesEnabled: false,
  paymentProcessingEnabled: false,
  smsMarketingEnabled: false,
  aiReceptionistEnabled: false,
  outboundAutomationEnabled: false,
  reviewsEnabled: false,
  logoStatus: "rejected-monogram-pending-redesign",
} as const;

export const hasPhone = () => Boolean(businessConfig.publicPhone);
export const telHref = () => (businessConfig.publicPhone ? `tel:${businessConfig.publicPhone}` : null);

/** Consent text versions. Bump the version whenever wording changes. */
export const consentText = {
  service_contact: {
    version: "2026-11-07.1",
    text: "I agree that Frederick's may contact me by phone, text, or email about this service request.",
  },
  marketing: {
    version: "2026-11-07.1",
    text: "Optional: send me occasional seasonal maintenance reminders and offers. I can opt out any time.",
  },
} as const;
