import { NextResponse } from "next/server";
import { ultraExecute } from "@/lib/solana/server";

export const dynamic = "force-dynamic";

/** Submits a wallet-signed Ultra transaction. The server never signs anything. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { signedTransaction?: unknown; requestId?: unknown };
  if (typeof body.signedTransaction !== "string" || typeof body.requestId !== "string" || body.signedTransaction.length > 20_000)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    return NextResponse.json(await ultraExecute({ signedTransaction: body.signedTransaction, requestId: body.requestId }));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
