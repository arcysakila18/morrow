"use client";
import { useEffect, useState } from "react";

/** Pulls a USD price out of a stream message without assuming one exact schema. */
function readPrice(data: string): number | null {
  try {
    const j = JSON.parse(data);
    const v = j?.p ?? j?.price ?? j?.price_usd ?? j?.data?.p ?? j?.data?.price ?? j?.data?.price_usd;
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Live USD price for one token via SSE. Returns null until the first tick (or if streaming
 * is unavailable), so callers keep showing the last polled price.
 */
export function useLivePrice(address?: string, chainId = 4663) {
  const [price, setPrice] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!address || typeof EventSource === "undefined") return;
    setPrice(null);
    let failures = 0;
    const es = new EventSource(`/api/market/stream?address=${address}&chainId=${chainId}`);
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      const p = readPrice(e.data);
      if (p != null) setPrice(p);
    };
    es.onerror = () => {
      setConnected(false);
      if (++failures >= 5) es.close(); // give up quietly; polling stays in place
    };
    return () => es.close();
  }, [address, chainId]);
  return { price, connected };
}
