import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getTokenIcon } from "@/lib/tokens/icons";
import { tokenIcon as solanaIcon } from "@/lib/solana/server";
import { SOL_MINT, isMint } from "@/lib/solana/constants";
import { isSolana, isSupportedChain } from "@/config/chains";

/** GET /api/token-icon/<address|mint|native>?chainId=<id> → { url } (official logo or null). */
export async function GET(req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  const chainId = Number(new URL(req.url).searchParams.get("chainId") ?? 4663);
  let url: string | null = null;
  if (isSolana(chainId)) {
    const mint = address === "native" ? SOL_MINT : address;
    if (!isMint(mint)) return NextResponse.json({ url: null }, { status: 400 });
    url = await solanaIcon(mint).catch(() => null);
  } else {
    if ((address !== "native" && !isAddress(address)) || !isSupportedChain(chainId)) return NextResponse.json({ url: null }, { status: 400 });
    url = await getTokenIcon(chainId, address);
  }
  return NextResponse.json({ url }, { headers: { "Cache-Control": `public, s-maxage=${url ? 86_400 : 3_600}, stale-while-revalidate=86400` } });
}
