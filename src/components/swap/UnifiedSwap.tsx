"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { SwapCard } from "./SwapCard";
import { CrossChainCard } from "./CrossChainCard";
import { UniversalTokenModal } from "./UniversalTokenModal";
import { SolanaSwapCard } from "@/components/solana/SolanaSwapCard";
import { SOLANA_ID, isSupportedChain, type AppChainId, type SupportedChainId } from "@/config/chains";
import { solanaModeStore, useAppChain, viewChainStore } from "@/hooks/useAppChain";
import { findToken, useTokenList } from "@/hooks/useTokenList";
import { MAINNETS, defaultPair, nativeFor, sameAny } from "@/lib/tokens/universal";
import type { Token } from "@/lib/tokens/types";

type Pair = { in?: Token; out?: Token };

/** Default cross-network route for /bridge: native token here → ETH on Robinhood Chain (or Base). */
function crossPreset(chain: AppChainId): Pair {
  const src: AppChainId = MAINNETS.includes(chain) ? chain : 8453;
  const dst: AppChainId = src === 4663 ? 8453 : 4663;
  return { in: nativeFor(src), out: nativeFor(dst) };
}

/**
 * Swap and bridge in one card. Tokens are picked from every network:
 *  - both on the same EVM network → Morrow router (Uniswap v3, 0x, 1inch)
 *  - both on Solana → Jupiter
 *  - different networks → one cross-network swap via LI.FI
 * The wallet is never switched silently: the card asks first.
 */
export function UnifiedSwap({ preset }: { preset?: "cross" }) {
  const app = useAppChain();
  const { isConnected } = useAccount();
  const params = useSearchParams();
  const [pair, setPair] = useState<Pair>(() => (preset === "cross" ? crossPreset(app.marketChainId) : defaultPair(app.marketChainId)));
  const [amount, setAmount] = useState("");
  const [picker, setPicker] = useState<"in" | "out" | null>(null);

  // Follow the app network (header selector / wallet): reset when the pair has nothing on it.
  const last = useRef(app.marketChainId);
  useEffect(() => {
    if (last.current === app.marketChainId) return;
    last.current = app.marketChainId;
    setPair((p) => (p.in?.chainId === app.marketChainId || p.out?.chainId === app.marketChainId ? p : defaultPair(app.marketChainId)));
    setAmount("");
  }, [app.marketChainId]);

  // Deep links: ?chain=<id>&in=<address|symbol>&out=<address|symbol> (EVM registry).
  const deepChain = Number(params?.get("chain"));
  const linkChain = (isSupportedChain(deepChain) ? deepChain : app.chainId) as SupportedChainId;
  const { tokens } = useTokenList(linkChain);
  const linked = useRef(false);
  useEffect(() => {
    if (linked.current || !tokens.length || preset === "cross") return;
    const inA = params?.get("in");
    const outA = params?.get("out");
    if (isSupportedChain(deepChain) && !isConnected) {
      solanaModeStore.set(false);
      viewChainStore.set(deepChain);
    }
    if (!inA && !outA) return void (linked.current = true);
    linked.current = true;
    const d = defaultPair(linkChain);
    setPair({ in: findToken(tokens, inA) ?? d.in, out: findToken(tokens, outA) ?? d.out });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.length]);

  const choose = (side: "in" | "out") => (t: Token) => {
    setPair((p) => {
      const other = side === "in" ? p.out : p.in;
      const next: Pair = side === "in" ? { in: t, out: sameAny(t, other) ? p.in : other } : { out: t, in: sameAny(t, other) ? p.out : other };
      // A same-network pair on another network: show that network everywhere (browse state only).
      if (next.in && next.out && next.in.chainId === next.out.chainId && next.in.chainId !== app.marketChainId) {
        const c = next.in.chainId;
        last.current = c === SOLANA_ID || !isConnected ? c : app.marketChainId;
        if (c === SOLANA_ID) solanaModeStore.set(true);
        else {
          solanaModeStore.set(false);
          if (isSupportedChain(c)) viewChainStore.set(c);
        }
      }
      return next;
    });
    if (side === "in") setAmount("");
  };

  const flip = (nextAmount: string) => {
    setPair((p) => ({ in: p.out, out: p.in }));
    setAmount(nextAmount);
  };

  const common = { tokenIn: pair.in, tokenOut: pair.out, amount, setAmount, onPick: setPicker, onFlip: flip };
  const chainIn = pair.in?.chainId ?? pair.out?.chainId ?? app.marketChainId;
  const chainOut = pair.out?.chainId ?? chainIn;
  const cross = chainIn !== chainOut;

  return (
    <>
      {cross ? (
        <CrossChainCard {...common} />
      ) : chainIn === SOLANA_ID ? (
        <SolanaSwapCard {...common} />
      ) : (
        <SwapCard {...common} chainId={(isSupportedChain(chainIn) ? chainIn : app.chainId) as SupportedChainId} />
      )}
      <UniversalTokenModal open={picker === "in"} onClose={() => setPicker(null)} onSelect={choose("in")} selected={pair.in} title="You pay" />
      <UniversalTokenModal open={picker === "out"} onClose={() => setPicker(null)} onSelect={choose("out")} selected={pair.out} title="You receive" />
    </>
  );
}
