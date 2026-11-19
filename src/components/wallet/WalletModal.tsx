"use client";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { create } from "@/hooks/store";

/**
 * Single entry point for connecting: EVM wallets and email go through Privy's modal.
 */
type Request = false | "any" | "solana";
export const walletModalStore = create<Request>(false);
export const openWalletModal = (_kind: "any" | "solana" = "any") => walletModalStore.set("any");

export function WalletModal() {
  const req = walletModalStore.use();
  const { ready, authenticated, login, connectWallet } = usePrivy();

  useEffect(() => {
    if (!req || !ready) return;
    walletModalStore.set(false);
    // Never return a value from an effect: login() returns a Promise, and React would call it as a cleanup.
    if (!authenticated) {
      login();
      return;
    }
    connectWallet();
  }, [req, ready, authenticated, login, connectWallet]);

  return null;
}
