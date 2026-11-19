export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getPrices, isTokenAddress, networkFromRequest, normAddr } from "@/lib/market/dexpaprika";

export async function GET(req: Request) {
  const network = networkFromRequest(req);
  if (!network) return NextResponse.json({ prices: {} });
  const list = (new URL(req.url).searchParams.get("tokens") ?? "").split(",").filter((a) => isTokenAddress(network, a)).slice(0, 50);
  if (!list.length) return NextResponse.json({ prices: {} });
  try {
    return NextResponse.json({ prices: await getPrices(network, list.map((a) => normAddr(network, a))) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, prices: {} }, { status: 502 });
  }
}
