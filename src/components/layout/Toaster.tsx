"use client";
import { useEffect, useRef, useState } from "react";
import { getPublicClient } from "@wagmi/core";
import { wagmiConfig } from "@/lib/wagmi";
import { cn } from "@/lib/cn";
import { explorerUrl } from "@/config/chains";
import { Spinner } from "@/components/ui/Spinner";
import { IconCheck, IconClose, IconExternal } from "@/components/ui/Icons";
import { txStore, updateTx, type LocalTx } from "@/lib/tx/store";

type Toast = { id: string; tx: LocalTx };

const DISMISS_MS = { success: 7000, failed: 12000 } as const;
const POLL_MS = 4000;

/**
 * Transaction toasts. Follows every transaction submitted in this tab, keeps checking
 * pending ones against the chain even after the modal closes, and only shows
 * "confirmed" / "failed" from an on-chain receipt.
 */
export function Toaster() {
  const txs = txStore.use();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const mountedAt = useRef(Date.now());
  const seen = useRef(new Map<string, LocalTx["status"]>());

  // Raise or update a toast whenever a session transaction appears or changes status.
  useEffect(() => {
    for (const tx of txs) {
      if (tx.createdAt < mountedAt.current) continue;
      const prev = seen.current.get(tx.hash);
      if (prev === tx.status) continue;
      seen.current.set(tx.hash, tx.status);
      setToasts((list) => [{ id: tx.hash, tx }, ...list.filter((t) => t.id !== tx.hash)].slice(0, 4));
      if (tx.status !== "pending") {
        const id = tx.hash;
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id || t.tx.status === "pending")), DISMISS_MS[tx.status]);
      }
    }
  }, [txs]);

  // Background receipt watcher for pending transactions from this session.
  useEffect(() => {
    const id = setInterval(() => {
      txStore
        .get()
        .filter((t) => t.status === "pending" && t.createdAt >= mountedAt.current)
        .forEach((t) =>
          getPublicClient(wagmiConfig, { chainId: t.chainId as never })
            ?.getTransactionReceipt({ hash: t.hash })
            .then((r) => updateTx(t.hash, { status: r.status === "success" ? "success" : "failed" }))
            .catch(() => {}),
        );
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:inset-x-auto md:bottom-6 md:right-6 md:items-end">
      {toasts.map(({ id, tx }) => (
        <div
          key={id}
          role="status"
          className="pointer-events-auto flex w-full max-w-[360px] animate-rise items-center gap-3 rounded-[18px] border border-line bg-surface p-3 pr-2"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              tx.status === "success" ? "bg-lime text-ink" : tx.status === "failed" ? "bg-down/10 text-down" : "bg-surface-2 text-ink",
            )}
          >
            {tx.status === "pending" ? <Spinner className="h-4 w-4" /> : tx.status === "success" ? <IconCheck width={18} height={18} /> : <IconClose width={16} height={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">
              {tx.status === "pending" ? "Transaction pending" : tx.status === "success" ? "Transaction confirmed" : "Transaction failed"}
            </div>
            <div className="truncate text-xs text-muted">{tx.summary}</div>
          </div>
          <a
            href={explorerUrl(tx.chainId, "tx", tx.hash)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg p-2 text-faint transition hover:bg-surface-2 hover:text-ink"
            aria-label="View on explorer"
          >
            <IconExternal width={15} height={15} />
          </a>
          <button onClick={() => setToasts((l) => l.filter((t) => t.id !== id))} className="rounded-lg p-2 text-faint transition hover:bg-surface-2 hover:text-ink" aria-label="Dismiss">
            <IconClose width={14} height={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
