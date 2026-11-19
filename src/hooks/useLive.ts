"use client";
import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWatchBlockNumber } from "wagmi";
import { create } from "./store";
import { useAppChain } from "./useAppChain";

/** Latest Robinhood Chain block seen by this tab, and when. */
export const liveStore = create<{ block: bigint | null; at: number }>({ block: null, at: 0 });

// Robinhood Chain produces ~10 blocks/s, so refreshes are throttled rather than per block.
const BALANCES_EVERY_MS = 2_500;
const QUOTES_EVERY_MS = 6_000;
const WATCH_POLL_MS = 1_000; // used only when no WebSocket RPC is configured

// Cheap reads (balances/allowances) refresh fast; heavier multi-call reads ride the slower cadence.
const FAST_KEYS = new Set(["balance", "readContracts", "readContract"]);
const SLOW_KEYS = new Set(["quote", "positions", "v3-pool"]);

/**
 * Drives realtime updates from new blocks on the active chain: on a WebSocket RPC this is push-based
 * (eth_subscribe newHeads); otherwise it polls the head once per second.
 */
export function useLiveSync() {
  const qc = useQueryClient();
  const last = useRef({ balances: 0, quotes: 0 });
  const { chainId } = useAppChain();
  useWatchBlockNumber({
    chainId,
    pollingInterval: WATCH_POLL_MS,
    emitOnBegin: true,
    onBlockNumber(block) {
      const now = Date.now();
      liveStore.set({ block, at: now });
      if (now - last.current.balances >= BALANCES_EVERY_MS) {
        last.current.balances = now;
        qc.invalidateQueries({ predicate: (q) => FAST_KEYS.has(String(q.queryKey[0])) });
      }
      if (now - last.current.quotes >= QUOTES_EVERY_MS) {
        last.current.quotes = now;
        qc.invalidateQueries({ predicate: (q) => SLOW_KEYS.has(String(q.queryKey[0])) });
      }
    },
  });
}

/** True when a block arrived in the last few seconds. */
export function useIsLive() {
  const { block, at } = liveStore.use();
  return { block, live: !!block && Date.now() - at < 8_000 };
}
