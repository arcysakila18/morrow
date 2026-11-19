export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getPools, isTokenAddress, networkFromRequest } from "@/lib/market/dexpaprika";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const network = networkFromRequest(req);
  if (!network) return NextResponse.json({ error: "Market data isn't available for this network" , pools: [] }, { status: 404 });
  const order = sp.get("order");
  const token = sp.get("token") ?? undefined;
  if (token && !isTokenAddress(network, token)) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  try {
    const data = await getPools(network, {
      orderBy: order === "tvl" ? "liquidity_usd" : order === "new" ? "created_at" : "volume_usd_24h",
      token,
      cursor: sp.get("cursor") ?? undefined,
      limit: 50,
    });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, pools: [] }, { status: 502 });
  }
}
