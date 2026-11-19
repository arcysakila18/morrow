import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getTokenIcon } from "@/lib/tokens/icons";
import { isSupportedChain } from "@/config/chains";

/** GET /api/token-icon/<address|native>?chainId=<id> → { url } (official logo or null). */
export async function GET(req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  const chainId = Number(new URL(req.url).searchParams.get("chainId") ?? 4663);
  if ((address !== "native" && !isAddress(address)) || !isSupportedChain(chainId)) return NextResponse.json({ url: null }, { status: 400 });
  const url = await getTokenIcon(chainId, address);
  return NextResponse.json({ url }, { headers: { "Cache-Control": `public, s-maxage=${url ? 86_400 : 3_600}, stale-while-revalidate=86400` } });
}
