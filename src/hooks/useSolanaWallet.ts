"use client";
import { useSolanaWallets } from "@privy-io/react-auth/solana";

/** The user's active Solana wallet from Privy (external like Phantom, or embedded), if any. */
export function useSolanaWallet() {
  const { wallets, ready } = useSolanaWallets();
  const wallet = wallets[0];
  return { wallet, address: wallet?.address as string | undefined, ready };
}
