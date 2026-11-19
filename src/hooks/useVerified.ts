"use client";
import { useMemo } from "react";
import { useTokenList } from "./useTokenList";
import { useAppChain } from "./useAppChain";
import { useSolanaTokens } from "./useSolana";
import { isNativeLike } from "@/config/token-logos";
import { SITE } from "@/config/site";

/** Addresses from official registries only (core assets, Robinhood Stock Token API, Uniswap default list). Imported tokens never count. */
export function useVerifiedSet() {
  const { chainId, isSolana } = useAppChain();
  const { tokens, isLoading } = useTokenList(chainId);
  const sol = useSolanaTokens("", isSolana);
  const set = useMemo(() => new Set(tokens.filter((t) => t.source !== "custom").map((t) => t.address.toLowerCase())), [tokens]);
  // Solana: Jupiter's verified list (mints are case-sensitive).
  const solSet = useMemo(() => new Set((sol.data ?? []).filter((t) => t.verified).map((t) => t.mint)), [sol.data]);
  if (isSolana) return { isVerified: (a?: string) => !!a && solSet.has(a), isLoading: sol.isLoading };
  // The network's native gas token (ETH, BNB) is always verified.
  return { isVerified: (a?: string) => !!a && (isNativeLike(a) || set.has(a.toLowerCase()) || (!!SITE.token.address && a.toLowerCase() === SITE.token.address.toLowerCase())), isLoading };
}
