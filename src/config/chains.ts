import { defineChain } from "viem";

/**
 * Robinhood Chain network definitions.
 * Source of truth: https://docs.robinhood.com/chain/connecting
 */
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com", apiUrl: "https://robinhoodchain.blockscout.com/api" },
  },
});

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.testnet.chain.robinhood.com" },
  },
  testnet: true,
});

export const SUPPORTED_CHAINS = [robinhoodChain, robinhoodTestnet] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]["id"];
export const DEFAULT_CHAIN_ID: SupportedChainId = robinhoodChain.id;

export function isSupportedChain(id: number | undefined): id is SupportedChainId {
  return SUPPORTED_CHAINS.some((c) => c.id === id);
}

export function getChain(id: SupportedChainId) {
  return SUPPORTED_CHAINS.find((c) => c.id === id)!;
}

export function explorerUrl(chainId: number, kind: "tx" | "address" | "token", value: string) {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId) ?? robinhoodChain;
  return `${chain.blockExplorers.default.url}/${kind}/${value}`;
}

/** Blockscout REST API (v2) base for chains we index through the server proxy. */
export const BLOCKSCOUT_API: Partial<Record<SupportedChainId, string>> = {
  4663: "https://robinhoodchain.blockscout.com/api/v2",
};
