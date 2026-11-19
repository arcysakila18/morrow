"use client";
import Link from "next/link";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { EmptyState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/Spinner";
import { formatPct, formatUsd } from "@/lib/format";
import type { MarketPool } from "@/lib/market/dexpaprika";

export function PairIcons({ a, b, aAddress, bAddress, chainId, size = 28 }: { a: string; b: string; aAddress?: string; bAddress?: string; chainId?: number; size?: number }) {
  return (
    <span className="flex shrink-0 items-center">
      <TokenIcon symbol={a} address={aAddress} chainId={chainId} size={size} className="ring-2 ring-surface" />
      <TokenIcon symbol={b} address={bAddress} chainId={chainId} size={size} className="-ml-2 ring-2 ring-surface" />
    </span>
  );
}

export function PoolTable({ pools, loading, error, compact }: { pools?: MarketPool[]; loading?: boolean; error?: string; compact?: boolean }) {
  if (error) return <EmptyState title="Pool data unavailable" body={`${error}. Metrics are only shown from live indexed data.`} />;
  if (!loading && pools && !pools.length) return <EmptyState title="No pools found" />;
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            <th className="py-3.5 pl-4 font-medium sm:pl-5">Pool</th>
            <th className="py-3.5 pr-4 text-right font-medium">TVL</th>
            <th className="hidden py-3.5 pr-4 text-right font-medium sm:table-cell">Volume 24h</th>
            {!compact && <th className="hidden py-3.5 pr-4 text-right font-medium md:table-cell">Fee APR</th>}
            {!compact && <th className="hidden py-3.5 pr-5 text-right font-medium lg:table-cell">Txns 24h</th>}
          </tr>
        </thead>
        <tbody>
          {(loading ? Array.from({ length: 6 }) : pools ?? []).map((raw, i) => {
            const p = raw as MarketPool | undefined;
            if (!p)
              return (
                <tr key={i} className="border-b border-line/70">
                  <td className="py-4 pl-5"><Skeleton className="h-7 w-48" /></td>
                  <td className="py-4 pr-4"><Skeleton className="ml-auto h-4 w-16" /></td>
                  <td className="hidden py-4 pr-4 sm:table-cell"><Skeleton className="ml-auto h-4 w-16" /></td>
                  {!compact && <td className="hidden py-4 pr-4 md:table-cell"><Skeleton className="ml-auto h-4 w-12" /></td>}
                  {!compact && <td className="hidden py-4 pr-5 lg:table-cell"><Skeleton className="ml-auto h-4 w-10" /></td>}
                </tr>
              );
            const [a, b] = p.tokens;
            return (
              <tr key={p.address} className="border-b border-line/70 last:border-0 hover:bg-surface-2/60">
                <td className="py-3 pl-4 sm:pl-5">
                  <Link href={`/pools/${p.address}`} className="flex items-center gap-3">
                    <PairIcons a={a?.symbol ?? "?"} b={b?.symbol ?? "?"} aAddress={a?.address} bAddress={b?.address} />
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {a?.symbol} / {b?.symbol}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        {p.dex}
                        {p.feeLabel && <span className="tabular rounded bg-surface-2 px-1.5 py-px text-[11px]">{p.feeLabel}</span>}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="tabular py-3 pr-4 text-right font-medium">{formatUsd(p.liquidityUsd, { compact: true })}</td>
                <td className="tabular hidden py-3 pr-4 text-right sm:table-cell">{formatUsd(p.volume24hUsd, { compact: true })}</td>
                {!compact && <td className="tabular hidden py-3 pr-4 text-right md:table-cell">{p.feeApr != null ? formatPct(p.feeApr, 1).replace("+", "") : "—"}</td>}
                {!compact && <td className="tabular hidden py-3 pr-5 text-right text-muted lg:table-cell">{p.txns24h?.toLocaleString() ?? "—"}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
