import { encodeFunctionData, type Address } from "viem";
import { wethAbi } from "@/lib/abis";
import { CONTRACTS, NATIVE_ADDRESS } from "@/config/contracts";
import { getChain, type SupportedChainId } from "@/config/chains";
import type { Quote, QuoteRequest } from "../types";

const eq = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** Native ⇄ wrapped native (ETH/WETH, BNB/WBNB) via the canonical wrapper. Always 1:1. */
export function wrapQuote(req: QuoteRequest): Quote | null {
  const weth = CONTRACTS[req.chainId as SupportedChainId]?.wrappedNative;
  if (!weth) return null;
  const sym = getChain(req.chainId).nativeCurrency.symbol;
  const wsym = `W${sym}`;
  const wrapping = eq(req.tokenIn, NATIVE_ADDRESS) && eq(req.tokenOut, weth);
  const unwrapping = eq(req.tokenIn, weth) && eq(req.tokenOut, NATIVE_ADDRESS);
  if (!wrapping && !unwrapping) return null;
  return {
    provider: "wrap",
    providerName: wrapping ? "Wrap" : "Unwrap",
    chainId: req.chainId,
    tokenIn: req.tokenIn,
    tokenOut: req.tokenOut,
    amountIn: req.amountIn,
    amountOut: req.amountIn,
    minAmountOut: req.amountIn,
    route: [{ tokenIn: wrapping ? sym : wsym, tokenOut: wrapping ? wsym : sym, venue: `${wsym} contract`, share: 1 }],
    firm: true,
    fetchedAt: Date.now(),
    tx: {
      to: weth as Address,
      data: wrapping
        ? encodeFunctionData({ abi: wethAbi, functionName: "deposit" })
        : encodeFunctionData({ abi: wethAbi, functionName: "withdraw", args: [req.amountIn] }),
      value: wrapping ? req.amountIn : 0n,
    },
  };
}

export function isWrapPair(chainId: number, a: string, b: string) {
  const weth = CONTRACTS[chainId as SupportedChainId]?.wrappedNative;
  return !!weth && ((eq(a, NATIVE_ADDRESS) && eq(b, weth)) || (eq(a, weth) && eq(b, NATIVE_ADDRESS)));
}
