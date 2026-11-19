"use client";
import { useEffect } from "react";

/** Route-level error screen: shows the real message (no secrets are ever in client errors) so it can be reported. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Something went wrong</h1>
      <p className="mt-3 text-[15px] text-muted">The page hit an unexpected error. Your funds are not affected.</p>
      <pre className="mt-5 w-full overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-line bg-surface px-4 py-3 text-left text-[12px] text-down">
        {error.message || "Unknown error"}
        {error.digest ? `\n\ndigest: ${error.digest}` : ""}
      </pre>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="h-12 rounded-full bg-lime px-6 font-semibold text-on-lime">Try again</button>
        <a href="/" className="flex h-12 items-center rounded-full border border-line-strong px-6 font-semibold">Home</a>
      </div>
    </div>
  );
}
