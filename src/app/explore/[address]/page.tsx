"use client";
import Link from "next/link";
import { use } from "react";
import { useApi } from "@/hooks/useApi";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { AddressLink, Change, EmptyState, Notice } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/Spinner";
import { AreaChart } from "@/components/ui/AreaChart";
import { Button } from "@/components/ui/Button";
import { PoolTable } from "@/components/pools/PoolTable";
import { formatUsd } from "@/lib/format";
import type { MarketPool, MarketToken } from "@/lib/market/dexpaprika";
import { VerifiedBadge } from "@/components/ui/Verified";
import { useVerifiedSet } from "@/hooks/useVerified";
import { useLivePrice } from "@/hooks/useLivePrice";
import { Flash, LiveBadge } from "@/components/ui/Live";
import { useAppChain } from "@/hooks/useAppChain";

type Data = { token: MarketToken; pools: MarketPool[]; chart: { t: number; c: number }[]; chartPool: MarketPool | null };

export default function TokenPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const { marketChainId: chainId } = useAppChain();
  const q = useApi<Data>(`/api/market/token/${address}?chainId=${chainId}`, { refetchInterval: 20_000 });
  const live = useLivePrice(address, chainId);
  const { isVerified, isLoading: vLoading } = useVerifiedSet();
  const verified = isVerified(address);

  if (q.isError) return <div className="mx-auto max-w-[1200px] px-4 pt-14 sm:px-6"><EmptyState title="Token data unavailable" body={(q.error as Error).message} /></div>;
  const t = q.data?.token;
  // Chart is the top pool's price for its base token; only label as this token if it is the base.
  const chartIsToken = !!q.data?.chartPool && q.data.chartPool.tokens[0]?.address.toLowerCase() === address.toLowerCase();

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 sm:pt-12">
      <Link href="/explore" className="text-[13px] font-medium text-muted hover:text-ink">← Explore</Link>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <div className="flex items-center gap-3.5">
            {t ? <TokenIcon symbol={t.symbol} address={address} size={44} /> : <Skeleton className="h-11 w-11 rounded-full" />}
            <div>
              <h1 className="text-[26px] font-semibold tracking-tight">{t ? t.name || t.symbol : <Skeleton className="h-7 w-40" />}</h1>
              <div className="flex items-center gap-1.5 text-sm text-muted">{t?.symbol}{verified && <><VerifiedBadge /> <span className="text-ink">Verified</span></>}</div>
            </div>
          </div>
          <div className="mt-6 flex items-end gap-3">
            <span className="tabular text-[40px] font-semibold leading-none tracking-[-0.03em]">{t ? <Flash value={live.price ?? t.priceUsd} className="px-1 -mx-1">{formatUsd(live.price ?? t.priceUsd)}</Flash> : <Skeleton className="h-10 w-36" />}</span>
            {t && <Change value={t.change24h} className="pb-1 text-[15px]" />}
            {t && <span className="pb-1 text-[13px] text-faint">24h</span>}
            {live.connected && live.price != null && <LiveBadge className="mb-1" />}
          </div>
          <div className="card mt-6 p-5">
            {q.isLoading ? <Skeleton className="h-[220px] w-full" /> : chartIsToken ? (
              <AreaChart data={q.data!.chart} positive={(t?.change24h ?? 0) >= 0} />
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-faint">Price history isn&apos;t available for this token yet.</div>
            )}
            {chartIsToken && <p className="mt-2 text-[11px] text-faint">7-day price from the deepest pool ({q.data!.chartPool!.tokens.map((x) => x.symbol).join(" / ")}).</p>}
          </div>
          <h2 className="mt-10 text-[17px] font-semibold">Pools</h2>
          <div className="mt-3">
            <PoolTable pools={q.data?.pools} loading={q.isLoading} compact />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              {[
                ["Liquidity", formatUsd(t?.liquidityUsd, { compact: true })],
                ["24h volume", formatUsd(t?.volume24hUsd, { compact: true })],
                ["FDV", formatUsd(t?.fdvUsd, { compact: true })],
                ["Listed", t?.addedAt ? new Date(t.addedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs text-muted">{k}</div>
                  <div className="tabular mt-1 text-[17px] font-medium">{q.isLoading ? <Skeleton className="h-5 w-16" /> : v}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-line pt-4">
              <div className="text-xs text-muted">Contract</div>
              <AddressLink address={address} chainId={chainId} kind="token" chars={8} className="mt-1" />
            </div>
          </div>
          <Link href={`/?out=${address}&chain=${chainId}`} className="block">
            <Button variant="primary" size="xl" block>Swap {t?.symbol ?? ""}</Button>
          </Link>
          {!vLoading && !verified ? (
            <Notice tone="warn">Unverified token. It isn&apos;t in an official token registry for this network, and anyone can create a token with any name. Check the contract address before trading.</Notice>
          ) : (
            <Notice>Listed in an official token registry. Always double-check the contract address.</Notice>
          )}
        </aside>
      </div>
    </div>
  );
}
