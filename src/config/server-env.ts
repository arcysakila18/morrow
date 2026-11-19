import "server-only";
import type { SupportedChainId } from "./chains";

/** Server-only configuration. Never import from client components. */
export const serverEnv = {
  zeroExApiKey: process.env.ZEROEX_API_KEY || "",
  oneInchApiKey: process.env.ONEINCH_API_KEY || "",
  dexPaprikaApiKey: process.env.DEXPAPRIKA_API_KEY || "",
  rialtoApiUrl: process.env.RIALTO_API_URL || "",
  rialtoApiKey: process.env.RIALTO_API_KEY || "",
  coingeckoApiKey: process.env.COINGECKO_API_KEY || "",
};

const PUBLIC_RPCS: Record<SupportedChainId, string> = {
  4663: "https://rpc.mainnet.chain.robinhood.com",
  1: "https://ethereum-rpc.publicnode.com",
  8453: "https://mainnet.base.org",
  42161: "https://arb1.arbitrum.io/rpc",
  56: "https://bsc-dataseed.bnbchain.org",
  46630: "https://rpc.testnet.chain.robinhood.com",
};

/** Server RPC per chain: RPC_URL_<chainId> → (Robinhood only) RH_RPC_URL → public RPC. */
export function serverRpc(chainId: SupportedChainId) {
  return (
    process.env[`RPC_URL_${chainId}`] ||
    (chainId === 4663 ? process.env.RH_RPC_URL || process.env.NEXT_PUBLIC_RH_RPC_URL : undefined) ||
    PUBLIC_RPCS[chainId]
  );
}
