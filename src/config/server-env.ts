import "server-only";

/** Server-only configuration. Never import from client components. */
export const serverEnv = {
  zeroExApiKey: process.env.ZEROEX_API_KEY || "",
  oneInchApiKey: process.env.ONEINCH_API_KEY || "",
  dexPaprikaApiKey: process.env.DEXPAPRIKA_API_KEY || "",
  rialtoApiUrl: process.env.RIALTO_API_URL || "",
  rialtoApiKey: process.env.RIALTO_API_KEY || "",
  rpcUrl: process.env.RH_RPC_URL || process.env.NEXT_PUBLIC_RH_RPC_URL || "https://rpc.mainnet.chain.robinhood.com",
};
