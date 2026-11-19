"use client";
import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { create } from "@/hooks/store";
import { solanaModalStore } from "./SolanaConnectModal";

/**
 * Single entry point for connecting. EVM wallets (and email) go through Privy's modal;
 * "solana" opens Morrow's own Solana wallet picker (Phantom, Solflare, Backpack).
 */
type Request = false | "any" | "solana";
export const walletModalStore = create<Request>(false);
export const openWalletModal = (kind: "any" | "solana" = "any") => {
  if (kind === "solana") return solanaModalStore.set(true);
  walletModalStore.set(kind);
};

export function WalletModal() {
  const req = walletModalStore.use();
  const { ready, authenticated, login, connectWallet } = usePrivy();

  useEffect(() => {
    if (!req || !ready) return;
    walletModalStore.set(false);
    if (!authenticated) return login();
    connectWallet();
  }, [req, ready, authenticated, login, connectWallet]);

  return null;
}
