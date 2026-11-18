"use client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getAddress } from "viem";
import { coreTokens } from "@/lib/tokens/core";
import type { Token } from "@/lib/tokens/types";
import type { SupportedChainId } from "@/config/chains";
import { create } from "./store";

/** Tokens the user imported by address. Stored locally, flagged as unverified in the UI. */
export const customTokensStore = create<Token[]>([], "morrow:custom-tokens");

export function useTokenList(chainId: SupportedChainId) {
  const custom = customTokensStore.use();
  const q = useQuery({
    queryKey: ["token-registry", chainId],
    queryFn: async () => {
      const r = await fetch(`/api/tokens?chainId=${chainId}`);
      if (!r.ok) throw new Error("Token registry unavailable");
      return (await r.json()) as { tokens: Token[]; errors: string[] };
    },
    staleTime: 10 * 60_000,
  });

  const tokens = useMemo(() => {
    const base = q.data?.tokens ?? coreTokens(chainId);
    const seen = new Set(base.map((t) => t.address.toLowerCase()));
    const extra = custom.filter((t) => t.chainId === chainId && !seen.has(t.address.toLowerCase()));
    return [...base, ...extra];
  }, [q.data, custom, chainId]);

  return { tokens, isLoading: q.isLoading, errors: q.data?.errors ?? (q.error ? [String((q.error as Error).message)] : []) };
}

export function findToken(tokens: Token[], address?: string | null) {
  if (!address) return undefined;
  try {
    const a = getAddress(address).toLowerCase();
    return tokens.find((t) => t.address.toLowerCase() === a);
  } catch {
    return tokens.find((t) => t.symbol.toLowerCase() === address.toLowerCase());
  }
}
