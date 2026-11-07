"use client";
import Link from "next/link";
import { issues } from "@/content/site";
import { IssueIcon } from "./IssueIcon";
import { track } from "@/lib/analytics";

/** Homepage issue selector. Each card deep-links into the request flow with the issue pre-selected. */
export function IssueCards() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {issues.map((i) => (
        <li key={i.slug}>
          <Link
            href={`/book?issue=${i.slug}`}
            onClick={() => track("issue_selected", { issue: i.slug, location: "home" })}
            className="group card flex h-full items-center gap-4 border-2 border-transparent p-4 transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-amber hover:shadow-[var(--shadow-lift)] lg:flex-col lg:items-start lg:p-5"
          >
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-charcoal text-amber transition-colors group-hover:bg-amber group-hover:text-charcoal">
              <IssueIcon slug={i.slug} />
            </span>
            <span>
              <span className="block text-[1.05rem] font-extrabold leading-tight">{i.label}</span>
              <span className="mt-1 block text-sm leading-snug text-steel-dark">{i.hint}</span>
            </span>
            <span aria-hidden="true" className="ml-auto text-xl font-black text-charcoal/30 transition-transform group-hover:translate-x-0.5 group-hover:text-charcoal lg:hidden">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
