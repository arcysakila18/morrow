import { NextResponse } from "next/server";
import { holdings, prices, searchTokens } from "@/lib/solana/server";
import { isMint, type SolToken } from "@/lib/solana/constants";

export const dynamic = "force-dynamic";

/** GET /api/solana/portfolio?owner=<address> → balances (chain), metadata + icons (Jupiter), USD prices (Jupiter). */
export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner") ?? "";
  if (!isMint(owner)) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  try {
    const held = await holdings(owner);
    const mints = held.map((h) => h.mint);
    const [meta, px] = await Promise.all([
      searchTokens(mints.slice(0, 100).join(",")).catch(() => [] as SolToken[]),
      prices(mints).catch(() => ({}) as Record<string, number>),
    ]);
    const byMint = new Map(meta.map((m) => [m.mint, m]));
    const items = held.map((h) => {
      const m = byMint.get(h.mint);
      return { ...h, symbol: m?.symbol ?? `${h.mint.slice(0, 4)}…`, name: m?.name ?? "Unknown token", logoURI: m?.logoURI, verified: !!m?.verified, usdPrice: px[h.mint] };
    });
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, items: [] }, { status: 502 });
  }
}
