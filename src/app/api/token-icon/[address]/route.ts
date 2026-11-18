import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getTokenIcon } from "@/lib/tokens/icons";

export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  if (!isAddress(address)) return NextResponse.json({ url: null }, { status: 400 });
  const url = await getTokenIcon(address);
  return NextResponse.json({ url }, { headers: { "Cache-Control": `public, s-maxage=${url ? 86_400 : 3_600}, stale-while-revalidate=86400` } });
}
