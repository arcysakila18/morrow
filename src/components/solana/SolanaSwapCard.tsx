"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { VersionedTransaction } from "@solana/web3.js";
import { formatUnits } from "viem";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/misc";
import { IconArrowDown, IconCheck, IconExternal } from "@/components/ui/Icons";
import { Spinner } from "@/components/ui/Spinner";
import { TokenField } from "@/components/swap/TokenField";
import { Row } from "@/components/swap/QuoteDetails";
import { openWalletModal } from "@/components/wallet/WalletModal";
import { explorerUrl, SOLANA_ID } from "@/config/chains";
import { formatAmount, formatTokenAmount, formatUsd, safeParseUnits } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { b64ToBytes, bytesToB64 } from "@/lib/solana/codec";
import { SOL_DEFAULTS, SOL_MINT, type SolToken } from "@/lib/solana/constants";
import type { Token } from "@/lib/tokens/types";
import { useDebounced } from "@/hooks/useQuote";
import { useSolanaPortfolio } from "@/hooks/useSolana";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { tokenToSol } from "@/lib/tokens/universal";
import type { PairProps } from "@/components/swap/SwapCard";

type Order = {
  inAmount?: string;
  outAmount?: string;
  otherAmountThreshold?: string;
  priceImpactPct?: string | number;
  slippageBps?: number;
  feeBps?: number;
  routePlan?: Array<{ swapInfo?: { label?: string }; percent?: number }>;
  transaction?: string | null;
  requestId?: string;
  errorMessage?: string;
  error?: string;
};

type Exec =
  | { kind: "idle" }
  | { kind: "sign" }
  | { kind: "submit" }
  | { kind: "success"; signature: string }
  | { kind: "error"; message: string; signature?: string };

const SOL_GAS_RESERVE = 10_000_000n; // 0.01 SOL kept for fees / rent when pressing MAX

/** TokenField speaks the EVM Token shape; adapt a Solana token to it for display only. */
const asField = (t: SolToken): Token => ({ chainId: SOLANA_ID, address: t.mint as never, symbol: t.symbol, name: t.name, decimals: t.decimals, logoURI: t.logoURI, source: t.verified ? "list" : "custom" });

/**
 * Solana swaps via Jupiter Ultra: Jupiter quotes and builds the transaction, the user's wallet
 * signs it (Morrow never holds keys), and Jupiter lands it. Success only after Jupiter reports it.
 */
