import { BaseError, UserRejectedRequestError } from "viem";

/** Turns wallet / RPC errors into a short, user-facing sentence. */
export function humanizeError(err: unknown): string {
  if (!err) return "Something went wrong.";
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) return "You rejected the request in your wallet.";
    const msg = err.shortMessage || err.message;
    if (/insufficient funds/i.test(msg)) return "Insufficient ETH to cover the network fee.";
    if (/execution reverted/i.test(msg)) return `Transaction would revert: ${msg.replace(/^.*execution reverted:?\s*/i, "") || "the pool rejected it"}.`;
    return msg;
  }
  const m = (err as { message?: string }).message ?? String(err);
  if (/user rejected|denied/i.test(m)) return "You rejected the request in your wallet.";
  return m.length > 180 ? m.slice(0, 180) + "…" : m;
}
