"use client";
import { useMemo } from "react";
import { useTokenList } from "./useTokenList";

/** Addresses from official registries only (core assets + Robinhood Stock Token API). Imported tokens never count. */
export function useVerifiedSet() {
  const { tokens, isLoading } = useTokenList(4663);
  const set = useMemo(() => new Set(tokens.filter((t) => t.source !== "custom").map((t) => t.address.toLowerCase())), [tokens]);
  return { isVerified: (a?: string) => !!a && set.has(a.toLowerCase()), isLoading };
}
