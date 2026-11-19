import type { SupportedChainId } from "./chains";

/**
 * Bridging runs on LI.FI (https://docs.li.fi), which aggregates bridges (Relay, Across,
 * Stargate, the canonical Arbitrum bridge…) and supports Robinhood Chain and Solana.
 */
export const LIFI_SOLANA = 1151111081099710;
export type BridgeChainId = Exclude<SupportedChainId, 46630> | typeof LIFI_SOLANA;
export const BRIDGE_CHAINS: BridgeChainId[] = [4663, 1, 8453, 42161, 56, LIFI_SOLANA];

/** LI.FI uses the zero address for EVM native gas tokens and the System Program id for SOL. */
const EVM_NATIVE = "0x0000000000000000000000000000000000000000";
const SOL_NATIVE = "11111111111111111111111111111111";

export type BridgeToken = { symbol: string; name: string; address: string; decimals: number; native?: boolean };

export const BRIDGE_TOKENS: Record<BridgeChainId, BridgeToken[]> = {
  4663: [
    { symbol: "ETH", name: "Ether", address: EVM_NATIVE, decimals: 18, native: true },
    { symbol: "USDG", name: "Global Dollar", address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", decimals: 6 },
  ],
  1: [
    { symbol: "ETH", name: "Ether", address: EVM_NATIVE, decimals: 18, native: true },
    { symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
    { symbol: "USDT", name: "Tether USD", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
  ],
  8453: [
    { symbol: "ETH", name: "Ether", address: EVM_NATIVE, decimals: 18, native: true },
    { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
  ],
  42161: [
    { symbol: "ETH", name: "Ether", address: EVM_NATIVE, decimals: 18, native: true },
    { symbol: "USDC", name: "USD Coin", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
    { symbol: "USDT", name: "Tether USD", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
  ],
  56: [
    { symbol: "BNB", name: "BNB", address: EVM_NATIVE, decimals: 18, native: true },
    { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
    { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
  ],
  [LIFI_SOLANA]: [
    { symbol: "SOL", name: "Solana", address: SOL_NATIVE, decimals: 9, native: true },
    { symbol: "USDC", name: "USD Coin", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
  ],
};

export const isBridgeSolana = (id: number) => id === LIFI_SOLANA;
/** App chain key used for logos / explorers (Solana → 101). */
export const appKey = (id: BridgeChainId) => (id === LIFI_SOLANA ? 101 : id);
