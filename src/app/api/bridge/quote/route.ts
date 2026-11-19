import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { BRIDGE_CHAINS, isBridgeSolana } from "@/config/bridge";
import { isMint } from "@/lib/solana/constants";

export const dynamic = "force-dynamic";

const LIFI = "https://li.quest/v1";
const validAddr = (chain: number, a: string) => (isBridgeSolana(chain) ? isMint(a) : isAddress(a));

/** LI.FI quote proxy. Returns the best route plus the transaction to sign on the source chain. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const fromChain = Number(sp.get("fromChain"));
  const toChain = Number(sp.get("toChain"));
  const fromToken = sp.get("fromToken") ?? "";
  const toToken = sp.get("toToken") ?? "";
  const fromAmount = sp.get("fromAmount") ?? "";
  const fromAddress = sp.get("fromAddress") ?? "";
  const toAddress = sp.get("toAddress") ?? "";
  const slippage = Math.min(0.05, Math.max(0.001, Number(sp.get("slippage") ?? 0.005)));

  if (!BRIDGE_CHAINS.includes(fromChain as never) || !BRIDGE_CHAINS.includes(toChain as never)) return NextResponse.json({ error: "Unsupported network" }, { status: 400 });
  if (!validAddr(fromChain, fromToken) || !validAddr(toChain, toToken)) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  if (!/^\d+$/.test(fromAmount) || BigInt(fromAmount) <= 0n) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  if (!validAddr(fromChain, fromAddress) || !validAddr(toChain, toAddress)) return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });

  const q = new URLSearchParams({
    fromChain: String(fromChain),
    toChain: String(toChain),
    fromToken,
    toToken,
    fromAmount,
    fromAddress,
    toAddress,
    slippage: String(slippage),
    integrator: "morrow",
    order: "CHEAPEST",
  });
  const r = await fetch(`${LIFI}/quote?${q}`, {
    headers: process.env.LIFI_API_KEY ? { "x-lifi-api-key": process.env.LIFI_API_KEY } : {},
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!r) return NextResponse.json({ error: "Bridge service unreachable" }, { status: 502 });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json({ error: j?.message || "No bridge route found for this transfer" }, { status: r.status === 404 ? 404 : 502 });

  const est = j.estimate ?? {};
  const sum = (arr?: Array<{ amountUSD?: string }>) => (arr ?? []).reduce((s, c) => s + (Number(c.amountUSD) || 0), 0);
  return NextResponse.json({
    tool: j.toolDetails?.name ?? j.tool ?? "Bridge",
    toolLogo: j.toolDetails?.logoURI ?? null,
    toAmount: est.toAmount ?? null,
    toAmountMin: est.toAmountMin ?? null,
    toAmountUSD: est.toAmountUSD ?? null,
    fromAmountUSD: est.fromAmountUSD ?? null,
    approvalAddress: est.approvalAddress ?? null,
    durationSec: est.executionDuration ?? null,
    feeUSD: sum(est.feeCosts),
    gasUSD: sum(est.gasCosts),
    transactionRequest: j.transactionRequest ?? null,
  });
}
