"use client";
import { formatUnits } from "viem";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { Spinner } from "@/components/ui/Spinner";
import { IconAlert, IconArrowDown, IconCheck, IconExternal } from "@/components/ui/Icons";
import { Notice } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { explorerUrl } from "@/config/chains";
import { formatAmount, formatTokenAmount, formatUsd } from "@/lib/format";
import type { Quote } from "@/lib/swap/types";
import type { Token } from "@/lib/tokens/types";
import type { ExecStep } from "@/hooks/useSwapExecution";
import { Row, RouteView, impactTone, rateText } from "./QuoteDetails";

function Amount({ label, raw, token, usd }: { label: string; raw: bigint; token: Token; usd?: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[13px] text-muted">{label}</div>
        <div className="tabular mt-0.5 truncate text-[28px] font-medium leading-tight tracking-tight">{formatTokenAmount(raw, token.decimals, 8)}</div>
        <div className="tabular text-[13px] text-muted">{usd != null ? formatUsd(usd) : " "}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-[15px] font-semibold">
        <TokenIcon symbol={token.symbol} address={token.address} src={token.logoURI} stock={token.source === "stock"} size={36} />
        {token.symbol}
      </div>
    </div>
  );
}

type StepState = "todo" | "active" | "done" | "error";

function StepRow({ n, label, sub, state }: { n: number; label: string; sub?: string; state: StepState }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
          state === "done" ? "bg-ink text-lime" : state === "active" ? "bg-lime text-ink" : state === "error" ? "bg-down/10 text-down" : "bg-surface-2 text-faint",
        )}
      >
        {state === "done" ? <IconCheck width={16} height={16} /> : state === "active" ? <Spinner className="h-4 w-4" /> : state === "error" ? "!" : n}
      </span>
      <div>
        <div className={cn("text-sm font-medium", state === "todo" && "text-faint")}>{label}</div>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
    </div>
  );
}

