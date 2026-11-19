/** Wrapped SOL mint. Jupiter treats it as native SOL (wraps/unwraps automatically). */
export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const isMint = (v: unknown): v is string => typeof v === "string" && BASE58.test(v);

export type SolToken = {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  verified: boolean;
  usdPrice?: number;
};

/** Always-available defaults so the swap card works even if the token API is slow. */
export const SOL_DEFAULTS: SolToken[] = [
  { mint: SOL_MINT, symbol: "SOL", name: "Solana", decimals: 9, verified: true },
  { mint: USDC_MINT, symbol: "USDC", name: "USD Coin", decimals: 6, verified: true },
];
