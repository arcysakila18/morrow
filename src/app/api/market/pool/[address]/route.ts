export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getOhlcv, getPool, networkFromRequest, isTokenAddress } from "@/lib/market/dexpaprika";

export async function GET(req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  const network = networkFromRequest(req);
  if (!network) return NextResponse.json({ error: "Market data isn't available for this network" , chart: [] }, { status: 404 });
  if (!isTokenAddress(network, address)) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  try {
    const [pool, chart] = await Promise.all([getPool(network, address), getOhlcv(network, address).then((r) => r.points).catch(() => [])]);
    return NextResponse.json({ pool, chart });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