export function ReviewModal({
  open,
  onClose,
  quote,
  tokenIn,
  tokenOut,
  usdIn,
  usdOut,
  networkFee,
  step,
  onConfirm,
  onReset,
  symbolOf,
  chainId,
}: {
  open: boolean;
  onClose: () => void;
  quote: Quote;
  tokenIn: Token;
  tokenOut: Token;
  usdIn?: number;
  usdOut?: number;
  networkFee?: string;
  step: ExecStep;
  onConfirm: () => void;
  onReset: () => void;
  symbolOf: (s: string) => string;
  chainId: number;
}) {
  const busy = !["idle", "success", "error"].includes(step.kind);
  const needsApproval = !!quote.spender;
  const verb = quote.provider === "wrap" ? quote.providerName : "Swap";

  const approveState: StepState = ["approve-sign", "approve-pending"].includes(step.kind) ? "active" : step.kind === "idle" ? "todo" : step.kind === "error" && !step.hash ? "todo" : "done";
  const swapState: StepState =
    step.kind === "success" ? "done" : step.kind === "error" ? "error" : ["requote", "simulate", "swap-sign", "swap-pending"].includes(step.kind) ? "active" : "todo";
  const swapSub =
    step.kind === "requote" ? "Refreshing quote…" : step.kind === "simulate" ? "Simulating transaction…" : step.kind === "swap-sign" ? "Confirm in your wallet" : step.kind === "swap-pending" ? "Waiting for confirmation…" : undefined;
  const approveSub = step.kind === "approve-sign" ? `Allow ${tokenIn.symbol} to be used — confirm in wallet` : step.kind === "approve-pending" ? "Waiting for confirmation…" : undefined;
  const hash = "hash" in step ? step.hash : undefined;

  const close = () => {
    if (busy) return; // keep the user on the progress screen while a signature or tx is outstanding
    onReset();
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title={step.kind === "success" ? "" : step.kind === "idle" ? `Review ${verb.toLowerCase()}` : `${verb} in progress`}>
      {step.kind === "success" ? (
        <div className="flex flex-col items-center px-6 pb-6 pt-2 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-lime">
            <IconCheck width={26} height={26} />
          </span>
          <h3 className="mt-4 text-lg font-semibold">{verb} confirmed</h3>
          <p className="tabular mt-1 text-sm text-muted">
            {formatTokenAmount(quote.amountIn, tokenIn.decimals)} {tokenIn.symbol} → {formatTokenAmount(step.amountOut, tokenOut.decimals)} {tokenOut.symbol}
          </p>
          <p className="mt-1 text-xs text-faint">Quoted output; the exact amount received is shown on the explorer.</p>
          <a href={explorerUrl(chainId, "tx", step.hash)} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
            View on explorer <IconExternal width={14} height={14} />
          </a>
          <Button variant="ink" size="lg" block className="mt-6" onClick={close}>
            Done
          </Button>
        </div>
      ) : (
        <div className="px-5 pb-5">
          <div className="rounded-[20px] bg-surface-2 p-4">
            <Amount label="You pay" raw={quote.amountIn} token={tokenIn} usd={usdIn} />
            <div className="my-2 flex justify-center text-faint">
              <IconArrowDown width={18} height={18} />
            </div>
            <Amount label="You receive (estimated)" raw={quote.amountOut} token={tokenOut} usd={usdOut} />
          </div>

          {step.kind === "idle" ? (
            <>
              <div className="mt-3 px-1">
                <Row label="Rate">{rateText(quote, tokenIn, tokenOut, false)}</Row>
                <Row label="Price impact">
                  <span className={impactTone(quote.priceImpactBps)}>{quote.priceImpactBps != null ? `${(quote.priceImpactBps / 100).toFixed(2)}%` : "—"}</span>
                </Row>
                <Row label="Minimum received">
                  {formatTokenAmount(quote.minAmountOut, tokenOut.decimals)} {tokenOut.symbol}
                </Row>
                <Row label="Network fee">{networkFee ?? "—"}</Row>
                <Row label="Routed via">{quote.providerName}</Row>
                <div className="flex items-start justify-between gap-4 py-1.5 text-[13px]">
                  <span className="text-muted">Route</span>
                  <RouteView quote={quote} symbolOf={symbolOf} />
                </div>
              </div>
              {(quote.priceImpactBps ?? 0) >= 500 && (
                <Notice tone="error" className="mt-3 flex gap-2">
                  <IconAlert width={16} height={16} className="mt-0.5 shrink-0" />
                  High price impact. You may receive significantly less than the market value of your tokens.
                </Notice>
              )}
              {tokenOut.source === "stock" || tokenIn.source === "stock" ? (
                <p className="mt-3 px-1 text-xs leading-relaxed text-faint">
                  Stock Tokens are issued under their issuer&apos;s terms, may be restricted in some jurisdictions, and can be halted. You are responsible for your eligibility.
                </p>
              ) : null}
              <Button variant="primary" size="xl" block className="mt-4" onClick={onConfirm}>
                {needsApproval ? `Approve & ${verb.toLowerCase()}` : `Confirm ${verb.toLowerCase()}`}
              </Button>
              <p className="mt-2.5 text-center text-[11px] text-faint">
                Output is estimated. You will receive at least {formatAmount(formatUnits(quote.minAmountOut, tokenOut.decimals))} {tokenOut.symbol} or the transaction will revert.
              </p>
            </>
          ) : (
            <>
              <div className="mt-3 px-1">
                {needsApproval && <StepRow n={1} label={`Approve ${tokenIn.symbol}`} sub={approveSub} state={approveState} />}
                <StepRow n={needsApproval ? 2 : 1} label={`${verb} ${tokenIn.symbol} for ${tokenOut.symbol}`} sub={swapSub} state={swapState} />
              </div>
              {step.kind === "error" && (
                <Notice tone="error" className="mt-2">
                  {step.message}
                </Notice>
              )}
              {hash && (
                <a href={explorerUrl(chainId, "tx", hash)} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
                  View transaction <IconExternal width={13} height={13} />
                </a>
              )}
              {step.kind === "error" && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="soft" size="lg" onClick={close}>
                    Close
                  </Button>
                  <Button variant="ink" size="lg" onClick={onReset}>
                    Review again
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
