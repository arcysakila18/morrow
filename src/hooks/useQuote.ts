"use client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address } from "viem";
import { uniswapV3Quote } from "@/lib/swap/providers/uniswapV3";
import { isWrapPair, wrapQuote } from "@/lib/swap/providers/wrap";
import { fromWire, type ProviderStatus, type Quote, type QuoteRequest, type WireQuote } from "@/lib/swap/types";
import type { Token } from "@/lib/tokens/types";
import type { SupportedChainId } from "@/config/chains";

export const QUOTE_REFRESH_MS = 15_000;

export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export type QuoteResult = { best: Quote | null; quotes: Quote[]; statuses: ProviderStatus[] };

/** Fetches every available route in parallel and returns the best by output amount. */
export async function fetchQuotes(
  client: ReturnType<typeof usePublicClient>,
  req: QuoteRequest,
  symbolOf: (a: Address) => string,
): Promise<QuoteResult> {
  if (isWrapPair(req.chainId, req.tokenIn, req.tokenOut)) {
    const q = wrapQuote(req)!;
    return { best: q, quotes: [q], statuses: [{ provider: "wrap", name: "WETH", state: "ok" }] };
  }

  const statuses: ProviderStatus[] = [];
  const [uni, api] = await Promise.all([
    client
      ? uniswapV3Quote(client as never, req, symbolOf)
          .then((q) => {
            statuses.push({ provider: "uniswap-v3", name: "Uniswap v3", state: q ? "ok" : "no-route" });
            return q;
          })
          .catch((e: Error) => {
            statuses.push({ provider: "uniswap-v3", name: "Uniswap v3", state: "error", message: e.message });
            return null;
          })
      : Promise.resolve(null),
    fetch("/api/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...req, amountIn: req.amountIn.toString() }),
    })
      .then(async (r) => (r.ok ? ((await r.json()) as { quotes: WireQuote[]; statuses: ProviderStatus[] }) : { quotes: [], statuses: [] }))
      .catch(() => ({ quotes: [] as WireQuote[], statuses: [] as ProviderStatus[] })),
  ]);

  statuses.push(...api.statuses);
  const quotes = [uni, ...api.quotes.map(fromWire)].filter((q): q is Quote => !!q && q.amountOut > 0n);
  // When a wallet is connected, only firm (executable) quotes compete.
  const eligible = req.taker ? quotes.filter((q) => q.firm) : quotes;
  const best = eligible.reduce<Quote | null>((b, q) => (!b || q.amountOut > b.amountOut ? q : b), null);
  return { best, quotes, statuses };
}

export function useQuote(params: {
  chainId: SupportedChainId;
  tokenIn?: Token;
  tokenOut?: Token;
  amountIn: bigint | null;
  slippageBps: number;
  taker?: Address;
  symbolOf: (a: Address) => string;
}) {
  const client = usePublicClient({ chainId: params.chainId });
  const amount = useDebounced(params.amountIn);
  const enabled = !!params.tokenIn && !!params.tokenOut && !!amount && amount > 0n && params.tokenIn.address !== params.tokenOut.address;

  return useQuery({
    queryKey: ["quote", params.chainId, params.tokenIn?.address, params.tokenOut?.address, amount?.toString(), params.slippageBps, params.taker],
    enabled,
    refetchInterval: QUOTE_REFRESH_MS,
    retry: 1,
    queryFn: () =>
      fetchQuotes(
        client,
        {
          chainId: params.chainId,
          tokenIn: params.tokenIn!.address,
          tokenOut: params.tokenOut!.address,
          amountIn: amount!,
          slippageBps: params.slippageBps,
          taker: params.taker,
        },
        params.symbolOf,
      ),
  });
}
