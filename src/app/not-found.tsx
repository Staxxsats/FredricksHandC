import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";

export default function NotFound() {
  return (
    <main className="on-dark flex min-h-dvh flex-col items-center justify-center bg-charcoal px-4 text-center text-white">
      <BrandMark size="md" />
      <h1 className="mt-10 text-[2.4rem] font-black">We couldn't find that page.</h1>
      <p className="mt-3 max-w-md text-white/75">The link may be old or mistyped. Let's get you back on track.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn btn-ghost-light">Home</Link>
        <Link href="/book" className="btn btn-amber">Request Service</Link>
      </div>
    </main>
  );
}
