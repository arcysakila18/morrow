"use client";
import { TokenIcon } from "./TokenIcon";
import { ChainLogo } from "./ChainLogo";
import type { Token } from "@/lib/tokens/types";

/** Token logo with a small network badge in the corner (as in multi-network wallets). */
export function ChainTokenIcon({ token, size = 36, badge = true }: { token: Pick<Token, "symbol" | "address" | "logoURI" | "chainId" | "source">; size?: number; badge?: boolean }) {
  const b = Math.max(12, Math.round(size * 0.42));
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <TokenIcon symbol={token.symbol} address={token.address} src={token.logoURI} chainId={token.chainId} stock={token.source === "stock"} size={size} />
      {badge && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-[6px] bg-surface p-[2px]" style={{ lineHeight: 0 }}>
          <ChainLogo chainId={token.chainId} size={b - 4} className="rounded-[4px]" />
        </span>
      )}
    </span>
  );
}
