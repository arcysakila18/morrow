import { Suspense } from "react";
import { UnifiedSwap } from "@/components/swap/UnifiedSwap";

export const metadata = { title: "Swap across networks" };

/** Same unified swap card, opened on a cross-network pair. */
export default function BridgePage() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center px-4 pb-10 pt-10 sm:px-6 sm:pt-16">
      <div className="mb-8 text-center">
        <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[44px]">Swap across networks</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted">
          Pick any token on Robinhood Chain, Ethereum, Base, Arbitrum or BNB Chain and receive any token on another. One signature in your own wallet.
        </p>
      </div>
      <Suspense>
        <UnifiedSwap preset="cross" />
      </Suspense>
    </div>
  );
}
