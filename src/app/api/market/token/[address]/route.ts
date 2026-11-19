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
    const top = pools[0];
    const chart = top ? await getOhlcv(network, top.address).catch(() => []) : [];
    return NextResponse.json({ token, pools, chart, chartPool: top ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
