import "server-only";
import { serverEnv } from "@/config/server-env";
import type { ProviderStatus, Quote, QuoteRequest } from "../types";

/**
 * Rialto — PropAMM spot exchange and aggregator on Robinhood Chain (https://rialto.xyz).
 *
 * MISSING DEPENDENCY: Rialto's swap API is offered through a partner program and its
 * request/response schema is not publicly documented. This adapter intentionally
 * returns "not-configured" until partner credentials and the API spec are obtained.
 * Implement `fetchQuote` against the partner spec; the rest of the pipeline
 * (approval, simulation, signing, tracking) is provider-agnostic and needs no change.
 *
 * Note: Rialto liquidity is still reachable today through 1inch, which routes across
 * Uniswap v2/v3/v4 and Rialto on Robinhood Chain.
 */
export async function rialtoQuote(_req: QuoteRequest): Promise<{ quote: Quote | null; status: ProviderStatus }> {
  const name = "Rialto";
  if (_req.chainId !== 4663) return { quote: null, status: { provider: "rialto", name, state: "unsupported", message: "Robinhood Chain only" } };
  if (!serverEnv.rialtoApiUrl || !serverEnv.rialtoApiKey) {
    return { quote: null, status: { provider: "rialto", name, state: "not-configured", message: "Partner API access required" } };
  }
  return { quote: null, status: { provider: "rialto", name, state: "unsupported", message: "Adapter awaiting partner API spec" } };
}
