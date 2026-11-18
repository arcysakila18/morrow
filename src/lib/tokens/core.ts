import { getAddress, type Address } from "viem";
import { CONTRACTS, NATIVE_ADDRESS } from "@/config/contracts";
import type { SupportedChainId } from "@/config/chains";
import type { Token } from "./types";

export function nativeToken(chainId: number): Token {
  return { chainId, address: NATIVE_ADDRESS, symbol: "ETH", name: "Ether", decimals: 18, source: "core" };
}

/** Core assets from https://docs.robinhood.com/chain/contracts. Decimals are confirmed on-chain at load. */
export function coreTokens(chainId: SupportedChainId): Token[] {
  const c = CONTRACTS[chainId];
  const list: Token[] = [nativeToken(chainId)];
  if (c.weth) list.push({ chainId, address: getAddress(c.weth), symbol: "WETH", name: "Wrapped Ether", decimals: 18, source: "core" });
  if (c.usdg) list.push({ chainId, address: getAddress(c.usdg), symbol: "USDG", name: "Global Dollar", decimals: 6, source: "core" });
  return list;
}

export function isNative(t: { address: string } | Address | undefined | null) {
  if (!t) return false;
  const a = typeof t === "string" ? t : t.address;
  return a.toLowerCase() === NATIVE_ADDRESS.toLowerCase();
}

/** The ERC-20 used on-chain for a token (ETH → WETH). */
export function wrappedAddress(t: Token): Address | undefined {
  if (!isNative(t)) return t.address;
  return CONTRACTS[t.chainId as SupportedChainId]?.weth;
}

export function sameToken(a?: Token | null, b?: Token | null) {
  return !!a && !!b && a.chainId === b.chainId && a.address.toLowerCase() === b.address.toLowerCase();
}
