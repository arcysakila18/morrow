import { NextResponse } from "next/server";
import { getTokenRegistry } from "@/lib/tokens/server-registry";
import { isSupportedChain } from "@/config/chains";

export const revalidate = 3600;

export async function GET(req: Request) {
  const chainId = Number(new URL(req.url).searchParams.get("chainId") ?? 4663);
  if (!isSupportedChain(chainId)) return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
  const data = await getTokenRegistry(chainId);
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" } });
}
