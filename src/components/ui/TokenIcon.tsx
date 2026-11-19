"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { NATIVE_ADDRESS } from "@/config/contracts";
import { useAppChain } from "@/hooks/useAppChain";

const isEthLike = (s: string) => /^(W?ETH)$/i.test(s);

/** Resolves an official logo for a token on a chain via /api/token-icon (cached for a day). */
function useOfficialIcon(address: string | undefined, chainId: number) {
  const solana = chainId === 101;
  const a = solana ? address : address?.toLowerCase();
  const lookup = a?.toLowerCase() === NATIVE_ADDRESS.toLowerCase() ? "native" : a;
  return useQuery({
    queryKey: ["token-icon-v3", chainId, lookup],
    enabled: !!lookup && (lookup === "native" || (solana ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(lookup) : /^0x[0-9a-f]{40}$/.test(lookup))),
    staleTime: 24 * 3_600_000,
    gcTime: 24 * 3_600_000,
    retry: false,
    queryFn: async () => {
      const r = await fetch(`/api/token-icon/${lookup}?chainId=${chainId}`);
      if (!r.ok) return null;
      return ((await r.json()).url as string | null) ?? null;
    },
  }).data;
}

/** Token logo: official image when one exists, otherwise a quiet monogram — never a guessed image. */
export function TokenIcon({
  symbol,
  src,
  address,
  size = 28,
  className,
  stock,
  chainId,
}: {
  symbol: string;
  src?: string;
  address?: string;
  /** Defaults to the chain the app is showing. */
  chainId?: number;
  size?: number;
  className?: string;
  stock?: boolean;
}) {
  // A src from an official list (Uniswap list, Jupiter, Blockscout) is used directly; otherwise,
  // or if it fails to load, the token's official logo is resolved server-side.
  const app = useAppChain();
  const [srcFailed, setSrcFailed] = useState(false);
  const [failed, setFailed] = useState(false);
  const useSrc = !!src && !srcFailed;
  const official = useOfficialIcon(useSrc ? undefined : address, chainId ?? app.marketChainId);
  const url = useSrc ? src : official || undefined;
  useEffect(() => {
    setFailed(false);
    setSrcFailed(false);
  }, [src, address]);
  const label = symbol.replace(/[^A-Za-z0-9]/g, "").slice(0, symbol.length > 4 ? 2 : 3).toUpperCase() || "?";

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2", className)}
      style={{ width: size, height: size }}
    >
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => (useSrc ? setSrcFailed(true) : setFailed(true))} />
      ) : isEthLike(symbol) ? (
        <svg viewBox="0 0 32 32" className="h-full w-full">
          <circle cx="16" cy="16" r="16" fill="#2a2b30" />
          <path d="M16 6.5 10.2 16 16 19.4 21.8 16Z" fill="#F8F8F5" />
          <path d="M16 20.6 10.2 17.2 16 25.5 21.8 17.2Z" fill="#F8F8F5" fillOpacity=".65" />
        </svg>
      ) : (
        <span
          className={cn("flex h-full w-full items-center justify-center font-semibold tracking-tight", stock ? "bg-lime/15 text-lime" : "bg-surface-3 text-ink")}
          style={{ fontSize: Math.max(9, size * 0.34) }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
