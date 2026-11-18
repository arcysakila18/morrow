import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getOhlcv, getPools, getToken } from "@/lib/market/dexpaprika";

export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  if (!isAddress(address)) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  try {
    const [token, { pools }] = await Promise.all([getToken(address), getPools({ token: address, orderBy: "liquidity_usd", limit: 10 })]);
    const top = pools[0];
    const chart = top ? await getOhlcv(top.address).catch(() => []) : [];
    return NextResponse.json({ token, pools, chart, chartPool: top ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
