import { isAddress } from "viem";
import { serverEnv } from "@/config/server-env";
import { networkFromRequest } from "@/lib/market/dexpaprika";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // the browser's EventSource reconnects automatically after this

/**
 * Proxies DexPaprika's live price stream (Server-Sent Events) for one Robinhood Chain token.
 * Upstream: https://streaming.dexpaprika.com/sse/prices?chain=${network}&address=…&method=token_price
 */
export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address") ?? "";
  if (!isAddress(address)) return new Response("Invalid address", { status: 400 });
  const network = networkFromRequest(req);
  if (!network) return new Response("Unsupported network", { status: 404 });

  const upstream = await fetch(
    `https://streaming.dexpaprika.com/sse/prices?chain=${network}&address=${address.toLowerCase()}&method=token_price`,
    {
      headers: { accept: "text/event-stream", ...(serverEnv.dexPaprikaApiKey ? { Authorization: serverEnv.dexPaprikaApiKey } : {}) },
      signal: req.signal,
      cache: "no-store",
    },
  ).catch(() => null);

  if (!upstream?.ok || !upstream.body) return new Response("Stream unavailable", { status: 502 });
  return new Response(upstream.body, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" },
  });
}
