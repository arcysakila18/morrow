"use client";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Segmented } from "@/components/ui/misc";
import { PoolTable } from "@/components/pools/PoolTable";
import { Positions } from "@/components/pools/Positions";
import type { MarketPool } from "@/lib/market/dexpaprika";
import { useAppChain } from "@/hooks/useAppChain";
import { chainName } from "@/config/chains";

export default function PoolsPage() {
  const { marketChainId: chainId, isSolana } = useAppChain();
  const [order, setOrder] = useState<"volume" | "tvl" | "new">("volume");
  const q = useApi<{ pools: MarketPool[] }>(`/api/market/pools?order=${order}&chainId=${chainId}`, { refetchInterval: 30_000 });
  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6 sm:pt-14">
      <h1 className="text-[32px] font-semibold tracking-[-0.025em]">Pools</h1>
      <p className="mt-1.5 text-[15px] text-muted">{isSolana ? "Liquidity pools on Solana, by on-chain activity." : <>Provide liquidity and earn trading fees on {chainName(chainId)}.</>}</p>

      {!isSolana && <Positions />}

      <div className="mt-12 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold">All pools</h2>
        <Segmented
          value={order}
          onChange={setOrder}
          options={[
            { value: "volume", label: "Volume" },
            { value: "tvl", label: "TVL" },
            { value: "new", label: "New" },
          ]}
        />
      </div>
      <div className="mt-4">
        <PoolTable pools={q.data?.pools} loading={q.isLoading} error={q.isError ? (q.error as Error).message : undefined} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        TVL and volume from DexPaprika. Fee APR = 24h volume × fee tier × 365 ÷ TVL — a backward-looking estimate, shown only where the fee tier is known. It is not a forecast and excludes impermanent loss.
      </p>
    </div>
  );
}
