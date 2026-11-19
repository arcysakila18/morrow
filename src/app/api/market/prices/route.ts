import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { getPrices, networkFromRequest } from "@/lib/market/dexpaprika";

export async function GET(req: Request) {
  const list = (new URL(req.url).searchParams.get("tokens") ?? "").split(",").filter((a) => isAddress(a)).slice(0, 50);
  const network = networkFromRequest(req);
  if (!list.length || !network) return NextResponse.json({ prices: {} });
  try {
    return NextResponse.json({ prices: await getPrices(network, list.map((a) => a.toLowerCase())) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, prices: {} }, { status: 502 });
  }
}
