import type { Metadata } from "next";
import { businessConfig as b } from "@/config/business";
import { LegalDraftNotice } from "@/components/site/LegalDraft";

export const metadata: Metadata = { title: "Privacy policy (draft)", alternates: { canonical: "/privacy" } };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-[2.2rem] font-black">Privacy policy</h1>
      <div className="prose-fhc mt-6">
        <LegalDraftNotice />
        <p>This policy explains what {b.legalName ?? b.displayName} collects when you use this website and how we use it.</p>
        <h2>What we collect</h2>
        <ul>
          <li>Information you enter in a service request: name, phone, optional email, service address, ZIP code, and details about your system and the problem.</li>
          <li>Your contact preferences, including whether you agreed to be contacted about your request and whether you opted in to optional marketing messages, with the date and wording you agreed to.</li>
          <li>Basic technical information such as the page you came from and campaign tags in the link you used. We store a one-way hash of your IP address for spam protection, not the address itself.</li>
        </ul>
        <h2>How we use it</h2>
        <ul>
          <li>To respond to your request, schedule service, and keep a record of work for your home.</li>
          <li>To send marketing messages only if you opted in. You can opt out at any time.</li>
        </ul>
        <h2>Sharing</h2>
        <p>We don't sell your information. We share it only with service providers who help us run the business, and only what they need.</p>
        <h2>Your choices</h2>
        <p>You can ask us to update or delete your information, or to stop marketing messages, by contacting us through the service request form.</p>
        <h2>Changes</h2>
        <p>We'll update this page if our practices change.</p>
      </div>
    </div>
  );
}
