"use client";
import { useAccount } from "wagmi";
import { create } from "./store";
import { DEFAULT_CHAIN_ID, isSupportedChain, type SupportedChainId } from "@/config/chains";

/** The chain the user is browsing while disconnected. Never used to switch the wallet. */
export const viewChainStore = create<SupportedChainId>(DEFAULT_CHAIN_ID);

/**
 * Resolves which chain the app reads from:
 *  - connected on a supported chain → wallet chain
 *  - connected on an unsupported chain → `wrongNetwork`, reads fall back to the view chain
 *  - disconnected → view chain (user-selected, default mainnet)
 */
export function useAppChain() {
  const { chainId: walletChainId, isConnected } = useAccount();
  const viewChain = viewChainStore.use();
  const wrongNetwork = isConnected && !isSupportedChain(walletChainId);
  const chainId: SupportedChainId = isConnected && isSupportedChain(walletChainId) ? walletChainId : viewChain;
  return { chainId, walletChainId, wrongNetwork, isConnected };
}
