"use client";
import { useQuery } from "@tanstack/react-query";
import { CONTRACTS } from "@/config/contracts";
import { CHAIN_META, isSupportedChain } from "@/config/chains";
import { isNative } from "@/lib/tokens/core";
import type { Token } from "@/lib/tokens/types";

/** USD prices from indexed DEX data (DexPaprika). Native tokens are priced via their wrapped token. Missing = unknown, never guessed. */
export function usePrices(tokens: (Token | undefined)[], chainId: number) {
  const wrapped = (isSupportedChain(chainId) ? CONTRACTS[chainId].wrappedNative : undefined)?.toLowerCase();
  const indexed = isSupportedChain(chainId) && !!CHAIN_META[chainId].network;
  const addrs = Array.from(
    new Set(tokens.filter(Boolean).map((t) => (isNative(t!) ? wrapped : t!.address.toLowerCase())).filter((a): a is string => !!a)),
  ).sort();
  const q = useQuery({
    queryKey: ["prices", chainId, addrs.join(",")],
    enabled: indexed && addrs.length > 0,
    refetchInterval: 15_000,
    queryFn: async () => {
      const r = await fetch(`/api/market/prices?tokens=${addrs.join(",")}&chainId=${chainId}`);
      const j = await r.json();
      return (j.prices ?? {}) as Record<string, number>;
    },
  });
  return (t?: Token): number | undefined => {
    if (!t || !q.data) return undefined;
    const key = isNative(t) ? wrapped : t.address.toLowerCase();
    return key ? q.data[key] : undefined;
  };
}
