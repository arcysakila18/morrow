import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getOhlcv, getPool, networkFromRequest } from "@/lib/market/dexpaprika";

export async function GET(req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  if (!isAddress(address)) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  const network = networkFromRequest(req);
  if (!network) return NextResponse.json({ error: "Market data isn't available for this network" , chart: [] }, { status: 404 });
  try {
    const [pool, chart] = await Promise.all([getPool(network, address), getOhlcv(network, address).catch(() => [])]);
    return NextResponse.json({ pool, chart });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
