"use client";
import { useQuery } from "@tanstack/react-query";
import { SOL_DEFAULTS, type SolToken } from "@/lib/solana/constants";

/** Jupiter-verified Solana tokens (with official icons), plus search results when `q` is set. */
export function useSolanaTokens(q = "") {
  const query = q.trim();
  return useQuery({
    queryKey: ["sol-tokens", query],
    staleTime: query ? 60_000 : 10 * 60_000,
    queryFn: async () => {
      const r = await fetch(`/api/solana/tokens${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const j = await r.json();
      return ((j.tokens as SolToken[]) ?? []).length ? (j.tokens as SolToken[]) : query ? [] : SOL_DEFAULTS;
    },
  });
}

export type SolHoldingRow = { mint: string; raw: string; decimals: number; symbol: string; name: string; logoURI?: string; verified: boolean; usdPrice?: number };

/** Wallet balances on Solana (from chain) with metadata and USD prices. */
export function useSolanaPortfolio(owner?: string) {
  return useQuery({
    queryKey: ["sol-portfolio", owner],
    enabled: !!owner,
    refetchInterval: 20_000,
    retry: 1,
    queryFn: async () => {
      const r = await fetch(`/api/solana/portfolio?owner=${owner}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Solana balances unavailable");
      return j.items as SolHoldingRow[];
    },
  });
}
