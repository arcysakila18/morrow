"use client";
import type { Hash } from "viem";
import { create } from "@/hooks/store";

export type LocalTx = {
  hash: Hash;
  chainId: number;
  from: string;
  kind: "swap" | "approve" | "wrap" | "add-liquidity" | "remove-liquidity";
  summary: string;
  status: "pending" | "success" | "failed";
  createdAt: number;
};

/** Transactions submitted from this browser. Status always comes from on-chain receipts. */
export const txStore = create<LocalTx[]>([], "morrow:txs");

export function addTx(tx: LocalTx) {
  txStore.set((list) => [tx, ...list.filter((t) => t.hash !== tx.hash)].slice(0, 50));
}

export function updateTx(hash: Hash, patch: Partial<LocalTx>) {
  txStore.set((list) => list.map((t) => (t.hash === hash ? { ...t, ...patch } : t)));
}
