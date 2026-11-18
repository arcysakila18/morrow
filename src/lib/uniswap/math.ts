/**
 * Uniswap v3 liquidity math (floating point, for UI estimates only).
 * On-chain amounts are always bounded by min-amount parameters derived from slippage.
 */
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;
const Q96 = 2 ** 96;

export const sqrtPriceX96ToFloat = (x: bigint) => Number(x) / Q96;
export const sqrtAtTick = (tick: number) => Math.sqrt(1.0001 ** tick);

export function nearestUsableTick(tick: number, spacing: number) {
  const r = Math.round(tick / spacing) * spacing;
  const min = Math.ceil(MIN_TICK / spacing) * spacing;
  const max = Math.floor(MAX_TICK / spacing) * spacing;
  return Math.min(max, Math.max(min, r));
}

/** Price (token1 per token0, raw units) → tick. */
export const priceToTick = (rawPrice: number) => Math.floor(Math.log(rawPrice) / Math.log(1.0001));

/** Human price of token0 in token1. */
export function tickToPrice(tick: number, dec0: number, dec1: number) {
  return 1.0001 ** tick * 10 ** (dec0 - dec1);
}

export function rangeForPreset(currentTick: number, spacing: number, preset: "full" | "wide" | "narrow") {
  if (preset === "full") return { lower: nearestUsableTick(MIN_TICK, spacing), upper: nearestUsableTick(MAX_TICK, spacing) };
  const pct = preset === "wide" ? 0.5 : 0.1;
  const dLow = Math.log(1 - pct) / Math.log(1.0001);
  const dUp = Math.log(1 + pct) / Math.log(1.0001);
  let lower = nearestUsableTick(currentTick + dLow, spacing);
  let upper = nearestUsableTick(currentTick + dUp, spacing);
  if (upper <= lower) upper = lower + spacing;
  return { lower, upper };
}

/** Given an amount of one side, the raw amount of the other side for the range. */
export function pairedAmount(side: 0 | 1, rawAmount: number, sqrtP: number, tickLower: number, tickUpper: number) {
  const sa = sqrtAtTick(tickLower);
  const sb = sqrtAtTick(tickUpper);
  if (sqrtP <= sa) return side === 0 ? 0 : NaN; // only token0 accepted
  if (sqrtP >= sb) return side === 1 ? 0 : NaN; // only token1 accepted
  if (side === 0) {
    const L = (rawAmount * sqrtP * sb) / (sb - sqrtP);
    return L * (sqrtP - sa);
  }
  const L = rawAmount / (sqrtP - sa);
  return (L * (sb - sqrtP)) / (sqrtP * sb);
}

/** Token amounts represented by `liquidity` at the current price. */
export function amountsForLiquidity(liquidity: bigint, sqrtP: number, tickLower: number, tickUpper: number) {
  const L = Number(liquidity);
  const sa = sqrtAtTick(tickLower);
  const sb = sqrtAtTick(tickUpper);
  const p = Math.min(Math.max(sqrtP, sa), sb);
  return { amount0: (L * (sb - p)) / (p * sb), amount1: L * (p - sa) };
}

export const toRaw = (n: number) => (Number.isFinite(n) && n > 0 ? BigInt(Math.floor(n)) : 0n);
