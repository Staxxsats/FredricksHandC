/**
 * Owner-editable copy. Keep marketing text here, not inside components.
 * Status notes: anything marked WORKING is provisional and must be approved before launch.
 */
import { businessConfig as b } from "@/config/business";

export type IssueSlug = "no-heat" | "ac-not-cooling" | "noise-leak-airflow" | "maintenance" | "other";

export const issues: { slug: IssueSlug; label: string; hint: string; service: string }[] = [
  { slug: "no-heat", label: "No heat", hint: "Furnace or heat pump isn't keeping you warm", service: "heating" },
  { slug: "ac-not-cooling", label: "AC not cooling", hint: "Running warm, short-cycling, or not starting", service: "cooling" },
  { slug: "noise-leak-airflow", label: "Strange noise, leak, or airflow", hint: "Rattling, dripping, weak vents, odd smells", service: "repairs" },
  { slug: "maintenance", label: "Tune-up / maintenance", hint: "Seasonal check before it gets busy", service: "maintenance" },
  { slug: "other", label: "Something else", hint: "Thermostat, not sure, or anything else", service: "repairs" },
];

export const nav = {
  services: [
    { href: "/heating", label: "Heating" },
    { href: "/cooling", label: "Cooling & AC" },
    { href: "/repairs", label: "Diagnostics & Repairs" },
  ],
  main: [
    { href: "/maintenance", label: "Maintenance" },
    { href: "/service-area", label: "Our Area" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
};

export const home = {
  heroEyebrow: `Heating & cooling for ${b.serviceAreaLabel}`,
  heroHeadline: b.heroHeadline,
  heroSub: `Heating, cooling, repairs, and seasonal maintenance for our neighbors in ${b.serviceAreaLabel}.`,
  heroPoints: ["Plain-English explanations", "You approve the price before work starts", "Every request gets tracked and answered"],
  issuesTitle: "What's going on with your system?",
  issuesSub: "Pick the closest match. It takes about two minutes to send a request.",
  trust: [
    { title: "Clear explanations", body: "We tell you what we found and what it means, without the jargon." },
    { title: "Approval before work", body: "You see the options and the price first. Nothing extra gets done without your OK." },
    { title: "Straight communication", body: "Every request is logged, so nobody falls through the cracks." },
  ],
  servicesTitle: "What we can help with",
  process: {
    title: "How it works",
    steps: [
      { title: "Tell us what's happening", body: "Send a short request online. No technical terms needed." },
      { title: "We confirm the next step", body: "A real person reviews it and reaches out to set a time that works." },
      { title: "On-site diagnosis", body: "We find the cause and walk you through what we see." },
      { title: "You get a clear plan", body: "Straightforward options and a price you approve before any work." },
    ],
  },
  maintenance: {
    title: "The Frederick's Comfort Plan",
    body: "A simple way to keep your system checked twice a year, before the first heat wave and the first cold snap.",
    points: ["Spring cooling check", "Fall heating check", "Reminders so you never have to remember", "A service history for your home"],
    note: "Plan terms and pricing are still being finalized.",
  },
  areaTitle: "Where we work",
  closing: b.directResponseLine,
};

export const faqs: { q: string; a: string }[] = [
  {
    q: "What happens after I send a request?",
    a: "Your request is saved and reviewed by a person. We'll reach out to confirm details and offer a time. Your appointment isn't booked until we confirm it with you.",
  },
  {
    q: "Is there a fee for a diagnostic visit?",
    a: "Diagnostic pricing is being finalized. We'll always tell you the visit fee before anyone comes out.",
  },
  {
    q: "What should I have ready?",
    a: "If you can, note what the system is doing, when it started, and the brand on the outdoor or indoor unit. A photo of the unit's label helps too, but it's not required.",
  },
  {
    q: "Do you serve my area?",
    a: "Enter your ZIP code in the request form and we'll tell you right away whether we're taking requests there.",
  },
  {
    q: "Will I get a price before work starts?",
    a: "Yes. After we diagnose the problem you'll get clear options and a price. Work starts only after you approve it.",
  },
  {
    q: "Do you offer a maintenance plan?",
    a: "We're finalizing the Frederick's Comfort Plan. You can request plan details and we'll share the terms once they're ready.",
  },
];

export const safety = {
  title: "Safety first",
  lines: [
    "If you smell gas, leave the home now. Don't flip switches or use anything that could spark. From outside, call 911 or your gas utility's emergency line.",
    "If a carbon monoxide alarm is sounding or anyone feels dizzy, nauseous, or confused, get everyone outside to fresh air and call 911.",
    "If you see smoke, fire, sparking, or smell burning wires, leave the area and call 911.",
  ],
  after: "Once everyone is safe and the emergency is handled, you can still send us a request below.",
};

export const services = {
  heating: {
    title: "Heating Service",
    metaTitle: "Heating repair & furnace service",
    lead: "When the house won't warm up, you want someone who explains the problem and fixes it right.",
    intro: "We diagnose furnaces and heat pumps, find why the heat isn't keeping up, and give you clear options before any repair.",
    symptoms: [
      { title: "No heat at all", body: "System won't start, or the blower runs but the air stays cold." },
      { title: "Not keeping up", body: "Heat runs constantly but rooms stay chilly." },
      { title: "Heat pump icing", body: "Outdoor unit stays frosted or never defrosts." },
      { title: "Short cycling", body: "Turns on and off every few minutes." },
      { title: "Thermostat trouble", body: "Blank screen, wrong temperature, or no response." },
      { title: "Odd smells or sounds", body: "Burning dust is common at first. Persistent smells or banging aren't." },
    ],
    expect: "We start with a diagnostic visit, show you what we find, and explain the repair options and price before anything is fixed.",
    faqs: [
      { q: "Is a burning smell normal when I first turn on the heat?", a: "A light dusty smell for the first few minutes of the season is common. A strong, persistent, or electrical burning smell is not. Turn the system off and, if you see smoke, leave and call 911." },
      { q: "Do you work on heat pumps?", a: "Yes, heat-pump diagnostics and common repairs are part of what we're set up for. Tell us about your system when you request service." },
    ],
    issue: "no-heat" as IssueSlug,
  },
  cooling: {
    title: "Cooling & AC Service",
    metaTitle: "AC repair & cooling service",
    lead: "Georgia summers don't wait. Neither should you, when the AC quits.",
    intro: "We diagnose central AC and heat pumps in cooling mode, find the actual cause, and lay out the fix in plain English.",
    symptoms: [
      { title: "Blowing warm air", body: "Fan runs but the air isn't cold." },
      { title: "Won't turn on", body: "Nothing happens when the thermostat calls for cooling." },
      { title: "Water around the unit", body: "Leaks near the indoor unit or a full drain pan." },
      { title: "Ice on lines", body: "Frost on the copper lines or indoor coil." },
      { title: "Weak airflow", body: "Some rooms barely get any air." },
      { title: "Higher bills", body: "System runs longer than it used to for the same comfort." },
    ],
    expect: "We start with a diagnostic, show you what's wrong, and give options with a price you approve first.",
    faqs: [
      { q: "My AC is freezing up. What should I do?", a: "Turn cooling off and run the fan only to help it thaw, and check that your filter isn't clogged. Then send us a request so we can find the cause." },
      { q: "Do you handle refrigerant leaks?", a: "Refrigerant work is only done by properly certified technicians. We'll confirm what's needed after diagnosis." },
    ],
    issue: "ac-not-cooling" as IssueSlug,
  },
  repairs: {
    title: "Diagnostics & Repairs",
    metaTitle: "HVAC diagnostics & repairs",
    lead: "Find the real problem first. Then fix it once.",
    intro: "Many HVAC issues come down to a few common parts. We test before we replace, and we show you why a part failed.",
    symptoms: [
      { title: "Strange noises", body: "Grinding, squealing, buzzing, or banging." },
      { title: "Water leaks", body: "Condensate drains, pumps, and float switches." },
      { title: "Weak airflow", body: "Blower motors, filters, and minor duct issues." },
      { title: "Won't start", body: "Capacitors, contactors, and control boards." },
      { title: "Thermostat issues", body: "Replacement and smart thermostat setup." },
      { title: "Not sure", body: "Describe it in your own words and we'll sort it out." },
    ],
    expect: "Every repair starts with a diagnosis. You get the options and the price before work begins.",
    faqs: [
      { q: "Can you tell me the repair price over the phone?", a: "We can't quote a repair accurately without seeing the system. After diagnosis you'll get a clear price before any work." },
      { q: "Do you replace whole systems?", a: "Replacement work is handled case by case. If your system needs replacement, we'll explain why and talk through options honestly." },
    ],
    issue: "noise-leak-airflow" as IssueSlug,
  },
};

export const about = {
  title: "About Frederick's",
  lead: "A neighborhood HVAC company built around a simple idea: answer the request, explain the problem, and do what we said we'd do.",
  // Real company story and photos go here once the owner approves them. No invented history.
  approach: [
    { title: "We answer requests", body: "Every request is logged and followed up. If we can't help, we'll tell you that honestly." },
    { title: "We explain, then quote", body: "You'll understand what's wrong and see the price before any work starts." },
    { title: "We document the work", body: "You get a record of what we checked, found, and fixed." },
    { title: "We keep it practical", body: "No upselling for its own sake. The right fix, done properly." },
  ],
};
