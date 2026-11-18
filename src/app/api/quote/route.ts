import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { zeroExQuote } from "@/lib/swap/providers/zeroEx";
import { oneInchQuote } from "@/lib/swap/providers/oneInch";
import { rialtoQuote } from "@/lib/swap/providers/rialto";
import { toWire, type ProviderStatus, type QuoteRequest, type WireQuote } from "@/lib/swap/types";

export const dynamic = "force-dynamic";

/** Server-side aggregator for API-key-gated providers. Keys never leave the server. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { chainId, tokenIn, tokenOut, amountIn, slippageBps, taker } = body as Record<string, string | number | undefined>;

  if (Number(chainId) !== 4663) return NextResponse.json({ quotes: [], statuses: [] });
  if (typeof tokenIn !== "string" || !isAddress(tokenIn) || typeof tokenOut !== "string" || !isAddress(tokenOut))
    return NextResponse.json({ error: "Invalid token address" }, { status: 400 });
  if (typeof amountIn !== "string" || !/^\d+$/.test(amountIn) || BigInt(amountIn) <= 0n)
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  const slip = Number(slippageBps);
  if (!Number.isInteger(slip) || slip < 1 || slip > 5000) return NextResponse.json({ error: "Invalid slippage" }, { status: 400 });
  if (taker !== undefined && (typeof taker !== "string" || !isAddress(taker))) return NextResponse.json({ error: "Invalid taker" }, { status: 400 });

  const req: QuoteRequest = {
    chainId: 4663,
    tokenIn: getAddress(tokenIn),
    tokenOut: getAddress(tokenOut),
    amountIn: BigInt(amountIn),
    slippageBps: slip,
    taker: taker ? getAddress(taker as string) : undefined,
  };

  const settled = await Promise.allSettled([zeroExQuote(req), oneInchQuote(req), rialtoQuote(req)]);
  const names = ["0x", "1inch", "Rialto"] as const;
  const ids = ["0x", "1inch", "rialto"] as const;
  const quotes: WireQuote[] = [];
  const statuses: ProviderStatus[] = [];
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i];
    if (s.status === "fulfilled") {
      if (s.value.quote) quotes.push(toWire(s.value.quote));
      statuses.push(s.value.status);
    } else {
      statuses.push({ provider: ids[i], name: names[i], state: "error" as const, message: (s.reason as Error)?.message ?? "Request failed" });
    }
  }
  return NextResponse.json({ quotes, statuses });
}
