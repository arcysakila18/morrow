import { getAddress, isAddress } from "viem";
import { SOLANA_ID, chainName, isSupportedChain, type AppChainId, type SupportedChainId } from "@/config/chains";
import { NATIVE_ADDRESS } from "@/config/contracts";
import { LIFI_SOLANA } from "@/config/bridge";
import { coreTokens, defaultQuoteSymbol, isNative } from "./core";
import { SOL_MINT, USDC_MINT, type SolToken } from "@/lib/solana/constants";
import type { Token } from "./types";
import type { MarketToken } from "@/lib/market/dexpaprika";

/**
 * One token shape for every network. EVM tokens use their chain id; Solana tokens use
 * chainId 101 with the mint in `address` (wrapped-SOL mint = native SOL, as Jupiter treats it).
 */
/** Networks offered in the app (EVM only for now; Solana code paths stay dormant). */
export const MAINNETS: AppChainId[] = [4663, 1, 8453, 42161, 56];
export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

export const isSol = (t?: { chainId: number } | null) => t?.chainId === SOLANA_ID;

export function sameAny(a?: Token | null, b?: Token | null) {
  if (!a || !b || a.chainId !== b.chainId) return false;
  return isSol(a) ? a.address === b.address : a.address.toLowerCase() === b.address.toLowerCase();
}

export const tokenKey = (t: Token) => `${t.chainId}:${isSol(t) ? t.address : t.address.toLowerCase()}`;

export const solToToken = (t: SolToken): Token => ({
  chainId: SOLANA_ID,
  address: t.mint as Token["address"],
  symbol: t.symbol,
  name: t.name,
  decimals: t.decimals,
  logoURI: t.logoURI,
  source: t.verified ? "list" : "custom",
});

export const tokenToSol = (t: Token): SolToken => ({ mint: t.address, symbol: t.symbol, name: t.name, decimals: t.decimals, logoURI: t.logoURI, verified: t.source !== "custom" });

const SOL_CORE: Token[] = [
  { chainId: SOLANA_ID, address: SOL_MINT as Token["address"], symbol: "SOL", name: "Solana", decimals: 9, source: "core" },
  { chainId: SOLANA_ID, address: USDC_MINT as Token["address"], symbol: "USDC", name: "USD Coin", decimals: 6, source: "core" },
  { chainId: SOLANA_ID, address: USDT_MINT as Token["address"], symbol: "USDT", name: "Tether USD", decimals: 6, source: "core" },
];

/** Built-in assets for a network (native first). */
export function coreFor(chainId: AppChainId): Token[] {
  if (chainId === SOLANA_ID) return SOL_CORE;
  return isSupportedChain(chainId) ? coreTokens(chainId as SupportedChainId) : [];
}

export const nativeFor = (chainId: AppChainId) => coreFor(chainId)[0];

/** Default pay / receive pair for a network. */
export function defaultPair(chainId: AppChainId): { in?: Token; out?: Token } {
  const core = coreFor(chainId);
  if (chainId === SOLANA_ID) return { in: core[0], out: core[1] };
  return { in: core[0], out: core.find((t) => t.symbol === defaultQuoteSymbol(chainId)) };
}

/** A DexPaprika market row as a Token (null when decimals are unknown or the address is malformed). */
export function marketToToken(chainId: AppChainId, m: MarketToken, verified: boolean): Token | null {
  if (m.decimals == null) return null;
  let address = m.address;
  if (chainId !== SOLANA_ID) {
    if (!isAddress(address)) return null;
    address = getAddress(address);
  }
  return { chainId, address: address as Token["address"], symbol: m.symbol, name: m.name, decimals: m.decimals, source: verified ? "list" : "custom" };
}

/* ---------- LI.FI mapping (cross-network swaps) ---------- */
const EVM_ZERO = "0x0000000000000000000000000000000000000000";
const SOL_NATIVE = "11111111111111111111111111111111";
export const lifiChain = (chainId: number) => (chainId === SOLANA_ID ? LIFI_SOLANA : chainId);
export function lifiToken(t: Token) {
  if (isSol(t)) return (t.address as string) === SOL_MINT ? SOL_NATIVE : t.address;
  return isNative(t) || t.address === NATIVE_ADDRESS ? EVM_ZERO : t.address;
}
export const crossSupported = (chainId: number) => MAINNETS.includes(chainId as AppChainId);
export const networkLabel = (chainId: number) => chainName(chainId);
