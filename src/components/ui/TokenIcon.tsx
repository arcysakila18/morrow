"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { CONTRACTS, NATIVE_ADDRESS } from "@/config/contracts";

const isEthLike = (s: string) => /^(W?ETH)$/i.test(s);

/** Resolves an official logo for a token address via /api/token-icon (cached for a day). */
function useOfficialIcon(address?: string) {
  const a = address?.toLowerCase();
  const lookup = a === NATIVE_ADDRESS.toLowerCase() ? CONTRACTS[4663].weth!.toLowerCase() : a;
  return useQuery({
    queryKey: ["token-icon", lookup],
    enabled: !!lookup && /^0x[0-9a-f]{40}$/.test(lookup),
    staleTime: 24 * 3_600_000,
    gcTime: 24 * 3_600_000,
    retry: false,
    queryFn: async () => {
      const r = await fetch(`/api/token-icon/${lookup}`);
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
}: {
  symbol: string;
  src?: string;
  address?: string;
  size?: number;
  className?: string;
  stock?: boolean;
}) {
  const official = useOfficialIcon(src ? undefined : address);
  const url = src || official || undefined;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const label = symbol.replace(/[^A-Za-z0-9]/g, "").slice(0, symbol.length > 4 ? 2 : 3).toUpperCase() || "?";

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2", className)}
      style={{ width: size, height: size }}
    >
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : isEthLike(symbol) ? (
        <svg viewBox="0 0 32 32" className="h-full w-full">
          <circle cx="16" cy="16" r="16" fill="#101114" />
          <path d="M16 6.5 10.2 16 16 19.4 21.8 16Z" fill="#F8F8F5" />
          <path d="M16 20.6 10.2 17.2 16 25.5 21.8 17.2Z" fill="#F8F8F5" fillOpacity=".65" />
        </svg>
      ) : (
        <span
          className={cn("flex h-full w-full items-center justify-center font-semibold tracking-tight", stock ? "bg-ink text-lime" : "bg-surface-3 text-ink")}
          style={{ fontSize: Math.max(9, size * 0.34) }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
