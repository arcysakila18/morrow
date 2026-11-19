import { getAddress, type Address } from "viem";
import { CONTRACTS, NATIVE_ADDRESS } from "@/config/contracts";
import { getChain, type SupportedChainId } from "@/config/chains";
import type { Token } from "./types";
import { SITE } from "@/config/site";

export function nativeToken(chainId: number): Token {
  const c = getChain(chainId).nativeCurrency;
  return { chainId, address: NATIVE_ADDRESS, symbol: c.symbol, name: c.symbol === "ETH" ? "Ethereum" : c.name, decimals: c.decimals, source: "core" };
}

type Core = [address: string, symbol: string, name: string, decimals: number];

/**
 * Core assets per chain. Robinhood Chain: https://docs.robinhood.com/chain/contracts.
 * Other chains: the canonical wrapped native token plus major stablecoins / BTC.
 * Decimals are always re-confirmed on-chain by the server registry.
 */
const CORE: Partial<Record<SupportedChainId, Core[]>> = {
  4663: [
    ["0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73", "WETH", "Wrapped Ether", 18],
    ["0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", "USDG", "Global Dollar", 6],
  ],
  1: [
    ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "WETH", "Wrapped Ether", 18],
    ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "USDC", "USD Coin", 6],
    ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "USDT", "Tether USD", 6],
    ["0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", "WBTC", "Wrapped BTC", 8],
    ["0x6B175474E89094C44Da98b954EedeAC495271d0F", "DAI", "Dai Stablecoin", 18],
  ],
  8453: [
    ["0x4200000000000000000000000000000000000006", "WETH", "Wrapped Ether", 18],
    ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "USDC", "USD Coin", 6],
    ["0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", "cbBTC", "Coinbase Wrapped BTC", 8],
  ],
  42161: [
    ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", "WETH", "Wrapped Ether", 18],
    ["0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "USDC", "USD Coin", 6],
    ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "USDT", "Tether USD", 6],
    ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", "WBTC", "Wrapped BTC", 8],
    ["0x912CE59144191C1204E64559FE8253a0e49E6548", "ARB", "Arbitrum", 18],
  ],
  56: [
    ["0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "WBNB", "Wrapped BNB", 18],
    ["0x55d398326f99059fF775485246999027B3197955", "USDT", "Tether USD", 18],
    ["0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", "USDC", "USD Coin", 18],
    ["0x2170Ed0880ac9A755fd29B2688956BD959F933F8", "ETH", "Binance-Peg Ethereum", 18],
    ["0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", "BTCB", "Binance-Peg BTCB", 18],
  ],
};

/** The official Morrow token (src/config/site.ts), once its contract address is set. */
export function morrowToken(): Token | null {
  const t = SITE.token;
  if (!t.address || !/^0x[0-9a-fA-F]{40}$/.test(t.address)) return null;
  return { chainId: t.chainId, address: getAddress(t.address), symbol: t.symbol, name: t.name, decimals: t.decimals, logoURI: "/logo-mark.png", source: "core" };
}

export function coreTokens(chainId: SupportedChainId): Token[] {
  const morrow = morrowToken();
  return [
    nativeToken(chainId),
    ...(CORE[chainId] ?? []).map(([a, symbol, name, decimals]) => ({ chainId, address: getAddress(a), symbol, name, decimals, source: "core" as const })),
    ...(morrow && morrow.chainId === chainId ? [morrow] : []),
  ];
}

/** Preferred "receive" token when the swap page opens. */
export function defaultQuoteSymbol(chainId: number) {
  return chainId === 4663 ? "USDG" : "USDC";
}

export function isNative(t: { address: string } | Address | undefined | null) {
  if (!t) return false;
  const a = typeof t === "string" ? t : t.address;
  return a.toLowerCase() === NATIVE_ADDRESS.toLowerCase();
}

/** The ERC-20 used on-chain for a token (native → wrapped native). */
export function wrappedAddress(t: Token): Address | undefined {
  if (!isNative(t)) return t.address;
  return CONTRACTS[t.chainId as SupportedChainId]?.wrappedNative;
}

export function sameToken(a?: Token | null, b?: Token | null) {
  return !!a && !!b && a.chainId === b.chainId && a.address.toLowerCase() === b.address.toLowerCase();
}
