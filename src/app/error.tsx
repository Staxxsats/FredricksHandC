"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-[2rem] font-black">Something went wrong on our end.</h1>
      <p className="mt-3 max-w-md text-ink/75">Please try again. If you were sending a request, it was not saved unless you saw a reference number.</p>
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="btn btn-dark">Try again</button>
        <Link href="/" className="btn btn-outline">Home</Link>
      </div>
    </main>
  );
}
