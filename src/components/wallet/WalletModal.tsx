"use client";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { create } from "@/hooks/store";

/**
 * Wallet connection runs through Privy's modal. `openWalletModal()` stays the single entry
 * point used across the app; pass "solana" to ask specifically for a Solana wallet.
 */
type Request = false | "any" | "solana";
export const walletModalStore = create<Request>(false);
export const openWalletModal = (kind: "any" | "solana" = "any") => walletModalStore.set(kind);

export function WalletModal() {
  const req = walletModalStore.use();
  const { ready, authenticated, login, connectWallet } = usePrivy();

  useEffect(() => {
    if (!req || !ready) return;
    walletModalStore.set(false);
    if (!authenticated) return login();
    // Signed in already: link/connect another wallet of the requested type.
    if (req === "solana") connectWallet({ walletChainType: "solana-only" } as never);
    else connectWallet();
  }, [req, ready, authenticated, login, connectWallet]);

  return null;
}
