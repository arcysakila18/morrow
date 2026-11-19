"use client";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { create } from "@/hooks/store";

/**
 * Wallet connection runs through Privy's modal. `openWalletModal()` stays the single
 * entry point used across the app; this bridge opens Privy's login when it is called.
 */
export const walletModalStore = create(false);
export const openWalletModal = () => walletModalStore.set(true);

export function WalletModal() {
  const open = walletModalStore.use();
  const { ready, authenticated, login, connectWallet } = usePrivy();

  useEffect(() => {
    if (!open || !ready) return;
    walletModalStore.set(false);
    // Already signed in (e.g. via email) but no wallet linked to wagmi yet → connect one; otherwise log in.
    if (authenticated) connectWallet();
    else login();
  }, [open, ready, authenticated, login, connectWallet]);

  return null;
}
