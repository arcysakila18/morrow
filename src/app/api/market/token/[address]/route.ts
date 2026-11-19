export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getOhlcv, getPools, getToken, networkFromRequest, isTokenAddress } from "@/lib/market/dexpaprika";
import { gtTokenChart } from "@/lib/market/geckoterminal";

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
    // Chart: GeckoTerminal (7 days of hourly USD candles, no key needed); DexPaprika as fallback.
    const chainId = Number(new URL(req.url).searchParams.get("chainId"));
    let res: { points: { t: number; c: number }[]; hours: number } = await gtTokenChart(chainId, address).catch(() => ({ points: [], hours: 0, pool: null }));
    let source = "GeckoTerminal";
    if (res.points.length < 2 && top && (isBase || isQuote)) {
      res = await getOhlcv(network, top.address, isQuote).catch(() => ({ points: [], hours: 0 }));
      source = "DexPaprika";
    }
    return NextResponse.json({ token, pools, chart: res.points, chartHours: res.hours, chartSource: source, chartPool: top ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
