"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { issues, safety, type IssueSlug } from "@/content/site";
import { consentText, businessConfig as b } from "@/config/business";
import { labels, detectSafetyConcern, normalizePhone, SYSTEM_TYPES, SYSTEM_AGES, WINDOWS } from "@/domain/request-shared";
import { IssueIcon } from "@/components/site/IssueIcon";
import { track } from "@/lib/analytics";

type Form = {
  issue: IssueSlug | "";
  notes: string;
  safetyConcern: boolean;
  zip: string;
  systemRunning: string;
  urgency: string;
  systemType: string;
  systemAge: string;
  propertyType: string;
  street: string;
  unit: string;
  city: string;
  preferredDay: string;
  preferredWindow: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  tenantContact: string;
  consentService: boolean;
  consentMarketing: boolean;
  website: string; // honeypot
};

const STEPS = ["What's wrong?", "Where and how urgent?", "Your system and timing", "How we reach you", "Review and send"] as const;

const FIELD_STEP: Record<string, number> = {
  issue: 0, notes: 0, zip: 1, systemRunning: 1, urgency: 1, systemType: 2, systemAge: 2, propertyType: 2, street: 2, unit: 2, city: 2,
  preferredDay: 2, preferredWindow: 2, name: 3, phone: 3, email: 3, relationship: 3, tenantContact: 3, consentService: 3,
};

function newKey() {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(a, (x) => x.toString(16).padStart(2, "0")).join("");
}

function tomorrowISO() {
  const d = new Date(Date.now() + 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: b.timeZone });
}

