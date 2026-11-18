"use client";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { Change } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/Spinner";
import { formatUsd } from "@/lib/format";
import { Flash } from "@/components/ui/Live";
import type { MarketToken } from "@/lib/market/dexpaprika";

/** Live "most traded" strip under the swap card. Hidden entirely if data is unavailable. */
export function TopMovers() {
  const q = useApi<{ tokens: MarketToken[] }>("/api/market/tokens?order=volume", { refetchInterval: 30_000 });
  if (q.isError || (q.data && !q.data.tokens.length)) return null;
  const list = q.data?.tokens.slice(0, 4);
  return (
    <section className="mt-16 w-full max-w-[920px]">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-[15px] font-semibold">Most traded today</h2>
        <Link href="/explore" className="text-[13px] font-medium text-muted hover:text-ink">
          Explore all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(list ?? Array.from({ length: 4 })).map((t, i) =>
          t ? (
            <Link key={t.address} href={`/explore/${t.address}`} className="card group p-4 transition hover:border-line-strong">
              <div className="flex items-center gap-2.5">
                <TokenIcon symbol={t.symbol} address={t.address} size={28} />
                <span className="truncate text-sm font-semibold">{t.symbol}</span>
              </div>
              <div className="tabular mt-4 text-[17px] font-medium"><Flash value={t.priceUsd} className="px-1 -mx-1">{formatUsd(t.priceUsd)}</Flash></div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <Change value={t.change24h} />
                <span className="tabular text-faint">Vol {formatUsd(t.volume24hUsd, { compact: true })}</span>
              </div>
            </Link>
          ) : (
            <div key={i} className="card p-4">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="mt-4 h-5 w-24" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ),
        )}
      </div>
      <p className="mt-3 text-right text-[11px] text-faint">Market data: DexPaprika, indexed from Robinhood Chain pools.</p>
    </section>
  );
}
