import { encodeFunctionData, encodePacked, getAddress, zeroAddress, type Address, type PublicClient } from "viem";
import { quoterV2Abi, swapRouter02Abi, v3FactoryAbi } from "@/lib/abis";
import { CONTRACTS, NATIVE_ADDRESS, ROUTER_ADDRESS_THIS, UNISWAP_V3_FEE_TIERS } from "@/config/contracts";
import type { SupportedChainId } from "@/config/chains";
import { applySlippage } from "@/lib/format";
import type { Quote, QuoteRequest, RouteHop } from "../types";

type Path = { tokens: Address[]; fees: number[] };

const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const DEADLINE_SECONDS = 20 * 60;
const HOP_FEES = [500, 3000, 10000] as const;

function encodePath(p: Path): `0x${string}` {
  const types: ("address" | "uint24")[] = [];
  const values: (Address | number)[] = [];
  p.tokens.forEach((t, i) => {
    types.push("address");
    values.push(t);
    if (i < p.fees.length) {
      types.push("uint24");
      values.push(p.fees[i]);
    }
  });
  return encodePacked(types as never, values as never);
}

/**
 * Uniswap v3 on-chain quoting and execution on Robinhood Chain.
 * Needs no API key: pool discovery via the factory, pricing via QuoterV2 (eth_call),
 * execution via SwapRouter02 multicall with a deadline and amountOutMinimum.
 */
export async function uniswapV3Quote(client: PublicClient, req: QuoteRequest, symbols: (a: Address) => string): Promise<Quote | null> {
  const c = CONTRACTS[req.chainId as SupportedChainId];
  const uni = c?.uniswapV3;
  if (!uni || !c.weth) return null;

  const weth = getAddress(c.weth);
  const inNative = eq(req.tokenIn, NATIVE_ADDRESS);
  const outNative = eq(req.tokenOut, NATIVE_ADDRESS);
  const tIn = inNative ? weth : getAddress(req.tokenIn);
  const tOut = outNative ? weth : getAddress(req.tokenOut);
  if (eq(tIn, tOut)) return null;

  // 1. Discover which pools exist.
  const mids = [c.weth, c.usdg].filter((m): m is Address => !!m && !eq(m, tIn) && !eq(m, tOut)).map((m) => getAddress(m));
  const pairs: Array<[Address, Address, number]> = [];
  for (const f of UNISWAP_V3_FEE_TIERS) pairs.push([tIn, tOut, f]);
  for (const m of mids) for (const f of HOP_FEES) pairs.push([tIn, m, f], [m, tOut, f]);

  const pools = await Promise.all(
    pairs.map(([a, b, fee]) =>
      client
        .readContract({ address: uni.factory, abi: v3FactoryAbi, functionName: "getPool", args: [a, b, fee] })
        .then((p) => (p && p !== zeroAddress ? p : null))
        .catch(() => null),
    ),
  );
  const exists = (a: Address, b: Address, fee: number) => {
    const i = pairs.findIndex(([x, y, f]) => eq(x, a) && eq(y, b) && f === fee);
    return i >= 0 && !!pools[i];
  };

  const paths: Path[] = [];
  for (const f of UNISWAP_V3_FEE_TIERS) if (exists(tIn, tOut, f)) paths.push({ tokens: [tIn, tOut], fees: [f] });
  for (const m of mids)
    for (const f1 of HOP_FEES)
      for (const f2 of HOP_FEES) if (exists(tIn, m, f1) && exists(m, tOut, f2)) paths.push({ tokens: [tIn, m, tOut], fees: [f1, f2] });
  if (!paths.length) return null;

  // 2. Quote every candidate path.
  const quote = (p: Path, amountIn: bigint) =>
    client
      .simulateContract({ address: uni.quoterV2, abi: quoterV2Abi, functionName: "quoteExactInput", args: [encodePath(p), amountIn] })
      .then((r) => ({ amountOut: r.result[0], gas: r.result[3] }))
      .catch(() => null);

  const results = await Promise.all(paths.map((p) => quote(p, req.amountIn)));
  let best = -1;
  results.forEach((r, i) => {
    if (r && r.amountOut > 0n && (best < 0 || r.amountOut > results[best]!.amountOut)) best = i;
  });
  if (best < 0) return null;
  const path = paths[best];
  const { amountOut, gas } = results[best]!;

  // 3. Price impact: compare the execution rate with a tiny reference trade on the same path.
  let priceImpactBps: number | undefined;
  const ref = req.amountIn / 10_000n;
  if (ref > 0n) {
    const r = await quote(path, ref);
    if (r && r.amountOut > 0n) {
      const spot = Number(r.amountOut) / Number(ref);
      const exec = Number(amountOut) / Number(req.amountIn);
      priceImpactBps = Math.max(0, Math.round((1 - exec / spot) * 10_000));
    }
  }

  const minAmountOut = applySlippage(amountOut, req.slippageBps);
  const route: RouteHop[] = path.fees.map((fee, i) => ({
    tokenIn: symbols(path.tokens[i]),
    tokenOut: symbols(path.tokens[i + 1]),
    venue: "Uniswap v3",
    fee,
    share: 1,
  }));

  // 4. Build the router call (only when we know the recipient).
  let tx: Quote["tx"];
  if (req.taker) {
    const recipient = outNative ? ROUTER_ADDRESS_THIS : req.taker;
    const swapCall =
      path.fees.length === 1
        ? encodeFunctionData({
            abi: swapRouter02Abi,
            functionName: "exactInputSingle",
            args: [{ tokenIn: tIn, tokenOut: tOut, fee: path.fees[0], recipient, amountIn: req.amountIn, amountOutMinimum: minAmountOut, sqrtPriceLimitX96: 0n }],
          })
        : encodeFunctionData({
            abi: swapRouter02Abi,
            functionName: "exactInput",
            args: [{ path: encodePath(path), recipient, amountIn: req.amountIn, amountOutMinimum: minAmountOut }],
          });
    const calls = [swapCall];
    if (outNative) calls.push(encodeFunctionData({ abi: swapRouter02Abi, functionName: "unwrapWETH9", args: [minAmountOut, req.taker] }));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_SECONDS);
    tx = {
      to: getAddress(uni.swapRouter02),
      data: encodeFunctionData({ abi: swapRouter02Abi, functionName: "multicall", args: [deadline, calls] }),
      value: inNative ? req.amountIn : 0n,
    };
  }

  return {
    provider: "uniswap-v3",
    providerName: "Uniswap v3",
    chainId: req.chainId,
    tokenIn: req.tokenIn,
    tokenOut: req.tokenOut,
    amountIn: req.amountIn,
    amountOut,
    minAmountOut,
    route,
    gasEstimate: gas,
    priceImpactBps,
    spender: inNative ? undefined : getAddress(uni.swapRouter02),
    tx,
    firm: !!tx,
    fetchedAt: Date.now(),
  };
}
