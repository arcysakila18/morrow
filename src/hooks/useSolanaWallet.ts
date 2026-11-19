"use client";
import { useEffect } from "react";
import { create } from "./store";

/**
 * Solana wallets connect directly through the provider each wallet injects (Phantom, Solflare,
 * Backpack). Morrow only ever asks the wallet to sign; keys never leave it.
 */
type PubKey = { toString(): string };
type Provider = {
  publicKey?: PubKey | null;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey?: PubKey } | void>;
  disconnect(): Promise<void>;
  signTransaction<T>(tx: T): Promise<T>;
  on?(event: string, cb: (...args: unknown[]) => void): void;
  removeListener?(event: string, cb: (...args: unknown[]) => void): void;
};
type W = Window & { phantom?: { solana?: Provider & { isPhantom?: boolean } }; solana?: Provider & { isPhantom?: boolean }; solflare?: Provider & { isSolflare?: boolean }; backpack?: Provider & { solana?: Provider } };

export type SolWalletId = "phantom" | "solflare" | "backpack";
export const SOL_WALLETS: { id: SolWalletId; name: string; site: string; browse?: (url: string) => string }[] = [
  { id: "phantom", name: "Phantom", site: "https://phantom.app/download", browse: (u) => `https://phantom.app/ul/browse/${encodeURIComponent(u)}?ref=${encodeURIComponent(new URL(u).origin)}` },
  { id: "solflare", name: "Solflare", site: "https://solflare.com/download", browse: (u) => `https://solflare.com/ul/v1/browse/${encodeURIComponent(u)}?ref=${encodeURIComponent(new URL(u).origin)}` },
  { id: "backpack", name: "Backpack", site: "https://backpack.app/download" },
];

export function getProvider(id: SolWalletId): Provider | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as W;
  if (id === "phantom") return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : undefined);
  if (id === "solflare") return w.solflare?.isSolflare ? w.solflare : undefined;
  if (id === "backpack") return w.backpack?.solana ?? (w.backpack?.connect ? w.backpack : undefined);
}

type State = { id: SolWalletId | null; address: string | null };
const solStore = create<State>({ id: null, address: null });
const SAVED = "morrow:sol-wallet";

export async function connectSolana(id: SolWalletId, silent = false) {
  const p = getProvider(id);
  if (!p) throw new Error(`${id} is not installed`);
  const res = await p.connect(silent ? { onlyIfTrusted: true } : undefined);
  const key = (res && "publicKey" in res ? res.publicKey : undefined) ?? p.publicKey;
  if (!key) throw new Error("No account returned by the wallet");
  solStore.set({ id, address: key.toString() });
  try { localStorage.setItem(SAVED, id); } catch {}
}

export async function disconnectSolana() {
  const { id } = solStore.get();
  if (id) await getProvider(id)?.disconnect().catch(() => {});
  solStore.set({ id: null, address: null });
  try { localStorage.removeItem(SAVED); } catch {}
}

/** Mounted once: silently reconnects a previously approved wallet and follows account switches. */
export function useSolanaAutoConnect() {
  useEffect(() => {
    let id: SolWalletId | null = null;
    try { id = localStorage.getItem(SAVED) as SolWalletId | null; } catch {}
    if (!id) return;
    const p = getProvider(id);
    if (!p) return;
    connectSolana(id, true).catch(() => {});
    const onChange = (...args: unknown[]) => {
      const key = args[0] as PubKey | null | undefined;
      if (key) solStore.set({ id, address: key.toString() });
      else solStore.set({ id: null, address: null });
    };
    p.on?.("accountChanged", onChange);
    p.on?.("disconnect", () => solStore.set({ id: null, address: null }));
    return () => p.removeListener?.("accountChanged", onChange);
  }, []);
}

/** The connected Solana wallet, if any. */
export function useSolanaWallet() {
  const s = solStore.use();
  const wallet =
    s.id && s.address
      ? {
          id: s.id,
          name: SOL_WALLETS.find((w) => w.id === s.id)?.name ?? "Solana wallet",
          address: s.address,
          signTransaction: <T,>(tx: T) => {
            const p = getProvider(s.id!);
            if (!p) throw new Error("Wallet not available");
            return p.signTransaction(tx);
          },
        }
      : undefined;
  return { wallet, address: wallet?.address, ready: true };
}
