import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getOhlcv, getPool } from "@/lib/market/dexpaprika";

export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  if (!isAddress(address)) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  try {
    const [pool, chart] = await Promise.all([getPool(address), getOhlcv(address).catch(() => [])]);
    return NextResponse.json({ pool, chart });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
