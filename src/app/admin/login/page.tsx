import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { LoginForm } from "@/components/admin/LoginForm";
import { BrandMark } from "@/components/brand/BrandMark";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <main className="on-dark flex min-h-dvh items-center justify-center bg-charcoal px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><BrandMark size="md" /></div>
        <div className="card p-6 text-ink">
          <h1 className="text-xl font-black">Staff sign in</h1>
          <p className="mt-1 text-sm text-ink/70">Office and technician access only. There is no public sign-up.</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
