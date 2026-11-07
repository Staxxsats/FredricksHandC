import Link from "next/link";
import { requireUser } from "@/server/session";
import { can } from "@/server/auth";
import { logoutAction } from "../actions";
import { BrandMark } from "@/components/brand/BrandMark";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh bg-porcelain">
      <header className="on-dark bg-charcoal text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" aria-label="Office home"><BrandMark size="sm" /></Link>
            <nav aria-label="Office" className="flex gap-1 text-sm font-semibold">
              <Link href="/admin" className="rounded px-3 py-2 hover:text-amber">Leads</Link>
              {can(user, "settings:manage") && <Link href="/admin/settings" className="rounded px-3 py-2 hover:text-amber">Settings &amp; status</Link>}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/70">{user.name} · {user.role.replace("_", " ")}</span>
            <form action={logoutAction}><button className="rounded border border-white/30 px-3 py-1.5 font-semibold hover:border-white">Sign out</button></form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
