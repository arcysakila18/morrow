import "server-only";
import { SOL_MINT, isMint, type SolToken } from "./constants";

/**
 * Server-side Solana integrations:
 *  - Jupiter (https://dev.jup.ag): Tokens V2 (metadata + official icons), Price V3, Ultra swap
 *    (order → sign in wallet → execute). With JUPITER_API_KEY the keyed api.jup.ag host is used.
 *  - Solana JSON-RPC (SOLANA_RPC_URL, default public mainnet-beta) for wallet balances.
 */
const KEY = process.env.JUPITER_API_KEY || "";
const JUP = KEY ? "https://api.jup.ag" : "https://lite-api.jup.ag";
const RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PuFbo6Lj4iSjDp6R";

const headers = (): HeadersInit => (KEY ? { "x-api-key": KEY } : {});

async function jup<T>(path: string, init: RequestInit & { revalidate?: number } = {}): Promise<T> {
  const { revalidate, ...rest } = init;
  const r = await fetch(`${JUP}${path}`, {
    ...rest,
    headers: { ...headers(), ...(rest.headers ?? {}) },
    ...(revalidate != null ? { next: { revalidate } } : { cache: "no-store" as const }),
    signal: AbortSignal.timeout(10_000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string; message?: string }).error || (j as { message?: string }).message || `Jupiter ${r.status}`);
  return j as T;
}

type JupToken = { id: string; name?: string; symbol?: string; icon?: string; decimals?: number; isVerified?: boolean; tags?: string[]; usdPrice?: number };

const mapToken = (t: JupToken): SolToken => ({
  mint: t.id,
  symbol: String(t.symbol ?? "?"),
  name: String(t.name ?? t.symbol ?? ""),
  decimals: Number(t.decimals ?? 0),
  logoURI: typeof t.icon === "string" && /^https:\/\//.test(t.icon) ? t.icon : undefined,
  verified: !!t.isVerified || (t.tags ?? []).includes("verified"),
  usdPrice: typeof t.usdPrice === "number" ? t.usdPrice : undefined,
});

/** Jupiter-verified tokens (official list, with icons). */
export async function verifiedTokens(): Promise<SolToken[]> {
  const list = await jup<JupToken[]>("/tokens/v2/tag?query=verified", { revalidate: 3600 });
  return (Array.isArray(list) ? list : []).filter((t) => isMint(t.id)).map(mapToken);
}

/** Search by symbol/name, or exact metadata for up to 100 comma-separated mints. */
export async function searchTokens(query: string): Promise<SolToken[]> {
  const list = await jup<JupToken[]>(`/tokens/v2/search?query=${encodeURIComponent(query)}`, { revalidate: 300 });
  return (Array.isArray(list) ? list : []).filter((t) => isMint(t.id)).map(mapToken);
}

export async function tokenIcon(mint: string): Promise<string | null> {
  const [t] = await searchTokens(mint).catch(() => []);
  return t?.mint === mint ? t.logoURI ?? null : null;
}

/** USD prices for up to 50 mints (Price V3). */
export async function prices(mints: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (let i = 0; i < mints.length; i += 50) {
    const chunk = mints.slice(i, i + 50);
    const j = await jup<Record<string, { usdPrice?: number }>>(`/price/v3?ids=${chunk.join(",")}`, { revalidate: 15 }).catch(() => ({}));
    for (const [k, v] of Object.entries(j)) if (typeof v?.usdPrice === "number") out[k] = v.usdPrice;
  }
  return out;
}

/** Ultra order: quote, and an unsigned transaction when `taker` is given. */
export function ultraOrder(params: { inputMint: string; outputMint: string; amount: string; taker?: string }) {
  const q = new URLSearchParams({ inputMint: params.inputMint, outputMint: params.outputMint, amount: params.amount });
  if (params.taker) q.set("taker", params.taker);
  return jup<Record<string, unknown>>(`/ultra/v1/order?${q}`);
}

/** Ultra execute: Jupiter lands the signed transaction and reports the outcome. */
export function ultraExecute(body: { signedTransaction: string; requestId: string }) {
  return jup<Record<string, unknown>>("/ultra/v1/execute", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message ?? "Solana RPC error");
  return j.result as T;
}

export type SolHolding = { mint: string; raw: string; decimals: number };

/** SOL + SPL (Token and Token-2022) balances for an owner, straight from the chain. */
export async function holdings(owner: string): Promise<SolHolding[]> {
  const [bal, ...accounts] = await Promise.all([
    rpc<{ value: number }>("getBalance", [owner, { commitment: "confirmed" }]),
    ...[TOKEN_PROGRAM, TOKEN_2022].map((programId) =>
      rpc<{ value: Array<{ account: { data: { parsed: { info: { mint: string; tokenAmount: { amount: string; decimals: number } } } } } }> }>(
        "getTokenAccountsByOwner",
        [owner, { programId }, { encoding: "jsonParsed", commitment: "confirmed" }],
      ).catch(() => ({ value: [] })),
    ),
  ]);
  const map = new Map<string, SolHolding>();
  for (const res of accounts)
    for (const a of res.value) {
      const info = a.account.data.parsed.info;
      if (info.tokenAmount.amount === "0") continue;
      const prev = map.get(info.mint);
      const raw = (BigInt(prev?.raw ?? "0") + BigInt(info.tokenAmount.amount)).toString();
      map.set(info.mint, { mint: info.mint, raw, decimals: info.tokenAmount.decimals });
    }
  // Native SOL is reported under the wSOL mint so prices and logos line up.
  const sol: SolHolding = { mint: SOL_MINT, raw: String(bal.value), decimals: 9 };
  const wsol = map.get(SOL_MINT);
  if (wsol) sol.raw = (BigInt(sol.raw) + BigInt(wsol.raw)).toString();
  map.delete(SOL_MINT);
  return [sol, ...map.values()];
}