export function SolanaSwapCard({ tokenIn: propIn, tokenOut: propOut, amount, setAmount, onPick, onFlip }: PairProps) {
  const { wallet, address } = useSolanaWallet();
  const portfolio = useSolanaPortfolio(address);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const tokenIn: SolToken = propIn ? tokenToSol(propIn) : SOL_DEFAULTS[0];
  const tokenOut: SolToken = propOut ? tokenToSol(propOut) : SOL_DEFAULTS[1];
  const [review, setReview] = useState(false);
  const [exec, setExec] = useState<Exec>({ kind: "idle" });


  const holding = (t: SolToken) => portfolio.data?.find((h) => h.mint === t.mint);
  const balIn = holding(tokenIn) ? BigInt(holding(tokenIn)!.raw) : address && portfolio.data ? 0n : undefined;
  const balOut = holding(tokenOut) ? BigInt(holding(tokenOut)!.raw) : address && portfolio.data ? 0n : undefined;
  const raw = safeParseUnits(amount, tokenIn.decimals);
  const debounced = useDebounced(raw);

  const prices = useQuery({
    queryKey: ["sol-px", tokenIn.mint, tokenOut.mint],
    refetchInterval: 15_000,
    queryFn: async () => ((await (await fetch(`/api/solana/prices?ids=${tokenIn.mint},${tokenOut.mint}`)).json()).prices ?? {}) as Record<string, number>,
  });

  const order = useQuery({
    queryKey: ["sol-order", tokenIn.mint, tokenOut.mint, debounced?.toString(), address],
    enabled: !!debounced && tokenIn.mint !== tokenOut.mint && exec.kind === "idle",
    refetchInterval: 15_000,
    retry: 1,
    queryFn: async () => {
      const q = new URLSearchParams({ inputMint: tokenIn.mint, outputMint: tokenOut.mint, amount: debounced!.toString() });
      if (address) q.set("taker", address);
      const r = await fetch(`/api/solana/order?${q}`);
      const j = (await r.json()) as Order;
      if (!r.ok) throw new Error(j.error || "Quote unavailable");
      return j;
    },
  });

  const o = raw && debounced === raw ? order.data : undefined;
  const outRaw = o?.outAmount ? BigInt(o.outAmount) : undefined;
  const minRaw = o?.otherAmountThreshold ? BigInt(o.otherAmountThreshold) : undefined;
  const impactPct = o?.priceImpactPct != null && Number.isFinite(Number(o.priceImpactPct)) ? Math.abs(Number(o.priceImpactPct)) * 100 : undefined;
  const pIn = prices.data?.[tokenIn.mint];
  const pOut = prices.data?.[tokenOut.mint];
  const usdIn = raw && pIn != null ? Number(formatUnits(raw, tokenIn.decimals)) * pIn : undefined;
  const usdOut = outRaw != null && pOut != null ? Number(formatUnits(outRaw, tokenOut.decimals)) * pOut : undefined;
  const insufficient = raw != null && balIn != null && raw > balIn;
  const route = useMemo(() => (o?.routePlan ?? []).map((r) => r.swapInfo?.label).filter(Boolean).join(" → "), [o]);

  const flip = () => {
    onFlip(outRaw != null ? formatUnits(outRaw, tokenOut.decimals) : amount);
  };

  const onMax = () => {
    if (balIn == null) return;
    const v = tokenIn.mint === SOL_MINT ? (balIn > SOL_GAS_RESERVE ? balIn - SOL_GAS_RESERVE : 0n) : balIn;
    setAmount(formatUnits(v, tokenIn.decimals));
  };

  const confirm = async () => {
    if (!wallet || !o?.transaction || !o.requestId) return;
    try {
      setExec({ kind: "sign" });
      const tx = VersionedTransaction.deserialize(b64ToBytes(o.transaction));
      const signed = (await wallet.signTransaction(tx)) as VersionedTransaction;
      setExec({ kind: "submit" });
      const r = await fetch("/api/solana/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signedTransaction: bytesToB64(signed.serialize()), requestId: o.requestId }),
      });
      const j = (await r.json()) as { status?: string; signature?: string; error?: string };
      if (j.status === "Success" && j.signature) {
        setExec({ kind: "success", signature: j.signature });
        setAmount("");
        portfolio.refetch();
      } else setExec({ kind: "error", message: j.error || "The swap failed on-chain. No tokens were exchanged.", signature: j.signature });
    } catch (e) {
      setExec({ kind: "error", message: humanizeError(e) });
    }
  };

  let cta: { label: string; onClick?: () => void; disabled?: boolean; loading?: boolean } = { label: "Swap" };
  if (!mounted || !address) cta = { label: "Connect Solana wallet", onClick: () => openWalletModal("solana") };
  else if (!raw) cta = { label: "Enter an amount", disabled: true };
  else if (insufficient) cta = { label: `Insufficient ${tokenIn.symbol} balance`, disabled: true };
  else if (order.isFetching && !o) cta = { label: "Finding the best price", loading: true, disabled: true };
  else if (order.isError) cta = { label: "Quote failed — retry", onClick: () => order.refetch() };
  else if (!o?.outAmount) cta = { label: "No route for this pair", disabled: true };
  else if (!o.transaction) cta = { label: o.errorMessage || "Can't build this swap", disabled: true };
  else cta = { label: (impactPct ?? 0) >= 5 ? "Swap anyway" : "Swap", onClick: () => { setExec({ kind: "idle" }); setReview(true); } };

  const busy = exec.kind === "sign" || exec.kind === "submit";

  return (
    <div className="w-full max-w-[468px]">
      <div className="card p-2 sm:p-2.5">
        <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-surface-2 px-3.5 py-1.5 text-sm font-semibold">Swap</span>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Solana · Jupiter</span>
          </div>
        </div>
        <div className="relative space-y-1">
          <TokenField label="You pay" token={propIn ?? asField(tokenIn)} value={amount} onChange={setAmount} onSelectToken={() => onPick("in")} balance={mounted && address ? balIn : undefined} usdValue={usdIn} onMax={onMax} />
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <button onClick={flip} aria-label="Switch tokens" className="group flex h-11 w-11 items-center justify-center rounded-[14px] border-4 border-surface bg-surface-2 text-ink transition hover:bg-surface-3">
              <IconArrowDown width={18} height={18} className="transition duration-200 group-hover:rotate-180" />
            </button>
          </div>
          <TokenField
            label="You receive"
            token={propOut ?? asField(tokenOut)}
            value={outRaw != null ? formatAmount(formatUnits(outRaw, tokenOut.decimals), 8).replace(/,/g, "") : ""}
            readOnly
            onSelectToken={() => onPick("out")}
            balance={mounted && address ? balOut : undefined}
            usdValue={usdOut}
            loading={!!raw && order.isFetching && !o}
          />
        </div>

        {o?.outAmount && (
          <div className="mt-2 rounded-[20px] border border-line px-4 py-2">
            <Row label="Rate">
              1 {tokenIn.symbol} = {raw ? formatAmount(Number(formatUnits(outRaw!, tokenOut.decimals)) / Number(formatUnits(raw, tokenIn.decimals))) : "—"} {tokenOut.symbol}
            </Row>
            <Row label="Price impact">{impactPct != null ? `${impactPct.toFixed(2)}%` : "—"}</Row>
            {minRaw != null && <Row label="Minimum received" tip="Jupiter Ultra sets slippage automatically for each trade.">{formatTokenAmount(minRaw, tokenOut.decimals)} {tokenOut.symbol}</Row>}
            {o.slippageBps != null && <Row label="Slippage">{(o.slippageBps / 100).toFixed(2)}% (auto)</Row>}
            {o.feeBps != null && <Row label="Jupiter fee">{(o.feeBps / 100).toFixed(2)}%</Row>}
            {route && <Row label="Route">{route}</Row>}
          </div>
        )}

        <Button size="xl" block className="mt-2" variant={(impactPct ?? 0) >= 5 ? "danger" : "primary"} disabled={cta.disabled} loading={cta.loading} onClick={cta.onClick}>
          {cta.label}
        </Button>
      </div>
      {portfolio.isError && address && <Notice tone="warn" className="mt-3">Solana balances couldn&apos;t be loaded. Quotes still work; your wallet checks balances when signing.</Notice>}


      <Modal open={review} onClose={() => !busy && setReview(false)} title={exec.kind === "success" ? "" : "Review swap"}>
        <div className="px-5 pb-5">
          {exec.kind === "success" ? (
            <div className="flex flex-col items-center pt-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lime text-on-lime"><IconCheck width={26} height={26} /></span>
              <h3 className="mt-4 text-lg font-semibold">Swap confirmed</h3>
              <a href={explorerUrl(SOLANA_ID, "tx", exec.signature)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
                View on Solscan <IconExternal width={14} height={14} />
              </a>
              <Button variant="ink" size="lg" block className="mt-6" onClick={() => setReview(false)}>Done</Button>
            </div>
          ) : (
            <>
              <div className="tabular rounded-[20px] bg-surface-2 p-4 text-sm">
                <div className="text-muted">You pay</div>
                <div className="mt-0.5 text-2xl font-medium">{amount} {tokenIn.symbol}</div>
                <div className="mt-3 text-muted">You receive (estimated)</div>
                <div className="mt-0.5 text-2xl font-medium">{outRaw != null ? formatTokenAmount(outRaw, tokenOut.decimals, 8) : "—"} {tokenOut.symbol}</div>
                {usdOut != null && <div className="text-muted">{formatUsd(usdOut)}</div>}
              </div>
              {(impactPct ?? 0) >= 5 && <Notice tone="error" className="mt-3">High price impact. You may receive much less than the market value.</Notice>}
              {exec.kind === "error" && <Notice tone="error" className="mt-3">{exec.message}</Notice>}
              <Button variant="primary" size="xl" block className="mt-4" disabled={busy} onClick={confirm}>
                {busy ? (
                  <span className="flex items-center gap-2"><Spinner className="h-4 w-4" />{exec.kind === "sign" ? "Confirm in your wallet" : "Submitting to Solana"}</span>
                ) : exec.kind === "error" ? "Try again" : "Confirm swap"}
              </Button>
              <p className="mt-2.5 text-center text-[11px] text-faint">Routed and landed by Jupiter Ultra. Your wallet signs; Morrow never holds your keys.</p>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
