"use client";
import { useApi } from "@/hooks/useApi";
import { useAppChain } from "@/hooks/useAppChain";
import { chainName } from "@/config/chains";
import { formatUsd } from "@/lib/format";
import { Skeleton } from "@/components/ui/Spinner";
import { useCountUp, useInView } from "@/components/home/Reveal";
import { cn } from "@/lib/cn";
import type { MarketPool } from "@/lib/market/dexpaprika";

const NETWORK_COUNT = 5; // Robinhood Chain, Ethereum, Base, Arbitrum, BNB Chain
const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

function Stat({ label, target, fmt, run, failed, delay, accent }: { label: string; target: number | null; fmt: (n: number) => string; run: boolean; failed: boolean; delay: number; accent?: boolean }) {
  const v = useCountUp(target, run);
  return (
    <div
      className={cn("reveal group relative overflow-hidden rounded-[24px] border border-line bg-surface/70 p-5 backdrop-blur hover:border-line-strong sm:p-6", run && "is-shown")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lime/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-0" />
      <div className="relative">
        <div className="text-[15px] leading-tight text-muted">{label}</div>
        <div className={cn("tabular mt-8 text-[26px] font-semibold tracking-[-0.02em] sm:mt-10 sm:text-[34px]", accent && "text-lime")}>
          {v != null ? fmt(v) : failed ? <span className="text-faint">—</span> : <Skeleton className="h-8 w-24" />}
        </div>
      </div>
    </div>
  );
}

/**
 * Live market snapshot for the selected network, summed from the 50 most-traded pools DexPaprika
 * indexes on-chain. Market-wide numbers, not Morrow's own volume.
 */
export function MarketStats() {
  const { marketChainId } = useAppChain();
  const { ref, inView } = useInView<HTMLDivElement>();
  const q = useApi<{ pools: MarketPool[] }>(`/api/market/pools?order=volume&chainId=${marketChainId}`, { refetchInterval: 30_000 });
  const pools = q.data?.pools ?? [];
  const sum = (k: "volume24hUsd" | "liquidityUsd" | "txns24h") => (pools.length ? pools.reduce((a, p) => a + (p[k] ?? 0), 0) : null);
  const failed = !!(q.isError || (q.data && !pools.length));
  const usd = (n: number) => formatUsd(n, { compact: true });

  return (
    <section ref={ref} className="w-full">
      <div className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/70 px-4 py-2 text-[14px] text-muted backdrop-blur">
        <span className="relative flex h-2 w-2">
          {!failed && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up/60" />}
          <span className={failed ? "relative h-2 w-2 rounded-full bg-faint" : "relative h-2 w-2 rounded-full bg-up"} />
        </span>
        {chainName(marketChainId)} market, live
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="24h volume" target={sum("volume24hUsd")} fmt={usd} run={inView} failed={failed} delay={0} />
        <Stat label="Liquidity" target={sum("liquidityUsd")} fmt={usd} run={inView} failed={failed} delay={90} />
        <Stat label="24h swaps" target={sum("txns24h")} fmt={(n) => compact(Math.round(n))} run={inView} failed={failed} delay={180} />
        <Stat label="Networks" target={NETWORK_COUNT} fmt={(n) => String(Math.round(n))} run={inView} failed={false} delay={270} accent />
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-faint">
        Summed from the 50 most-traded pools on {chainName(marketChainId)}, indexed on-chain by DexPaprika. Market-wide figures, not trades made through Morrow.
      </p>
    </section>
  );
}
