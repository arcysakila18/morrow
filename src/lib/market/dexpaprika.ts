import "server-only";
import { serverEnv } from "@/config/server-env";

/**
 * DexPaprika — indexed DEX data for Robinhood Chain (network id "robinhood").
 * Docs: https://docs.dexpaprika.com. All values come from on-chain swaps it indexes.
 */
import { CHAIN_META, SOLANA_META, isSolana, isSupportedChain } from "@/config/chains";
import { isAddress } from "viem";

/** DexPaprika network id for a chain, or null when the chain isn't indexed. */
export function networkFor(chainId: number): string | null {
  if (isSolana(chainId)) return SOLANA_META.network;
  return isSupportedChain(chainId) ? CHAIN_META[chainId].network ?? null : null;
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
/** EVM address on EVM networks, base58 mint/account on Solana. */
export function isTokenAddress(network: string, a: string) {
  return network === "solana" ? BASE58.test(a) : isAddress(a);
}
/** Solana addresses are case-sensitive; EVM ones are normalised to lowercase. */
export const normAddr = (network: string, a: string) => (network === "solana" ? a : a.toLowerCase());

/** Reads ?chainId= from a request and resolves the DexPaprika network (default Robinhood Chain). */
export function networkFromRequest(req: Request): string | null {
  return networkFor(Number(new URL(req.url).searchParams.get("chainId") ?? 4663));
}
const base = () => (serverEnv.dexPaprikaApiKey ? "https://api-pro.dexpaprika.com" : "https://api.dexpaprika.com");

async function get<T>(path: string, revalidate = 30): Promise<T> {
  const headers: HeadersInit = serverEnv.dexPaprikaApiKey ? { Authorization: serverEnv.dexPaprikaApiKey } : {};
  const r = await fetch(`${base()}${path}`, { headers, next: { revalidate }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`DexPaprika ${r.status}`);
  return r.json() as Promise<T>;
}

export type MarketPool = {
  address: string;
  dex: string;
  dexId: string;
  feeLabel: string | null;
  feeRate: number | null;
  tokens: { address: string; symbol: string; name: string; decimals?: number }[];
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  txns24h: number | null;
  priceChange24h: number | null;
  createdAt: string | null;
  feeApr: number | null;
};

export type MarketToken = {
  address: string;
  chain: string | null;
  symbol: string;
  name: string;
  decimals: number | null;
  priceUsd: number | null;
  change24h: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  fdvUsd: number | null;
  addedAt: string | null;
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && Number.isFinite(+v) ? +v : null);

/** Fee tier is only reported when unambiguous (Uniswap-style integer hundredths of a bip). */
function parseFee(fee: unknown): { label: string | null; rate: number | null } {
  const f = num(fee);
  if (f == null || f <= 0) return { label: null, rate: null };
  if (Number.isInteger(f) && f >= 1 && f <= 1_000_000) {
    const rate = f / 1_000_000;
    return { label: `${+(rate * 100).toFixed(4)}%`, rate };
  }
  return { label: null, rate: null };
}

function mapPool(p: Record<string, any>): MarketPool {
  const { label, rate } = parseFee(p.fee);
  const liq = num(p.liquidity_usd);
  const vol = num(p.volume_usd_24h ?? p.volume_usd);
  return {
    address: String(p.address ?? p.id),
    dex: String(p.dex_name ?? p.dex_id ?? "DEX"),
    dexId: String(p.dex_id ?? ""),
    feeLabel: label,
    feeRate: rate,
    tokens: (p.tokens ?? []).map((t: Record<string, any>) => ({ address: String(t.id ?? t.address), symbol: String(t.symbol ?? "?"), name: prettyName(String(t.symbol ?? ""), String(t.name ?? "")), decimals: num(t.decimals) ?? undefined })),
    liquidityUsd: liq,
    volume24hUsd: vol,
    txns24h: num(p.txns_24h ?? p.transactions_24h ?? p.transactions),
    priceChange24h: num(p.price_change_percentage_24h ?? p.last_price_change_usd_24h),
    createdAt: p.created_at ?? null,
    // Annualised from the last 24h of fees. Only shown when fee tier and liquidity are known.
    feeApr: rate != null && vol != null && liq && liq > 1000 ? ((vol * rate * 365) / liq) * 100 : null,
  };
}

export async function getPools(NETWORK: string, opts: { orderBy?: "volume_usd_24h" | "liquidity_usd" | "created_at"; limit?: number; token?: string; cursor?: string } = {}) {
  const q = new URLSearchParams({ order_by: opts.orderBy ?? "volume_usd_24h", sort: "desc", limit: String(opts.limit ?? 50) });
  if (opts.token) q.set("token_address", opts.token);
  if (opts.cursor) q.set("cursor", opts.cursor);
  const j = await get<Record<string, any>>(`/networks/${NETWORK}/pools/search?${q}`);
  const items: Record<string, any>[] = j.results ?? j.pools ?? [];
  return { pools: items.map(mapPool), nextCursor: (j.next_cursor as string | undefined) ?? null };
}

export async function getPool(NETWORK: string, address: string) {
  const j = await get<Record<string, any>>(`/networks/${NETWORK}/pools/${address}`, 30);
  return mapPool(j);
}

/** Friendlier display names for well-known assets (indexers often call native ETH "Ether"). */
const prettyName = (symbol: string, name: string) => (symbol.toUpperCase() === "ETH" && /^(ether|eth)$/i.test(name.trim()) ? "Ethereum" : name);

export async function getToken(NETWORK: string, address: string): Promise<MarketToken> {
  const j = await get<Record<string, any>>(`/networks/${NETWORK}/tokens/${address}`, 20);
  const s = j.summary ?? {};
  const d = s["24h"] ?? {};
  return {
    address: String(j.id ?? address),
    chain: j.chain ? String(j.chain) : null,
    symbol: String(j.symbol ?? "?"),
    name: prettyName(String(j.symbol ?? ""), String(j.name ?? "")),
    decimals: num(j.decimals),
    priceUsd: num(s.price_usd),
    change24h: num(d.last_price_usd_change ?? d.price_usd_change),
    volume24hUsd: num(d.volume_usd),
    liquidityUsd: num(s.liquidity_usd),
    fdvUsd: num(s.fdv ?? j.fdv),
    addedAt: j.added_at ?? null,
  };
}

export async function getPrices(NETWORK: string, addresses: string[]) {
  const out: Record<string, number> = {};
  for (let i = 0; i < addresses.length; i += 10) {
    const chunk = addresses.slice(i, i + 10);
    const j = await get<unknown>(`/networks/${NETWORK}/multi/prices?tokens=${chunk.join(",")}`, 10).catch(() => null);
    const rows = Array.isArray(j) ? j : ((j as Record<string, any>)?.prices ?? (j as Record<string, any>)?.results ?? []);
    for (const r of rows as Record<string, any>[]) {
      const p = num(r.price_usd);
      const id = r.id ?? r.address ?? r.token;
      if (id && p != null) out[normAddr(NETWORK, String(id))] = p;
    }
  }
  const missing = addresses.filter((a) => out[normAddr(NETWORK, a)] == null).slice(0, 10);
  await Promise.all(
    missing.map((a) =>
      getToken(NETWORK, a)
        .then((t) => {
          if (t.priceUsd != null) out[normAddr(NETWORK, a)] = t.priceUsd;
        })
        .catch(() => {}),
    ),
  );
  return out;
}

/**
 * Pool price history. Without an API key DexPaprika serves 1h+ candles for the last 24 hours;
 * with a (free) key, 7 days. Valid intervals: 1m 5m 10m 15m 30m 1h 6h 12h 24h.
 */
export async function getOhlcv(NETWORK: string, pool: string, inversed = false) {
  const keyed = !!serverEnv.dexPaprikaApiKey;
  const hours = keyed ? 168 : 24;
  const start = Math.floor((Date.now() - hours * 3600_000) / 1000);
  const j = await get<unknown>(`/networks/${NETWORK}/pools/${pool}/ohlcv?start=${start}&interval=1h&limit=${hours}${inversed ? "&inversed=true" : ""}`, 300);
  const rows = Array.isArray(j) ? j : [];
  const points = rows
    .map((r: Record<string, any>) => ({ t: Date.parse(r.time_open ?? r.time_close), c: num(r.close) }))
    .filter((r): r is { t: number; c: number } => Number.isFinite(r.t) && r.c != null && r.c > 0);
  return { points, hours };
}

/** Tokens ranked by 24h pool volume, with per-token market details. */
export async function getTokenRankings(NETWORK: string, orderBy: "volume_usd_24h" | "created_at", limit = 24) {
  const { pools } = await getPools(NETWORK, { orderBy, limit: 60 });
  const QUOTES = new Set(["weth", "eth", "usdg", "usdc", "usdt", "usde", "wbnb", "bnb", "dai", "usdc.e", "sol", "wsol"]);
  const seen = new Set<string>();
  const picks: string[] = [];
  for (const p of pools) {
    for (const t of p.tokens) {
      const a = normAddr(NETWORK, t.address);
      if (seen.has(a) || (orderBy === "created_at" && QUOTES.has(t.symbol.toLowerCase()))) continue;
      seen.add(a);
      picks.push(a);
    }
    if (picks.length >= limit) break;
  }
  const tokens = (await Promise.all(picks.slice(0, limit).map((a) => getToken(NETWORK, a).catch(() => null)))).filter(
    (t): t is MarketToken => !!t && (!t.chain || t.chain === NETWORK),
  );
  return dedupeBySymbol(tokens);
}

export async function searchTokens(NETWORK: string, query: string) {
  const j = await get<Record<string, any>>(`/search?query=${encodeURIComponent(query)}`, 60);
  const tokens: Record<string, any>[] = (j.tokens ?? []).filter((t: Record<string, any>) => t.chain === NETWORK);
  return tokens.slice(0, 20).map((t) => ({
    chain: NETWORK,
    address: String(t.id),
    symbol: String(t.symbol ?? "?"),
    name: String(t.name ?? ""),
    priceUsd: num(t.price_usd),
    liquidityUsd: num(t.liquidity_usd),
    volume24hUsd: num(t.volume_usd),
  }));
}

/**
 * Many copycat tokens reuse a popular symbol. Keep one row per symbol: the one with the
 * deepest liquidity (then volume). Different contracts stay reachable by address search.
 */
export function dedupeBySymbol<T extends { symbol: string; liquidityUsd: number | null; volume24hUsd: number | null }>(tokens: T[]): T[] {
  const best = new Map<string, T>();
  for (const t of tokens) {
    const k = t.symbol.trim().toUpperCase();
    const cur = best.get(k);
    const score = (x: T) => (x.liquidityUsd ?? 0) * 1e3 + (x.volume24hUsd ?? 0);
    if (!cur || score(t) > score(cur)) best.set(k, t);
  }
  return tokens.filter((t) => best.get(t.symbol.trim().toUpperCase()) === t);
}
