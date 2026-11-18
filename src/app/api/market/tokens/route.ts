import { NextResponse } from "next/server";
import { getTokenRankings } from "@/lib/market/dexpaprika";

export const revalidate = 30;

export async function GET(req: Request) {
  const order = new URL(req.url).searchParams.get("order") === "new" ? "created_at" : "volume_usd_24h";
  try {
    return NextResponse.json({ tokens: await getTokenRankings(order) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, tokens: [] }, { status: 502 });
  }
}
