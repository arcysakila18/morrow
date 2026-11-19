"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { CHAIN_META, SOLANA_META, chainName, isSolana, isSupportedChain } from "@/config/chains";

/** Trust Wallet assets folder per network (the artwork wallets show). Robinhood Chain uses DefiLlama's. */
const TW_CHAIN: Record<number, string> = { 1: "ethereum", 8453: "base", 42161: "arbitrum", 56: "smartchain", 101: "solana" };

/**
 * Official network logo: DefiLlama's chain icon CDN, then the network's own site icon,
 * then a quiet monogram. Never an invented image.
 */
export function ChainLogo({ chainId, size = 20, className }: { chainId: number; size?: number; className?: string }) {
  const [attempt, setAttempt] = useState(0);
  const meta = isSolana(chainId) ? { ...SOLANA_META, testnet: false } : isSupportedChain(chainId) ? CHAIN_META[chainId] : undefined;
  const tw = TW_CHAIN[chainId];
  const sources = meta
    ? [
        ...(tw ? [`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${tw}/info/logo.png`] : []),
        `https://icons.llamao.fi/icons/chains/rsz_${meta.llamaIcon}.jpg`,
        `https://www.google.com/s2/favicons?domain=${meta.domain}&sz=128`,
      ]
    : [];
  const src = sources[attempt];
  const name = chainName(chainId);
  return (
    <span className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full bg-surface-2", meta?.testnet && "opacity-60 grayscale", className)} style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setAttempt((n) => n + 1)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-ink">{name.slice(0, 1)}</span>
      )}
    </span>
  );
}
