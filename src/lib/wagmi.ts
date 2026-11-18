import { createConfig, http, fallback, webSocket } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { robinhoodChain, robinhoodTestnet } from "@/config/chains";

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
const customRpc = process.env.NEXT_PUBLIC_RH_RPC_URL;
/** Optional WebSocket RPC (e.g. Alchemy wss://…) for push-based new-block updates. */
const wsRpc = process.env.NEXT_PUBLIC_RH_WS_URL;
const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";

/**
 * Wallets:
 *  - Injected (EIP-6963 discovery): MetaMask, Rabby, Robinhood Wallet in-app browser, etc.
 *  - WalletConnect: mobile wallets incl. Robinhood Wallet (requires NEXT_PUBLIC_WC_PROJECT_ID).
 */
const connectors = [
  injected({ shimDisconnect: true }),
  ...(wcProjectId
    ? [
        walletConnect({
          projectId: wcProjectId,
          showQrModal: true,
          metadata: {
            name: "MORROW",
            description: "Trade at your own pace.",
            url: typeof window !== "undefined" ? window.location.origin : "https://morrow.exchange",
            icons: [],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [robinhoodChain, robinhoodTestnet],
  connectors,
  multiInjectedProviderDiscovery: true,
  ssr: true,
  transports: {
    [robinhoodChain.id]: fallback([
      ...(wsRpc ? [webSocket(wsRpc, { keepAlive: true, reconnect: true })] : []),
      ...(customRpc ? [http(customRpc, { batch: true })] : []),
      http(PUBLIC_RPC, { batch: true }),
    ]),
    [robinhoodTestnet.id]: http("https://rpc.testnet.chain.robinhood.com", { batch: true }),
  },
});

export const walletConnectEnabled = !!wcProjectId;

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
