import { http, fallback, webSocket, type Transport } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { arbitrum, base, bsc, mainnet } from "viem/chains";
import { robinhoodChain, robinhoodTestnet } from "@/config/chains";

/** Privy app id. Public by design (it identifies the app, it is not a secret). */
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmwmfm0ic00la0hjhtqmtgv47";

// Next.js only inlines literal env references, so each chain is listed explicitly.
const RPC = {
  4663: { http: process.env.NEXT_PUBLIC_RH_RPC_URL, ws: process.env.NEXT_PUBLIC_RH_WS_URL, public: "https://rpc.mainnet.chain.robinhood.com" },
  1: { http: process.env.NEXT_PUBLIC_RPC_URL_1, ws: process.env.NEXT_PUBLIC_WS_URL_1, public: "https://ethereum-rpc.publicnode.com" },
  8453: { http: process.env.NEXT_PUBLIC_RPC_URL_8453, ws: process.env.NEXT_PUBLIC_WS_URL_8453, public: "https://mainnet.base.org" },
  42161: { http: process.env.NEXT_PUBLIC_RPC_URL_42161, ws: process.env.NEXT_PUBLIC_WS_URL_42161, public: "https://arb1.arbitrum.io/rpc" },
  56: { http: process.env.NEXT_PUBLIC_RPC_URL_56, ws: process.env.NEXT_PUBLIC_WS_URL_56, public: "https://bsc-dataseed.bnbchain.org" },
} as const;

/** WebSocket (push) first when configured, then a private HTTP RPC, then the public RPC. */
function transport(c: { http?: string; ws?: string; public: string }): Transport {
  return fallback([
    ...(c.ws ? [webSocket(c.ws, { keepAlive: true, reconnect: true })] : []),
    ...(c.http ? [http(c.http, { batch: true })] : []),
    http(c.public, { batch: true }),
  ]);
}

/**
 * wagmi config for Privy. Privy supplies the connectors (browser wallets, WalletConnect,
 * Coinbase Wallet, and Privy embedded wallets for email login), so none are listed here.
 */
export const wagmiConfig = createConfig({
  chains: [robinhoodChain, mainnet, base, arbitrum, bsc, robinhoodTestnet],
  ssr: true,
  transports: {
    [robinhoodChain.id]: transport(RPC[4663]),
    [mainnet.id]: transport(RPC[1]),
    [base.id]: transport(RPC[8453]),
    [arbitrum.id]: transport(RPC[42161]),
    [bsc.id]: transport(RPC[56]),
    [robinhoodTestnet.id]: http("https://rpc.testnet.chain.robinhood.com", { batch: true }),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
