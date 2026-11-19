import { defineChain } from "viem";
import { arbitrum, base, bsc, mainnet } from "viem/chains";

/**
 * Robinhood Chain network definitions.
 * Source of truth: https://docs.robinhood.com/chain/connecting
 */
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com", apiUrl: "https://robinhoodchain.blockscout.com/api" },
  },
});

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Explorer", url: "https://explorer.testnet.chain.robinhood.com" } },
  testnet: true,
});

/** Display order in the network selector. Robinhood Chain stays first and is the default. */
export const SUPPORTED_CHAINS = [robinhoodChain, mainnet, base, arbitrum, bsc, robinhoodTestnet] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]["id"];
export const DEFAULT_CHAIN_ID: SupportedChainId = robinhoodChain.id;
export const MAINNET_CHAIN_IDS = [4663, 1, 8453, 42161, 56] as const;

export function isSupportedChain(id: number | undefined): id is SupportedChainId {
  return SUPPORTED_CHAINS.some((c) => c.id === id);
}

export function getChain(id: number) {
  return SUPPORTED_CHAINS.find((c) => c.id === id) ?? robinhoodChain;
}

/** Short labels and metadata used by the UI and data providers. */
export const CHAIN_META: Record<
  SupportedChainId,
  { short: string; network?: string; dexscreener?: string; coingecko?: string; nativeCoingecko: string; llamaIcon: string; domain: string; testnet?: boolean }
> = {
  4663: { short: "Robinhood", network: "robinhood", dexscreener: "robinhood", nativeCoingecko: "ethereum", llamaIcon: "robinhood", domain: "robinhood.com" },
  1: { short: "Ethereum", network: "ethereum", dexscreener: "ethereum", coingecko: "ethereum", nativeCoingecko: "ethereum", llamaIcon: "ethereum", domain: "ethereum.org" },
  8453: { short: "Base", network: "base", dexscreener: "base", coingecko: "base", nativeCoingecko: "ethereum", llamaIcon: "base", domain: "base.org" },
  42161: { short: "Arbitrum", network: "arbitrum", dexscreener: "arbitrum", coingecko: "arbitrum-one", nativeCoingecko: "ethereum", llamaIcon: "arbitrum", domain: "arbitrum.io" },
  56: { short: "BNB Chain", network: "bsc", dexscreener: "bsc", coingecko: "binance-smart-chain", nativeCoingecko: "binancecoin", llamaIcon: "binance", domain: "bnbchain.org" },
  46630: { short: "Testnet", nativeCoingecko: "ethereum", llamaIcon: "robinhood", domain: "robinhood.com", testnet: true },
};

export function explorerUrl(chainId: number, kind: "tx" | "address" | "token", value: string) {
  const chain = getChain(chainId);
  // Etherscan-family explorers use /token/, Blockscout supports both.
  return `${chain.blockExplorers.default.url}/${kind}/${value}`;
}

/** Blockscout REST API (v2) base, for chains with an official Blockscout instance. */
export const BLOCKSCOUT_API: Partial<Record<SupportedChainId, string>> = {
  4663: "https://robinhoodchain.blockscout.com/api/v2",
  1: "https://eth.blockscout.com/api/v2",
  8453: "https://base.blockscout.com/api/v2",
  42161: "https://arbitrum.blockscout.com/api/v2",
};
