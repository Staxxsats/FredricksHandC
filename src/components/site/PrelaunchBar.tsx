import { businessConfig as b } from "@/config/business";

/** Conspicuous preview marker while siteMode is "prelaunch". Disappears when the owner flips to "live". */
export function PrelaunchBar() {
  if (b.siteMode !== "prelaunch") return null;
  return (
    <div className="bg-amber text-ink">
      <p className="mx-auto max-w-6xl px-4 py-1.5 text-center text-[0.78rem] font-bold sm:px-6">
        Preview site. Business details, service area, and pricing are pending owner approval.
      </p>
    </div>
  );
}
