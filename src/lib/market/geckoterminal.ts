import "server-only";
import type { SupportedChainId } from "@/config/chains";
import { CONTRACTS, NATIVE_ADDRESS } from "@/config/contracts";

/**
 * GeckoTerminal public API (no key; 30 calls/minute). Used for price charts: the token's most
 * liquid pool, then hourly candles priced in USD for that token.
 */
const GT = "https://api.geckoterminal.com/api/v2";
export const GT_NETWORK: Partial<Record<number, string>> = { 4663: "robinhood", 1: "eth", 8453: "base", 42161: "arbitrum", 56: "bsc" };
const ZERO = "0x0000000000000000000000000000000000000000";

async function gt<T>(path: string, revalidate: number): Promise<T> {
  const r = await fetch(`${GT}${path}`, { headers: { accept: "application/json" }, next: { revalidate }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`GeckoTerminal ${r.status}`);
  return r.json() as Promise<T>;
}

/** Native gas token (zero / 0xEeee address) charts as its wrapped token. */
function chartAddress(chainId: number, address: string) {
  const a = address.toLowerCase();
  if (a === ZERO || a === NATIVE_ADDRESS.toLowerCase()) return CONTRACTS[chainId as SupportedChainId]?.wrappedNative?.toLowerCase() ?? a;
  return a;
}

export async function gtTokenChart(chainId: number, address: string): Promise<{ points: { t: number; c: number }[]; hours: number; pool: string | null }> {
  const network = GT_NETWORK[chainId];
  if (!network) return { points: [], hours: 0, pool: null };
  const token = chartAddress(chainId, address);
  const pools = await gt<{ data?: { attributes?: { address?: string } }[] }>(`/networks/${network}/tokens/${token}/pools?page=1`, 600);
  const pool = pools.data?.[0]?.attributes?.address;
  if (!pool) return { points: [], hours: 0, pool: null };
  const hours = 168;
  const j = await gt<{ data?: { attributes?: { ohlcv_list?: number[][] } } }>(
    `/networks/${network}/pools/${pool}/ohlcv/hour?aggregate=1&limit=${hours}&currency=usd&token=${token}`,
    60,
  );
  const points = (j.data?.attributes?.ohlcv_list ?? [])
    .map((r) => ({ t: Number(r[0]) * 1000, c: Number(r[4]) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.c) && p.c > 0)
    .sort((a, b) => a.t - b.t);
  return { points, hours, pool };
}
