import { NextResponse } from "next/server";
import { prices } from "@/lib/solana/server";
import { isMint } from "@/lib/solana/constants";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(isMint).slice(0, 100);
  if (!ids.length) return NextResponse.json({ prices: {} });
  return NextResponse.json({ prices: await prices(ids) });
}
