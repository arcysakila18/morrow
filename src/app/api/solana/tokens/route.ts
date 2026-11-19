import { NextResponse } from "next/server";
import { searchTokens, verifiedTokens } from "@/lib/solana/server";
import { SOL_DEFAULTS } from "@/lib/solana/constants";

export const dynamic = "force-dynamic";

/** GET /api/solana/tokens?q=<symbol|name|mint[,mint]> → Jupiter token metadata with official icons. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 4500);
  try {
    const tokens = q ? await searchTokens(q) : (await verifiedTokens()).slice(0, 300);
    return NextResponse.json({ tokens });
  } catch (e) {
    return NextResponse.json({ tokens: q ? [] : SOL_DEFAULTS, error: (e as Error).message }, { status: q ? 502 : 200 });
  }
}
