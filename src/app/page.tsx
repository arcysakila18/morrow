import { Suspense } from "react";
import { SwapCard } from "@/components/swap/SwapCard";
import { TopMovers } from "@/components/explore/TopMovers";
import { SITE } from "@/config/site";

export default function SwapPage() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center px-4 pb-10 pt-10 sm:px-6 sm:pt-16">
      <div className="mb-8 text-center sm:mb-10">
        <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">{SITE.tagline}</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted">
          Swap Stock Tokens on Robinhood Chain, and crypto on Ethereum, Base, Arbitrum and BNB Chain. Best-price routing, non-custodial, always.
        </p>
      </div>
      <Suspense>
        <SwapCard />
      </Suspense>
      <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-muted">
        <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-ink" />Non-custodial</li>
        <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-ink" />Multi-source routing</li>
        <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-ink" />Simulated before you sign</li>
      </ul>
      <TopMovers />
    </div>
  );
}
