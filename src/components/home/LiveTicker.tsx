"use client";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { useAppChain } from "@/hooks/useAppChain";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { Change } from "@/components/ui/misc";
import { formatUsd } from "@/lib/format";
import type { MarketToken } from "@/lib/market/dexpaprika";
import { useVerifiedSet } from "@/hooks/useVerified";

/** Endless strip of live prices for the most-traded verified tokens. Pauses on hover. Hidden without data. */
export function LiveTicker() {
  const { marketChainId } = useAppChain();
  const q = useApi<{ tokens: MarketToken[] }>(`/api/market/tokens?order=volume&chainId=${marketChainId}`, { refetchInterval: 30_000 });
  const { isVerified } = useVerifiedSet();
  // Verified tokens with a live price only.
  const list = (q.data?.tokens ?? []).filter((t) => isVerified(t.address) && t.priceUsd != null).slice(0, 14);
  if (list.length < 3) return null;
  const row = (dup: boolean) =>
    list.map((t) => (
      <Link
        key={(dup ? "b" : "a") + t.address}
        href={`/explore/${t.address}`}
        tabIndex={dup ? -1 : undefined}
        aria-hidden={dup || undefined}
        className="mx-1.5 flex shrink-0 items-center gap-2.5 rounded-full border border-line bg-surface/70 py-2 pl-2 pr-4 backdrop-blur transition hover:border-line-strong"
      >
        <TokenIcon symbol={t.symbol} address={t.address} size={26} />
        <span className="text-[14px] font-semibold">{t.symbol}</span>
        <span className="tabular text-[14px] text-muted">{formatUsd(t.priceUsd)}</span>
        <Change value={t.change24h} className="text-[13px]" />
      </Link>
    ));
  return (
    <div className="marquee w-full overflow-hidden py-1">
      <div className="marquee-track" style={{ ["--dur" as string]: `${list.length * 4}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
