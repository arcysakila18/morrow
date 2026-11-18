"use client";
import { useQuery } from "@tanstack/react-query";
import { CONTRACTS } from "@/config/contracts";
import { isNative } from "@/lib/tokens/core";
import type { Token } from "@/lib/tokens/types";

/** USD prices from indexed DEX data (DexPaprika). ETH is priced via WETH. Missing = unknown, never guessed. */
export function usePrices(tokens: (Token | undefined)[], chainId: number) {
  const weth = CONTRACTS[4663].weth!.toLowerCase();
  const addrs = Array.from(new Set(tokens.filter(Boolean).map((t) => (isNative(t!) ? weth : t!.address.toLowerCase())))).sort();
  const q = useQuery({
    queryKey: ["prices", chainId, addrs.join(",")],
    enabled: chainId === 4663 && addrs.length > 0,
    refetchInterval: 15_000,
    queryFn: async () => {
      const r = await fetch(`/api/market/prices?tokens=${addrs.join(",")}`);
      const j = await r.json();
      return (j.prices ?? {}) as Record<string, number>;
    },
  });
  return (t?: Token): number | undefined => {
    if (!t || !q.data) return undefined;
    return q.data[isNative(t) ? weth : t.address.toLowerCase()];
  };
}
