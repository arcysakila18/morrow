export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getToken, isTokenAddress, networkFromRequest, searchTokens } from "@/lib/market/dexpaprika";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 64);
  const network = networkFromRequest(req);
  if (q.length < 2 || !network) return NextResponse.json({ tokens: [] });
  try {
    if (isTokenAddress(network, q)) {
      const t = await getToken(network, q).catch(() => null);
      return NextResponse.json({ tokens: t ? [t] : [] });
    }
    return NextResponse.json({ tokens: await searchTokens(network, q) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, tokens: [] }, { status: 502 });
  }
}
