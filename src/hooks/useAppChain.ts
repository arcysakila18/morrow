"use client";
import { useAccount } from "wagmi";
import { create } from "./store";
import { DEFAULT_CHAIN_ID, SOLANA_ID, isSupportedChain, type AppChainId, type SupportedChainId } from "@/config/chains";

/** The EVM chain the user is browsing while disconnected. Never used to switch the wallet. */
export const viewChainStore = create<SupportedChainId>(DEFAULT_CHAIN_ID);
/** Whether the app is showing Solana instead of an EVM network. */
export const solanaModeStore = create<boolean>(false);

/**
 * Resolves which network the app shows:
 *  - Solana mode → Solana (EVM fields still describe the last EVM chain)
 *  - connected on a supported EVM chain → wallet chain
 *  - connected on an unsupported chain → `wrongNetwork`, reads fall back to the view chain
 *  - disconnected → view chain (user-selected, default Robinhood Chain)
 */
export function useAppChain() {
  const { chainId: walletChainId, isConnected } = useAccount();
  const viewChain = viewChainStore.use();
  // EVM only for now: Solana mode is switched off everywhere.
  solanaModeStore.use();
  const solana = false;
  const wrongNetwork = !solana && isConnected && !isSupportedChain(walletChainId);
  const chainId: SupportedChainId = isConnected && isSupportedChain(walletChainId) ? walletChainId : viewChain;
  /** Chain key for market data, logos and explorer links (Solana-aware). */
  const marketChainId: AppChainId = solana ? SOLANA_ID : chainId;
  return { chainId, marketChainId, isSolana: solana, walletChainId, wrongNetwork, isConnected };
}
