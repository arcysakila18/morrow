import { cn } from "@/lib/cn";

/** Shown only for tokens in an official registry (core assets, Robinhood's Stock Token API, or the Uniswap default token list). */
export function VerifiedBadge({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <span title="Verified: listed in an official token registry" className={cn("inline-flex shrink-0", className)}>
      <svg viewBox="0 0 16 16" width={size} height={size} aria-label="Verified">
        <path
          d="M8 .8l1.7 1.3 2.1-.2.8 2 1.9 1-.4 2.1 1.1 1.8-1.4 1.6.1 2.1-2 .7-1.1 1.8-2.1-.4L8 15.2l-1.7-1.3-2.1.4-1.1-1.8-2-.7.1-2.1L-.2 8.1 1 6.3.6 4.2l1.9-1 .8-2 2.1.2Z"
          fill="#101114"
        />
        <path d="m5 8.2 2 2 4-4.2" fill="none" stroke="#D9F36A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
