export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getOhlcv, getPools, getToken, networkFromRequest, isTokenAddress } from "@/lib/market/dexpaprika";

export async function GET(req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  const network = networkFromRequest(req);
  if (!network) return NextResponse.json({ error: "Market data isn't available for this network" , pools: [] }, { status: 404 });
  if (!isTokenAddress(network, address)) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  try {
    const [token, { pools }] = await Promise.all([getToken(network, address), getPools(network, { token: address, orderBy: "liquidity_usd", limit: 10 })]);
    // Deepest pool, oriented so the chart is this token's price in the quote token.
    const top = pools[0];
    const isBase = !!top && top.tokens[0]?.address.toLowerCase() === address.toLowerCase();
    const isQuote = !!top && top.tokens[1]?.address.toLowerCase() === address.toLowerCase();
    const res = top && (isBase || isQuote) ? await getOhlcv(network, top.address, isQuote).catch(() => ({ points: [], hours: 0 })) : { points: [], hours: 0 };
    return NextResponse.json({ token, pools, chart: res.points, chartHours: res.hours, chartPool: top ?? null, chartPair: isQuote ? [top!.tokens[1], top!.tokens[0]] : top?.tokens ?? [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
