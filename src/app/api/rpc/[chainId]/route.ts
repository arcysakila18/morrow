import { NextResponse } from "next/server";
import { isSupportedChain, type SupportedChainId } from "@/config/chains";
import { serverRpc } from "@/config/server-env";

export const dynamic = "force-dynamic";

/**
 * Same-origin JSON-RPC proxy for reads. Some public RPCs (e.g. Robinhood Chain's) don't allow
 * browser requests from other sites, so the app's own server relays them. Read-only methods only:
 * signing and sending always happen in the user's wallet.
 */
const ALLOWED = new Set([
  "eth_chainId", "net_version", "eth_blockNumber", "eth_call", "eth_estimateGas", "eth_gasPrice",
  "eth_maxPriorityFeePerGas", "eth_feeHistory", "eth_getBalance", "eth_getCode", "eth_getStorageAt",
  "eth_getTransactionCount", "eth_getTransactionByHash", "eth_getTransactionReceipt",
  "eth_getBlockByNumber", "eth_getBlockByHash", "eth_getLogs",
]);

type Req = { jsonrpc?: string; id?: unknown; method?: unknown; params?: unknown };

export async function POST(req: Request, ctx: { params: Promise<{ chainId: string }> }) {
  const chainId = Number((await ctx.params).chainId);
  if (!isSupportedChain(chainId)) return NextResponse.json({ error: "Unsupported network" }, { status: 400 });

  const text = await req.text();
  if (text.length > 200_000) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let body: Req | Req[];
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const list = Array.isArray(body) ? body : [body];
  if (list.length === 0 || list.length > 50) return NextResponse.json({ error: "Invalid batch" }, { status: 400 });
  const bad = list.find((r) => typeof r?.method !== "string" || !ALLOWED.has(r.method));
  if (bad) {
    const err = (r: Req) => ({ jsonrpc: "2.0", id: r?.id ?? null, error: { code: -32601, message: "Method not allowed through this proxy" } });
    return NextResponse.json(Array.isArray(body) ? list.map(err) : err(bad));
  }

  const upstream = await fetch(serverRpc(chainId as SupportedChainId), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: text,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!upstream) return NextResponse.json({ error: "Upstream RPC unreachable" }, { status: 502 });
  return new NextResponse(await upstream.text(), { status: upstream.status, headers: { "content-type": "application/json" } });
}
