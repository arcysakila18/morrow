"use client";
import Link from "next/link";
import { use } from "react";
import { useApi } from "@/hooks/useApi";
import { useUniswapV3Pool } from "@/hooks/usePoolState";
import { AreaChart } from "@/components/ui/AreaChart";
import { AddressLink, EmptyState, Notice } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/Spinner";
import { AddLiquidity } from "@/components/pools/AddLiquidity";
import { PairIcons } from "@/components/pools/PoolTable";
import { formatAmount, formatPct, formatUsd } from "@/lib/format";
import { tickToPrice } from "@/lib/uniswap/math";
import type { MarketPool } from "@/lib/market/dexpaprika";

export default function PoolPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const market = useApi<{ pool: MarketPool; chart: { t: number; c: number }[] }>(`/api/market/pool/${address}`, { refetchInterval: 60_000 });
  const chain = useUniswapV3Pool(address);
  const p = market.data?.pool;
  const s = chain.data;
  const a = s?.token0.symbol ?? p?.tokens[0]?.symbol ?? "—";
  const b = s?.token1.symbol ?? p?.tokens[1]?.symbol ?? "—";

  if (market.isError && chain.data === null) return <div className="mx-auto max-w-[1200px] px-4 pt-14"><EmptyState title="Pool not found" body="No indexed data or Uniswap v3 pool exists at this address." /></div>;

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 sm:pt-12">
      <Link href="/pools" className="text-[13px] font-medium text-muted hover:text-ink">← Pools</Link>
      <div className="mt-5 flex items-center gap-3">
        <PairIcons a={a} b={b} aAddress={s?.token0.address ?? p?.tokens[0]?.address} bAddress={s?.token1.address ?? p?.tokens[1]?.address} size={38} />
        <h1 className="text-[26px] font-semibold tracking-tight">{a} / {b}</h1>
        {(s || p?.feeLabel) && <span className="tabular rounded-lg bg-surface-2 px-2 py-0.5 text-[13px] text-muted">{s ? `${s.fee / 10_000}%` : p?.feeLabel}</span>}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-muted">
        {p?.dex ?? (s ? "Uniswap v3" : "")} · <AddressLink address={address} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["TVL", formatUsd(p?.liquidityUsd, { compact: true })],
              ["Volume 24h", formatUsd(p?.volume24hUsd, { compact: true })],
              ["Fee APR (24h)", p?.feeApr != null ? formatPct(p.feeApr, 1).replace("+", "") : "—"],
              ["Txns 24h", p?.txns24h?.toLocaleString() ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="card p-4">
                <div className="text-xs text-muted">{k}</div>
                <div className="tabular mt-1.5 text-[19px] font-medium">{market.isLoading ? <Skeleton className="h-6 w-16" /> : v}</div>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <div className="text-sm font-medium">Pool price · 7 days</div>
            {market.isLoading ? <Skeleton className="mt-4 h-[220px] w-full" /> : <AreaChart data={market.data?.chart ?? []} />}
          </div>
          {s && (
            <div className="card p-5 text-sm">
              <div className="font-medium">On-chain state</div>
              <div className="tabular mt-3 grid gap-2 text-muted sm:grid-cols-2">
                <div>Current price: <span className="text-ink">{formatAmount(tickToPrice(s.tick, s.token0.decimals, s.token1.decimals), 6)} {s.token1.symbol} per {s.token0.symbol}</span></div>
                <div>Tick: <span className="text-ink">{s.tick}</span> · Spacing {s.tickSpacing}</div>
                <div>{s.token0.symbol}: <AddressLink address={s.token0.address} kind="token" /></div>
                <div>{s.token1.symbol}: <AddressLink address={s.token1.address} kind="token" /></div>
              </div>
              <p className="mt-3 text-xs text-up">Verified: deployed by the canonical Uniswap v3 factory.</p>
            </div>
          )}
        </div>
        <aside>
          {chain.isLoading ? (
            <div className="card p-5"><Skeleton className="h-64 w-full" /></div>
          ) : s ? (
            <AddLiquidity pool={s} />
          ) : (
            <Notice>
              MORROW currently supports adding liquidity to Uniswap v3 pools. This pool uses a different protocol
              {p?.dex ? ` (${p.dex})` : ""} — manage it on that protocol&apos;s own interface.
            </Notice>
          )}
        </aside>
      </div>
    </div>
  );
}