export function BookingFlow({ initialIssue, enabledIssues, attribution }: {
  initialIssue: IssueSlug | null;
  enabledIssues: string[];
  attribution: { landingPath?: string; utm?: Record<string, string> };
}) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>({
    issue: initialIssue && enabledIssues.includes(initialIssue) ? initialIssue : "",
    notes: "", safetyConcern: false, zip: "", systemRunning: "", urgency: "", systemType: "", systemAge: "",
    propertyType: "", street: "", unit: "", city: "", preferredDay: "", preferredWindow: "", name: "", phone: "", email: "",
    relationship: "", tenantContact: "", consentService: false, consentMarketing: false, website: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [zipState, setZipState] = useState<"unknown" | "checking" | "eligible" | "out_of_area" | "error">("unknown");
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<{ ref: string; safetyFlag: boolean } | null>(null);
  const idemKey = useRef<string>("");
  const startedAt = useRef<number>(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    idemKey.current = newKey();
    startedAt.current = Date.now();
    track("service_request_started", { issue: initialIssue ?? undefined });
  }, [initialIssue]);

  // Move focus to the new step's heading so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, result]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const safetyShown = f.safetyConcern || detectSafetyConcern(f.notes);
  const availableIssues = useMemo(() => issues.filter((i) => enabledIssues.includes(i.slug)), [enabledIssues]);

  function validate(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 0 && !f.issue) e.issue = "Pick the option that fits best";
    if (s === 1) {
      if (!/^\d{5}$/.test(f.zip.trim())) e.zip = "Enter a 5-digit ZIP code";
      if (!f.systemRunning) e.systemRunning = "Let us know if the system is running";
      if (!f.urgency) e.urgency = "Choose how soon you need help";
    }
    if (s === 2) {
      if (!f.propertyType) e.propertyType = "Choose the property type";
      if (f.street.trim().length < 3) e.street = "Enter the street address";
    }
    if (s === 3) {
      if (f.name.trim().length < 2) e.name = "Enter your name";
      if (!normalizePhone(f.phone)) e.phone = "Enter a valid 10-digit mobile number";
      if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email or leave it blank";
      if (!f.relationship) e.relationship = "Tell us your connection to the property";
      if (f.relationship === "tenant" && f.tenantContact.trim().length < 3) e.tenantContact = "Add your landlord or property manager's contact, or confirm you have permission";
      if (!f.consentService) e.consentService = "We need your OK to contact you about this request";
    }
    return e;
  }

  function showErrors(e: Record<string, string>) {
    setErrors(e);
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  async function checkZip(): Promise<boolean> {
    setZipState("checking");
    try {
      const res = await fetch(`/api/zip-check?zip=${encodeURIComponent(f.zip.trim())}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const { eligible } = (await res.json()) as { eligible: boolean };
      setZipState(eligible ? "eligible" : "out_of_area");
      return eligible;
    } catch {
      setZipState("error");
      return false;
    }
  }

  async function next() {
    const e = validate(step);
    if (Object.keys(e).length) return showErrors(e);
    if (step === 1) {
      const ok = await checkZip();
      track("service_request_step_completed", { step: 2, zip_eligible: ok });
      if (!ok) return;
    } else {
      track("service_request_step_completed", { step: step + 1, issue: step === 0 ? f.issue : undefined });
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setErrors({});
    if (zipState === "out_of_area") setZipState("unknown");
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    for (let s = 0; s < 4; s++) {
      const e = validate(s);
      if (Object.keys(e).length) {
        setStep(s);
        return showErrors(e);
      }
    }
    setSubmitState("sending");
    setSubmitError("");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...f,
          safetyConcern: f.safetyConcern,
          idempotencyKey: idemKey.current,
          startedAt: startedAt.current,
          attribution: { ...attribution, referrer: document.referrer || undefined },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        track("service_request_submitted", { issue: f.issue, urgency: f.urgency });
        setResult({ ref: data.ref, safetyFlag: data.safetyFlag });
        return;
      }
      track("service_request_failed", { reason: data.code ?? String(res.status) });
      if (data.code === "invalid" && data.fieldErrors) {
        const fe = data.fieldErrors as Record<string, string>;
        const first = Math.min(...Object.keys(fe).map((k) => FIELD_STEP[k] ?? 4));
        setSubmitState("idle");
        setStep(first === Infinity ? 4 : first);
        return showErrors(fe);
      }
      if (data.code === "out_of_area") {
        setSubmitState("idle");
        setZipState("out_of_area");
        setStep(1);
        return;
      }
      setSubmitState("error");
      setSubmitError(
        data.code === "rate_limited"
          ? "We've received several requests from this connection in a short time. Please wait a few minutes and try again."
          : data.code === "category_unavailable"
            ? "We're not taking online requests for that type of service right now. Please go back and choose another option or check back soon."
            : "Your request was not sent. Nothing was saved. Please try again.",
      );
    } catch {
      track("service_request_failed", { reason: "network" });
      setSubmitState("error");
      setSubmitError("We couldn't reach our server, so your request was not sent. Check your connection and try again. You won't create a duplicate by retrying.");
    } finally {
      setSubmitState((s) => (s === "sending" ? "idle" : s));
    }
  }

  /* ----------------- Confirmation ----------------- */
  if (result) {
    return (
      <div className="step-in card overflow-hidden" role="status">
        <div className="on-dark bg-charcoal px-6 py-8 text-white sm:px-10">
          <p className="eyebrow text-amber">Request received</p>
          <h1 ref={headingRef} tabIndex={-1} className="outline-none focus:outline-none mt-2 text-[2rem] font-black leading-tight">Thanks. We've got your request.</h1>
          <p className="mt-3 text-white/80">
            Your reference number is <strong className="whitespace-nowrap rounded bg-white/10 px-2 py-0.5 font-mono text-[1.1rem] tracking-wider text-amber">{result.ref}</strong>
          </p>
        </div>
        <div className="space-y-5 px-6 py-8 sm:px-10">
          <div className="rounded-xl border-2 border-amber bg-amber/15 p-4">
            <p className="font-extrabold">This is not a confirmed appointment yet.</p>
            <p className="mt-1 text-ink/80">A person will review your request and contact you to confirm a time. Your preferred day and time were sent as a request only.</p>
          </div>
          {result.safetyFlag && (
            <div className="rounded-xl border-2 border-danger/40 bg-danger/5 p-4">
              <p className="font-extrabold text-danger">You mentioned a possible safety issue.</p>
              <p className="mt-1">If you smell gas, see smoke, or a carbon monoxide alarm is sounding, leave the home and call 911 or your gas utility now. Don't wait for us to call back.</p>
            </div>
          )}
          <div>
            <h2 className="text-lg font-extrabold">What happens next</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-ink/85">
              <li>We review your request and check the details.</li>
              <li>We reach out using the phone number you gave us to confirm a time.</li>
              <li>You get a confirmed appointment only when we've both agreed on it.</li>
            </ol>
          </div>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link href="/" className="btn btn-dark">Back to home</Link>
            {b.publicPhone && <a href={`tel:${b.publicPhone}`} className="btn btn-outline">Call {b.shortName}</a>}
          </div>
        </div>
      </div>
    );
  }

  /* ----------------- Steps ----------------- */
  const errList = Object.entries(errors).filter(([, v]) => v);
  const outOfArea = step === 1 && zipState === "out_of_area";

  return (
    <div className="card overflow-hidden">
      {/* Progress */}
      <div className="on-dark bg-charcoal px-5 pb-5 pt-5 text-white sm:px-8">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span aria-live="polite">Step {step + 1} of {STEPS.length}</span>
          <span className="text-white/60">About 2 minutes</span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-amber" : "bg-white/15"}`} />
          ))}
        </div>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 4) void next();
          else void submit();
        }}
        className="px-5 py-7 sm:px-8"
      >
        <h1 ref={headingRef} tabIndex={-1} className="outline-none focus:outline-none text-[1.65rem] font-black leading-tight tracking-tight sm:text-[1.9rem]">
          {outOfArea ? "We're not in your area yet" : STEPS[step]}
        </h1>

        {errList.length > 0 && (
          <div ref={summaryRef} tabIndex={-1} role="alert" className="outline-none mt-5 rounded-xl border-2 border-danger/40 bg-danger/5 p-4">
            <p className="font-extrabold text-danger">Please fix {errList.length === 1 ? "this" : "these"} to continue:</p>
            <ul className="mt-1.5 list-disc pl-5">
              {errList.map(([k, v]) => (
                <li key={k}><a href={`#f-${k}`} className="underline">{v}</a></li>
              ))}
            </ul>
          </div>
        )}

        {/* Honeypot: hidden from people and assistive tech */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} /></label>
        </div>

        <div key={`${step}-${outOfArea}`} className="step-in mt-6">
          {step === 0 && (
            <>
              <fieldset id="f-issue" aria-describedby={errors.issue ? "e-issue" : undefined}>
                <legend className="sr-only">What's wrong?</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableIssues.map((i) => {
                    const checked = f.issue === i.slug;
                    return (
                      <label key={i.slug} className={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-[border-color,background-color,transform] duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-amber ${checked ? "border-charcoal bg-amber/20" : "border-charcoal/15 bg-white hover:border-charcoal/40"}`}>
                        <input type="radio" name="issue" value={i.slug} checked={checked} onChange={() => { set("issue", i.slug); track("issue_selected", { issue: i.slug, location: "book" }); }} className="sr-only" />
                        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${checked ? "bg-charcoal text-amber" : "bg-porcelain text-charcoal"}`}>
                          <IssueIcon slug={i.slug} />
                        </span>
                        <span>
                          <span className="block font-extrabold leading-tight">{i.label}</span>
                          <span className="block text-sm text-steel-dark">{i.hint}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {errors.issue && <p id="e-issue" className="field-error">{errors.issue}</p>}

              <div className="mt-6">
                <label htmlFor="f-notes" className="field-label">Anything else we should know? <span className="font-normal text-steel-dark">(optional)</span></label>
                <textarea id="f-notes" rows={3} maxLength={1500} className="field-input" placeholder="In your own words, e.g. “Upstairs is warm and the outside unit is humming.”" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-porcelain p-4">
                <input type="checkbox" className="mt-1 h-5 w-5 accent-charcoal" checked={f.safetyConcern} onChange={(e) => set("safetyConcern", e.target.checked)} />
                <span><span className="font-bold">I smell gas, a carbon monoxide alarm is going off, or I see smoke or sparks</span></span>
              </label>
              {safetyShown && <SafetyPanel />}
            </>
          )}

          {step === 1 && !outOfArea && (
            <>
              {safetyShown && <SafetyPanel />}
              <div className="max-w-[14rem]">
                <label htmlFor="f-zip" className="field-label">ZIP code of the property</label>
                <input id="f-zip" inputMode="numeric" autoComplete="postal-code" maxLength={5} className="field-input text-lg tracking-widest" value={f.zip}
                  aria-invalid={!!errors.zip} aria-describedby={errors.zip ? "e-zip" : undefined}
                  onChange={(e) => { set("zip", e.target.value.replace(/\D/g, "").slice(0, 5)); setZipState("unknown"); }} />
                {errors.zip && <p id="e-zip" className="field-error">{errors.zip}</p>}
                {zipState === "error" && <p className="field-error" role="alert">We couldn't check that ZIP just now. Please try again.</p>}
              </div>
              <RadioGroup id="systemRunning" legend="Is the system running at all?" value={f.systemRunning} onChange={(v) => set("systemRunning", v)} options={["yes", "partially", "no", "not_sure"]} error={errors.systemRunning} />
              <RadioGroup id="urgency" legend="How soon do you need help?" value={f.urgency} onChange={(v) => set("urgency", v)} options={["asap", "few_days", "flexible"]} error={errors.urgency} />
              {f.urgency === "asap" && !b.emergencyServiceEnabled && (
                <p className="mt-3 text-sm text-ink/75">We'll review urgent requests first, but we can't promise same-day service.</p>
              )}
            </>
          )}

          {outOfArea && (
            <div role="status">
              <p className="text-[1.05rem] leading-relaxed">We're not currently taking service requests in <strong>{f.zip}</strong>. We'd rather tell you now than keep you waiting.</p>
              <p className="mt-3 text-ink/75">We're growing our service area carefully. Please check back later.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" className="btn btn-outline" onClick={() => { setZipState("unknown"); set("zip", ""); }}>Try a different ZIP</button>
                <Link href="/" className="btn btn-dark">Back to home</Link>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField id="systemType" label="System type" optional value={f.systemType} onChange={(v) => set("systemType", v)} options={[...SYSTEM_TYPES]} />
                <SelectField id="systemAge" label="Approximate age" optional value={f.systemAge} onChange={(v) => set("systemAge", v)} options={[...SYSTEM_AGES]} />
              </div>
              <RadioGroup id="propertyType" legend="Property type" value={f.propertyType} onChange={(v) => set("propertyType", v)} options={["home", "rental", "other"]} error={errors.propertyType} labelsOverride={{ other: "Other" }} />
              <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_8rem]">
                <TextField id="street" label="Street address" autoComplete="address-line1" value={f.street} onChange={(v) => set("street", v)} error={errors.street} />
                <TextField id="unit" label="Unit" optional autoComplete="address-line2" value={f.unit} onChange={(v) => set("unit", v)} />
              </div>
              <div className="mt-4 max-w-sm">
                <TextField id="city" label="City" optional autoComplete="address-level2" value={f.city} onChange={(v) => set("city", v)} />
              </div>
              <fieldset className="mt-7 rounded-xl bg-porcelain p-4">
                <legend className="float-left w-full font-extrabold">Preferred time <span className="font-semibold text-steel-dark">(request only)</span></legend>
                <p className="clear-both pt-1 text-sm text-ink/75">We'll confirm the actual appointment with you. This isn't a booked slot.</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="f-preferredDay" className="field-label">Preferred day <span className="font-normal text-steel-dark">(optional)</span></label>
                    <input id="f-preferredDay" type="date" min={tomorrowISO()} className="field-input" value={f.preferredDay} onChange={(e) => set("preferredDay", e.target.value)} />
                  </div>
                  <SelectField id="preferredWindow" label="Time of day" optional value={f.preferredWindow} onChange={(v) => set("preferredWindow", v)} options={[...WINDOWS]} />
                </div>
              </fieldset>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField id="name" label="Your name" autoComplete="name" value={f.name} onChange={(v) => set("name", v)} error={errors.name} />
                <TextField id="phone" label="Mobile phone" type="tel" inputMode="tel" autoComplete="tel-national" value={f.phone} onChange={(v) => set("phone", v)} error={errors.phone} hint="We'll use this to confirm your appointment." />
              </div>
              <div className="mt-4 max-w-md">
                <TextField id="email" label="Email" optional type="email" autoComplete="email" value={f.email} onChange={(v) => set("email", v)} error={errors.email} />
              </div>
              <RadioGroup id="relationship" legend="Your connection to the property" value={f.relationship} onChange={(v) => set("relationship", v)} options={["owner", "tenant", "property_manager"]} error={errors.relationship} />
              {f.relationship === "tenant" && (
                <div className="mt-4">
                  <TextField id="tenantContact" label="Landlord or property manager contact (or note that you have permission for service)" value={f.tenantContact} onChange={(v) => set("tenantContact", v)} error={errors.tenantContact} />
                </div>
              )}
              <div className="mt-7 space-y-3">
                <label id="f-consentService" className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${errors.consentService ? "border-danger" : "border-charcoal/15"}`}>
                  <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-charcoal" checked={f.consentService} aria-invalid={!!errors.consentService} aria-describedby={errors.consentService ? "e-consentService" : undefined} onChange={(e) => set("consentService", e.target.checked)} />
                  <span>{consentText.service_contact.text} <span className="text-steel-dark">(required)</span></span>
                </label>
                {errors.consentService && <p id="e-consentService" className="field-error">{errors.consentService}</p>}
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-charcoal/15 p-4">
                  <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-charcoal" checked={f.consentMarketing} onChange={(e) => set("consentMarketing", e.target.checked)} />
                  <span>{consentText.marketing.text}</span>
                </label>
                <p className="text-sm text-ink/70">See our <Link href="/privacy" className="font-semibold underline" target="_blank">privacy policy</Link> for how we use your information.</p>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <dl className="divide-y divide-charcoal/10 rounded-xl border-2 border-charcoal/10">
                <Review label="Issue" value={labels[f.issue] ?? ""} onEdit={() => setStep(0)} />
                {f.notes && <Review label="Notes" value={f.notes} onEdit={() => setStep(0)} />}
                <Review label="ZIP" value={f.zip} onEdit={() => setStep(1)} />
                <Review label="System running" value={labels[f.systemRunning]} onEdit={() => setStep(1)} />
                <Review label="Urgency" value={labels[f.urgency]} onEdit={() => setStep(1)} />
                <Review label="System" value={[labels[f.systemType], f.systemAge && labels[f.systemAge]].filter(Boolean).join(", ") || "Not specified"} onEdit={() => setStep(2)} />
                <Review label="Address" value={[f.street, f.unit, f.city].filter(Boolean).join(", ")} onEdit={() => setStep(2)} />
                <Review label="Preferred time (request only)" value={[f.preferredDay, f.preferredWindow && labels[f.preferredWindow]].filter(Boolean).join(", ") || "No preference"} onEdit={() => setStep(2)} />
                <Review label="Contact" value={[f.name, f.phone, f.email].filter(Boolean).join(" · ")} onEdit={() => setStep(3)} />
              </dl>
              <p className="mt-5 text-sm text-ink/75">Sending this creates a service request. It doesn't book an appointment. We'll contact you to confirm a time.</p>
              {submitState === "error" && (
                <div role="alert" className="mt-5 rounded-xl border-2 border-danger/40 bg-danger/5 p-4">
                  <p className="font-extrabold text-danger">Not sent</p>
                  <p className="mt-1">{submitError}</p>
                </div>
              )}
            </>
          )}
        </div>

        {!outOfArea && (
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-charcoal/10 pt-6 sm:flex-row sm:justify-between">
            {step > 0 ? <button type="button" onClick={back} className="btn btn-outline">Back</button> : <span />}
            <button type="submit" className="btn btn-amber sm:min-w-[12rem]" disabled={submitState === "sending" || zipState === "checking"} aria-busy={submitState === "sending"}>
              {step < 4 ? (zipState === "checking" ? "Checking ZIP…" : "Continue") : submitState === "sending" ? "Sending…" : submitState === "error" ? "Try again" : "Send request"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function SafetyPanel() {
  return (
    <div role="alert" className="mt-5 rounded-xl border-2 border-danger bg-danger/5 p-4 sm:p-5">
      <p className="text-lg font-black text-danger">{safety.title}</p>
      <ul className="mt-2 space-y-2">
        {safety.lines.map((l) => <li key={l} className="leading-relaxed">{l}</li>)}
      </ul>
      <p className="mt-3 font-semibold">{safety.after}</p>
    </div>
  );
}

function RadioGroup({ id, legend, value, onChange, options, error, labelsOverride = {} }: {
  id: string; legend: string; value: string; onChange: (v: string) => void; options: string[]; error?: string; labelsOverride?: Record<string, string>;
}) {
  return (
    <fieldset id={`f-${id}`} className="mt-6" aria-describedby={error ? `e-${id}` : undefined}>
      <legend className="field-label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className={`inline-flex min-h-[48px] cursor-pointer items-center rounded-full border-2 px-4 font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-amber ${value === o ? "border-charcoal bg-charcoal text-white" : "border-charcoal/20 bg-white hover:border-charcoal/50"}`}>
            <input type="radio" name={id} value={o} checked={value === o} onChange={() => onChange(o)} className="sr-only" />
            {labelsOverride[o] ?? labels[o] ?? o}
          </label>
        ))}
      </div>
      {error && <p id={`e-${id}`} className="field-error">{error}</p>}
    </fieldset>
  );
}

function TextField({ id, label, value, onChange, error, optional, hint, ...rest }: {
  id: string; label: string; value: string; onChange: (v: string) => void; error?: string; optional?: boolean; hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  const describedBy = [error && `e-${id}`, hint && `h-${id}`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={`f-${id}`} className="field-label">{label} {optional && <span className="font-normal text-steel-dark">(optional)</span>}</label>
      <input id={`f-${id}`} className="field-input" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={describedBy} {...rest} />
      {hint && !error && <p id={`h-${id}`} className="mt-1 text-sm text-steel-dark">{hint}</p>}
      {error && <p id={`e-${id}`} className="field-error">{error}</p>}
    </div>
  );
}

function SelectField({ id, label, value, onChange, options, optional }: { id: string; label: string; value: string; onChange: (v: string) => void; options: string[]; optional?: boolean }) {
  return (
    <div>
      <label htmlFor={`f-${id}`} className="field-label">{label} {optional && <span className="font-normal text-steel-dark">(optional)</span>}</label>
      <select id={`f-${id}`} className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {options.map((o) => <option key={o} value={o}>{labels[o] ?? o}</option>)}
      </select>
    </div>
  );
}

function Review({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div>
        <dt className="text-sm font-semibold text-steel-dark">{label}</dt>
        <dd className="mt-0.5 font-semibold break-words">{value}</dd>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 rounded px-2 py-1 text-sm font-bold underline">Edit<span className="sr-only"> {label}</span></button>
    </div>
  );
}
