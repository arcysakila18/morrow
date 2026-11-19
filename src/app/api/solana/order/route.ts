import { NextResponse } from "next/server";
import { ultraOrder } from "@/lib/solana/server";
import { isMint } from "@/lib/solana/constants";

export const dynamic = "force-dynamic";

/** Jupiter Ultra order proxy (keeps the optional API key on the server). */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const inputMint = sp.get("inputMint") ?? "";
  const outputMint = sp.get("outputMint") ?? "";
  const amount = sp.get("amount") ?? "";
  const taker = sp.get("taker") ?? undefined;
  if (!isMint(inputMint) || !isMint(outputMint) || inputMint === outputMint) return NextResponse.json({ error: "Invalid tokens" }, { status: 400 });
  if (!/^\d+$/.test(amount) || BigInt(amount) <= 0n) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  if (taker && !isMint(taker)) return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  try {
    return NextResponse.json(await ultraOrder({ inputMint, outputMint, amount, taker }));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
