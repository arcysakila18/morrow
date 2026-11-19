import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** LI.FI transfer status: PENDING → DONE | FAILED, with the receiving transaction once it lands. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const txHash = sp.get("txHash") ?? "";
  if (!/^[0-9a-zA-Z]{20,120}$/.test(txHash.replace(/^0x/, ""))) return NextResponse.json({ error: "Invalid hash" }, { status: 400 });
  const q = new URLSearchParams({ txHash });
  for (const k of ["fromChain", "toChain", "bridge"]) if (sp.get(k)) q.set(k, sp.get(k)!);
  const r = await fetch(`https://li.quest/v1/status?${q}`, {
    headers: process.env.LIFI_API_KEY ? { "x-lifi-api-key": process.env.LIFI_API_KEY } : {},
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!r) return NextResponse.json({ status: "PENDING" });
  const j = await r.json().catch(() => ({}));
  return NextResponse.json({
    status: j.status ?? "PENDING",
    substatus: j.substatusMessage ?? j.substatus ?? null,
    receivingTx: j.receiving?.txHash ?? null,
    receivingLink: j.receiving?.txLink ?? null,
    lifiExplorer: j.lifiExplorerLink ?? null,
  });
}
