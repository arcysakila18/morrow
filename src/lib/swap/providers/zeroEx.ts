import "server-only";
import { getAddress, isAddress, type Address, type Hex } from "viem";
import { NATIVE_ADDRESS } from "@/config/contracts";
import { serverEnv } from "@/config/server-env";
import type { ProviderStatus, Quote, QuoteRequest, RouteHop } from "../types";

const BASE = "https://api.0x.org";

/**
 * 0x Swap API v2 (AllowanceHolder flow). Supports Robinhood Chain (4663), including
 * RFQ liquidity for Stock Tokens. https://0x.org/docs
 */
export async function zeroExQuote(req: QuoteRequest): Promise<{ quote: Quote | null; status: ProviderStatus }> {
  const name = "0x";
  if (!serverEnv.zeroExApiKey) return { quote: null, status: { provider: "0x", name, state: "not-configured", message: "Set ZEROEX_API_KEY" } };

  const firm = !!req.taker;
  const params = new URLSearchParams({
    chainId: String(req.chainId),
    sellToken: req.tokenIn,
    buyToken: req.tokenOut,
    sellAmount: req.amountIn.toString(),
    slippageBps: String(req.slippageBps),
  });
  if (req.taker) params.set("taker", req.taker);

  const res = await fetch(`${BASE}/swap/allowance-holder/${firm ? "quote" : "price"}?${params}`, {
    headers: { "0x-api-key": serverEnv.zeroExApiKey, "0x-version": "v2" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return { quote: null, status: { provider: "0x", name, state: "error", message: j?.message || j?.name || `HTTP ${res.status}` } };
  if (j.liquidityAvailable === false || !j.buyAmount) return { quote: null, status: { provider: "0x", name, state: "no-route" } };

  const sellingNative = req.tokenIn.toLowerCase() === NATIVE_ADDRESS.toLowerCase();
  const spender: Address | undefined = sellingNative ? undefined : pickAddress(j.issues?.allowance?.spender ?? j.allowanceTarget);

  let tx: Quote["tx"];
  if (firm && j.transaction?.to && j.transaction?.data) {
    const to = getAddress(j.transaction.to);
    // Safety: with AllowanceHolder, the tx target must be the contract we approve.
    if (spender && to.toLowerCase() !== spender.toLowerCase()) {
      return { quote: null, status: { provider: "0x", name, state: "error", message: "Rejected: transaction target does not match allowance target" } };
    }
    tx = { to, data: j.transaction.data as Hex, value: BigInt(j.transaction.value ?? 0), gas: j.transaction.gas ? BigInt(j.transaction.gas) : undefined };
  }

  const tokenSym = new Map<string, string>((j.route?.tokens ?? []).map((t: { address: string; symbol: string }) => [t.address.toLowerCase(), t.symbol]));
  const route: RouteHop[] = (j.route?.fills ?? []).map((f: { from: string; to: string; source: string; proportionBps: string }) => ({
    tokenIn: tokenSym.get(f.from.toLowerCase()) ?? f.from,
    tokenOut: tokenSym.get(f.to.toLowerCase()) ?? f.to,
    venue: f.source.replace(/_/g, " "),
    share: Number(f.proportionBps) / 10_000,
  }));

  const amountOut = BigInt(j.buyAmount);
  const minAmountOut = j.minBuyAmount ? BigInt(j.minBuyAmount) : (amountOut * BigInt(10_000 - req.slippageBps)) / 10_000n;
  return {
    quote: {
      provider: "0x",
      providerName: "0x",
      chainId: req.chainId,
      tokenIn: req.tokenIn,
      tokenOut: req.tokenOut,
      amountIn: req.amountIn,
      amountOut,
      minAmountOut,
      route,
      gasEstimate: j.transaction?.gas ? BigInt(j.transaction.gas) : j.gas ? BigInt(j.gas) : undefined,
      spender,
      tx,
      firm: !!tx,
      fetchedAt: Date.now(),
    },
    status: { provider: "0x", name, state: "ok" },
  };
}

function pickAddress(v: unknown): Address | undefined {
  return typeof v === "string" && isAddress(v) ? getAddress(v) : undefined;
}
