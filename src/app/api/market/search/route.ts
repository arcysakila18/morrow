import { NextResponse } from "next/server";
import { getToken, networkFromRequest, searchTokens } from "@/lib/market/dexpaprika";
import { isAddress } from "viem";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 64);
  const network = networkFromRequest(req);
  if (q.length < 2 || !network) return NextResponse.json({ tokens: [] });
  try {
    if (isAddress(q)) {
      const t = await getToken(network, q).catch(() => null);
      return NextResponse.json({ tokens: t ? [t] : [] });
    }
    return NextResponse.json({ tokens: await searchTokens(network, q) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, tokens: [] }, { status: 502 });
  }
}
