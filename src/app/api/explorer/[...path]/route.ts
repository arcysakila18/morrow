import { NextResponse } from "next/server";
import { BLOCKSCOUT_API, isSupportedChain } from "@/config/chains";

/**
 * Read-only proxy to Blockscout v2 APIs (wallet balances, history). Pass ?chainId=.
 * Only allowlisted paths are forwarded.
 */
const ALLOW = [
  /^addresses\/0x[0-9a-fA-F]{40}\/(token-balances|transactions|token-transfers)$/,
  /^addresses\/0x[0-9a-fA-F]{40}$/,
  /^tokens\/0x[0-9a-fA-F]{40}$/,
  /^transactions\/0x[0-9a-fA-F]{64}$/,
];

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const joined = path.join("/");
  if (!ALLOW.some((r) => r.test(joined))) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const url = new URL(req.url);
  const chainId = Number(url.searchParams.get("chainId") ?? 4663);
  const base = isSupportedChain(chainId) ? BLOCKSCOUT_API[chainId] : undefined;
  if (!base) return NextResponse.json({ error: "No explorer API for this network" }, { status: 404 });
  url.searchParams.delete("chainId");
  const search = url.searchParams.toString() ? `?${url.searchParams}` : "";
  try {
    const r = await fetch(`${base}/${joined}${search}`, { next: { revalidate: 10 }, signal: AbortSignal.timeout(10_000) });
    const body = await r.text();
    return new NextResponse(body, { status: r.status, headers: { "content-type": "application/json" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
