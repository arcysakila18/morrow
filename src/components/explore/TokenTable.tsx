"use client";
import Link from "next/link";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { AddressLink, Change, EmptyState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/Spinner";
import { formatUsd } from "@/lib/format";
import type { MarketToken } from "@/lib/market/dexpaprika";
import { VerifiedBadge } from "@/components/ui/Verified";
import { useVerifiedSet } from "@/hooks/useVerified";
import { Flash } from "@/components/ui/Live";

export function TokenTable({ tokens, loading, error }: { tokens?: MarketToken[]; loading?: boolean; error?: string }) {
  const { isVerified } = useVerifiedSet();
  if (error) return <EmptyState title="Market data unavailable" body={`${error}. Morrow doesn't display placeholder data — try again shortly.`} />;
  if (!loading && tokens && !tokens.length) return <EmptyState title="No tokens found" />;
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs font-medium text-muted">
          <tr>
            <th className="hidden w-12 py-3.5 pl-5 font-medium sm:table-cell">#</th>
            <th className="py-3.5 pl-4 font-medium sm:pl-2">Token</th>
            <th className="py-3.5 pr-4 text-right font-medium">Price</th>
            <th className="hidden py-3.5 pr-4 text-right font-medium sm:table-cell">24h</th>
            <th className="hidden py-3.5 pr-4 text-right font-medium md:table-cell">Volume 24h</th>
            <th className="hidden py-3.5 pr-4 text-right font-medium lg:table-cell">Liquidity</th>
            <th className="hidden py-3.5 pr-5 text-right font-medium xl:table-cell">Contract</th>
          </tr>
        </thead>
        <tbody>
          {(loading ? Array.from({ length: 8 }) : tokens ?? []).map((t, i) =>
            t ? (
              <tr key={(t as MarketToken).address} className="group border-b border-line/70 last:border-0 hover:bg-surface-2/60">
                <td className="tabular hidden py-3.5 pl-5 text-muted sm:table-cell">{i + 1}</td>
                <td className="py-3 pl-4 sm:pl-2">
                  <Link href={`/explore/${(t as MarketToken).address}`} className="flex items-center gap-3">
                    <TokenIcon symbol={(t as MarketToken).symbol} address={(t as MarketToken).address} size={32} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 font-medium">{(t as MarketToken).symbol}{isVerified((t as MarketToken).address) && <VerifiedBadge />}</span>
                      <span className="block max-w-[160px] truncate text-xs text-muted">{(t as MarketToken).name}</span>
                    </span>
                  </Link>
                </td>
                <td className="tabular py-3 pr-4 text-right font-medium">
                  <Flash value={(t as MarketToken).priceUsd} className="px-1">{formatUsd((t as MarketToken).priceUsd)}</Flash>
                  <Change value={(t as MarketToken).change24h} className="block text-xs sm:hidden" />
                </td>
                <td className="hidden py-3 pr-4 text-right sm:table-cell">
                  <Change value={(t as MarketToken).change24h} />
                </td>
                <td className="tabular hidden py-3 pr-4 text-right md:table-cell">{formatUsd((t as MarketToken).volume24hUsd, { compact: true })}</td>
                <td className="tabular hidden py-3 pr-4 text-right lg:table-cell">{formatUsd((t as MarketToken).liquidityUsd, { compact: true })}</td>
                <td className="hidden py-3 pr-5 text-right xl:table-cell">
                  <AddressLink address={(t as MarketToken).address} kind="token" />
                </td>
              </tr>
            ) : (
              <tr key={i} className="border-b border-line/70">
                <td className="hidden py-4 pl-5 sm:table-cell"><Skeleton className="h-4 w-4" /></td>
                <td className="py-4 pl-4 sm:pl-2"><Skeleton className="h-8 w-40" /></td>
                <td className="py-4 pr-4"><Skeleton className="ml-auto h-4 w-16" /></td>
                <td className="hidden py-4 pr-4 sm:table-cell"><Skeleton className="ml-auto h-4 w-12" /></td>
                <td className="hidden py-4 pr-4 md:table-cell"><Skeleton className="ml-auto h-4 w-16" /></td>
                <td className="hidden py-4 pr-4 lg:table-cell"><Skeleton className="ml-auto h-4 w-16" /></td>
                <td className="hidden py-4 pr-5 xl:table-cell"><Skeleton className="ml-auto h-4 w-24" /></td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
