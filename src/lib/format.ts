import { formatUnits, parseUnits } from "viem";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const usdSmall = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumSignificantDigits: 4 });

export function formatUsd(value: number | null | undefined, opts: { compact?: boolean } = {}) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (opts.compact && Math.abs(value) >= 10_000) return "$" + compact.format(value);
  if (value !== 0 && Math.abs(value) < 1) return usdSmall.format(value);
  return usd.format(value);
}

export function formatPct(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

/** Human amount from a decimal string, trimmed for display. */
export function formatAmount(value: string | number, maxSig = 6) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "0";
  if (n === 0) return "0";
  if (Math.abs(n) < 1e-6) return "<0.000001";
  if (Math.abs(n) >= 1e9) return compact.format(n);
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: Math.abs(n) >= 1 ? Math.max(maxSig, Math.ceil(Math.log10(Math.abs(n) + 1))) : maxSig,
  }).format(n);
}

export function formatTokenAmount(raw: bigint, decimals: number, maxSig = 6) {
  return formatAmount(formatUnits(raw, decimals), maxSig);
}

/** Safe parse of user input into base units. Returns null for invalid or zero input. */
export function safeParseUnits(input: string, decimals: number): bigint | null {
  const v = input.trim();
  if (!v || !/^\d*\.?\d*$/.test(v) || v === ".") return null;
  const [int, frac = ""] = v.split(".");
  const clipped = frac.length > decimals ? `${int || "0"}.${frac.slice(0, decimals)}` : v;
  try {
    const parsed = parseUnits(clipped, decimals);
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

export function shortAddress(addr?: string, chars = 4) {
  if (!addr) return "";
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}

export function timeAgo(ts: number | string) {
  const t = typeof ts === "string" ? Date.parse(ts) : ts;
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function applySlippage(amount: bigint, slippageBps: number) {
  return (amount * BigInt(10_000 - slippageBps)) / 10_000n;
}
