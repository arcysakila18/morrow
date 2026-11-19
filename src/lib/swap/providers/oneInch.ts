import "server-only";
import { getAddress, type Address, type Hex } from "viem";
import { NATIVE_ADDRESS } from "@/config/contracts";
import { serverEnv } from "@/config/server-env";
import type { ProviderStatus, Quote, QuoteRequest, RouteHop } from "../types";

/** 1inch moved to api.1inch.com (Business Portal); keys from the old dev portal may still be on api.1inch.dev. */
const HOSTS = process.env.ONEINCH_API_BASE ? [process.env.ONEINCH_API_BASE] : ["https://api.1inch.com/swap/v6.0", "https://api.1inch.dev/swap/v6.0"];
let preferred = 0;

/** GET against the 1inch Swap API, falling back to the legacy host on auth/not-found/network errors. */
async function oneInchFetch(path: string, headers: HeadersInit, ms: number) {
  let last: Response | null = null;
  for (let k = 0; k < HOSTS.length; k++) {
    const i = (preferred + k) % HOSTS.length;
    const r = await fetch(`${HOSTS[i]}${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(ms) }).catch(() => null);
    if (r && ![401, 403, 404].includes(r.status)) {
      preferred = i;
      return r;
    }
    last = r ?? last;
  }
  return last ?? new Response(JSON.stringify({ description: "1inch unreachable" }), { status: 502 });
}

const spenderCache = new Map<number, { address: Address; at: number }>();

async function getSpender(chainId: number, headers: HeadersInit): Promise<Address> {
  const hit = spenderCache.get(chainId);
  if (hit && Date.now() - hit.at < 3_600_000) return hit.address;
  const r = await oneInchFetch(`/${chainId}/approve/spender`, headers, 6000);
  const j = await r.json();
  const address = getAddress(j.address);
  spenderCache.set(chainId, { address, at: Date.now() });
  return address;
}

/** 1inch Swap API v6 (Classic). Supports Robinhood Chain (4663), Ethereum, Base, Arbitrum and BNB Chain. */
export async function oneInchQuote(req: QuoteRequest): Promise<{ quote: Quote | null; status: ProviderStatus }> {
  const name = "1inch";
  if (!serverEnv.oneInchApiKey) return { quote: null, status: { provider: "1inch", name, state: "not-configured", message: "Set ONEINCH_API_KEY" } };
  const headers = { Authorization: `Bearer ${serverEnv.oneInchApiKey}`, accept: "application/json" };

  const firm = !!req.taker;
  const params = new URLSearchParams({ src: req.tokenIn, dst: req.tokenOut, amount: req.amountIn.toString(), includeGas: "true", includeProtocols: "true" });
  if (firm) {
    params.set("from", req.taker!);
    params.set("origin", req.taker!);
    params.set("slippage", (req.slippageBps / 100).toString());
    // We simulate ourselves after the approval step, so skip 1inch's balance/allowance estimate.
    params.set("disableEstimate", "true");
  }

  const res = await oneInchFetch(`/${req.chainId}/${firm ? "swap" : "quote"}?${params}`, headers, 8000);
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = j?.description || j?.error || `HTTP ${res.status}`;
    return { quote: null, status: { provider: "1inch", name, state: /insufficient liquidity|no route/i.test(msg) ? "no-route" : "error", message: msg } };
  }
  if (!j.dstAmount) return { quote: null, status: { provider: "1inch", name, state: "no-route" } };

  const sellingNative = req.tokenIn.toLowerCase() === NATIVE_ADDRESS.toLowerCase();
  const spender = sellingNative ? undefined : await getSpender(req.chainId, headers);

  let tx: Quote["tx"];
  if (firm && j.tx?.to) {
    const to = getAddress(j.tx.to);
    if (spender && to.toLowerCase() !== spender.toLowerCase()) {
      return { quote: null, status: { provider: "1inch", name, state: "error", message: "Rejected: router does not match approval spender" } };
    }
    tx = { to, data: j.tx.data as Hex, value: BigInt(j.tx.value ?? 0), gas: j.tx.gas ? BigInt(j.tx.gas) : undefined };
  }

  const route: RouteHop[] = [];
  const protocols = (j.protocols?.[0] ?? []) as Array<Array<{ name: string; part: number; fromTokenAddress: string; toTokenAddress: string }>>;
  for (const hop of protocols) for (const leg of hop) route.push({ tokenIn: leg.fromTokenAddress, tokenOut: leg.toTokenAddress, venue: leg.name.replace(/_/g, " "), share: leg.part / 100 });

  const amountOut = BigInt(j.dstAmount);
  return {
    quote: {
      provider: "1inch",
      providerName: "1inch",
      chainId: req.chainId,
      tokenIn: req.tokenIn,
      tokenOut: req.tokenOut,
      amountIn: req.amountIn,
      amountOut,
      minAmountOut: (amountOut * BigInt(10_000 - req.slippageBps)) / 10_000n,
      route: route.length ? route : [{ tokenIn: req.tokenIn, tokenOut: req.tokenOut, venue: "1inch Router", share: 1 }],
      gasEstimate: j.tx?.gas ? BigInt(j.tx.gas) : j.gas ? BigInt(j.gas) : undefined,
      spender,
      tx,
      firm: !!tx,
      fetchedAt: Date.now(),
    },
    status: { provider: "1inch", name, state: "ok" },
  };
}
