import type { Metadata } from "next";
import { businessConfig as b } from "@/config/business";
import { LegalDraftNotice } from "@/components/site/LegalDraft";

export const metadata: Metadata = { title: "Terms (draft)", alternates: { canonical: "/terms" } };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-[2.2rem] font-black">Website and service terms</h1>
      <div className="prose-fhc mt-6">
        <LegalDraftNotice />
        <h2>Service requests are not appointments</h2>
        <p>Submitting a request through this website does not book an appointment. An appointment is confirmed only when {b.shortName} contacts you and you both agree on a time.</p>
        <h2>Pricing</h2>
        <p>Information on this website is general. Prices for diagnostics and repairs are provided before work begins and work starts only with your approval.</p>
        <h2>Website content</h2>
        <p>Content on this website is provided for general information and may change. It is not technical or safety advice. In an emergency, call 911.</p>
      </div>
    </div>
  );
}
