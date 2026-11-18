import type { Address, Hex } from "viem";

export type ProviderId = "uniswap-v3" | "wrap" | "0x" | "1inch" | "rialto";

export type RouteHop = { tokenIn: string; tokenOut: string; venue: string; share?: number; fee?: number };

export type TxRequest = { to: Address; data: Hex; value: bigint; gas?: bigint };

export type Quote = {
  provider: ProviderId;
  providerName: string;
  chainId: number;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOut: bigint;
  /** Output floor enforced on-chain by the router/settler. */
  minAmountOut: bigint;
  route: RouteHop[];
  gasEstimate?: bigint;
  /** Estimated price impact in basis points (excludes LP fees where the provider can tell). */
  priceImpactBps?: number;
  /** Approval needed before the swap (ERC-20 sells only). */
  spender?: Address;
  /** Executable transaction. Absent for indicative quotes (wallet disconnected). */
  tx?: TxRequest;
  /** Whether this quote is firm (has tx for this taker) or indicative only. */
  firm: boolean;
  fetchedAt: number;
};

export type ProviderStatus = {
  provider: ProviderId;
  name: string;
  state: "ok" | "no-route" | "not-configured" | "error" | "unsupported";
  message?: string;
};

export type QuoteRequest = {
  chainId: number;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  slippageBps: number;
  taker?: Address;
};

/** JSON-safe wire form (bigint → string). */
export type WireQuote = Omit<Quote, "amountIn" | "amountOut" | "minAmountOut" | "gasEstimate" | "tx"> & {
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
  gasEstimate?: string;
  tx?: { to: Address; data: Hex; value: string; gas?: string };
};

export function toWire(q: Quote): WireQuote {
  return {
    ...q,
    amountIn: q.amountIn.toString(),
    amountOut: q.amountOut.toString(),
    minAmountOut: q.minAmountOut.toString(),
    gasEstimate: q.gasEstimate?.toString(),
    tx: q.tx ? { ...q.tx, value: q.tx.value.toString(), gas: q.tx.gas?.toString() } : undefined,
  };
}

export function fromWire(w: WireQuote): Quote {
  return {
    ...w,
    amountIn: BigInt(w.amountIn),
    amountOut: BigInt(w.amountOut),
    minAmountOut: BigInt(w.minAmountOut),
    gasEstimate: w.gasEstimate ? BigInt(w.gasEstimate) : undefined,
    tx: w.tx ? { ...w.tx, value: BigInt(w.tx.value), gas: w.tx.gas ? BigInt(w.tx.gas) : undefined } : undefined,
  };
}
