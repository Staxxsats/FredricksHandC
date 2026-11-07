import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { getDb } from "@/server/db";
import { enabledCategories } from "@/server/intake";
import { ISSUES } from "@/domain/request";
import type { IssueSlug } from "@/content/site";

export const metadata: Metadata = {
  title: "Request service",
  description: "Send a heating or cooling service request in about two minutes. We'll contact you to confirm a time.",
  alternates: { canonical: "/book" },
};
export const dynamic = "force-dynamic";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const issueParam = typeof sp.issue === "string" ? sp.issue : null;
  const initialIssue = issueParam && (ISSUES as readonly string[]).includes(issueParam) ? (issueParam as IssueSlug) : null;
  const utm: Record<string, string> = {};
  for (const k of UTM_KEYS) if (typeof sp[k] === "string") utm[k] = (sp[k] as string).slice(0, 200);
  const enabled = await enabledCategories(await getDb());

  return (
    <div className="bg-porcelain">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <BookingFlow initialIssue={initialIssue} enabledIssues={enabled} attribution={{ landingPath: initialIssue ? `/book?issue=${initialIssue}` : "/book", utm }} />
      </div>
    </div>
  );
}
