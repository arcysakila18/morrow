"use client";
import { useState } from "react";
import { formatUnits, isAddress } from "viem";
import { cn } from "@/lib/cn";
import { formatAmount, formatTokenAmount, formatUsd } from "@/lib/format";
import { IconChevronDown, IconGas, IconRefresh } from "@/components/ui/Icons";
import { Tooltip } from "@/components/ui/misc";
import type { ProviderStatus, Quote } from "@/lib/swap/types";
import type { Token } from "@/lib/tokens/types";

export function impactTone(bps?: number) {
  if (bps == null) return "text-muted";
  if (bps >= 500) return "text-down";
  if (bps >= 100) return "text-warn";
  return "text-ink";
}

export function rateText(quote: Quote, tIn: Token, tOut: Token, inverted: boolean) {
  const a = Number(formatUnits(quote.amountIn, tIn.decimals));
  const b = Number(formatUnits(quote.amountOut, tOut.decimals));
  if (!a || !b) return "—";
  return inverted ? `1 ${tOut.symbol} = ${formatAmount(a / b)} ${tIn.symbol}` : `1 ${tIn.symbol} = ${formatAmount(b / a)} ${tOut.symbol}`;
}

export function Row({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-[13px]">
      <span className="flex items-center gap-1.5 text-muted">
        {label}
        {tip && <Tooltip content={tip} />}
      </span>
      <span className="tabular text-right font-medium text-ink">{children}</span>
    </div>
  );
}

export function RouteView({ quote, symbolOf }: { quote: Quote; symbolOf: (s: string) => string }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {quote.route.slice(0, 4).map((h, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-0.5 text-xs">
          {symbolOf(h.tokenIn)} → {symbolOf(h.tokenOut)}
          <span className="text-faint">
            · {h.venue}
            {h.fee ? ` ${h.fee / 10_000}%` : ""}
            {h.share != null && h.share < 1 ? ` · ${Math.round(h.share * 100)}%` : ""}
          </span>
        </span>
      ))}
      {quote.route.length > 4 && <span className="text-xs text-faint">+{quote.route.length - 4} more</span>}
    </div>
  );
}

export function QuoteDetails({
  quote,
  tokenIn,
  tokenOut,
  networkFeeWei,
  ethPrice,
  statuses,
  quotesCount,
  fetching,
  symbolOf,
}: {
  quote: Quote;
  tokenIn: Token;
  tokenOut: Token;
  networkFeeWei?: bigint;
  ethPrice?: number;
  statuses: ProviderStatus[];
  quotesCount: number;
  fetching: boolean;
  symbolOf: (s: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [inv, setInv] = useState(false);
  const feeEth = networkFeeWei != null ? Number(formatUnits(networkFeeWei, 18)) : undefined;
  const feeUsd = feeEth != null && ethPrice != null ? feeEth * ethPrice : undefined;
  const checked = statuses.filter((s) => s.state !== "not-configured").length;

  return (
    <div className="mt-2 rounded-[20px] border border-line px-4">
      <button onClick={() => setOpen((o) => !o)} className="flex h-11 w-full items-center justify-between gap-2 text-[13px]">
        <span
          className="tabular truncate font-medium"
          onClick={(e) => {
            e.stopPropagation();
            setInv((v) => !v);
          }}
        >
          {rateText(quote, tokenIn, tokenOut, inv)}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-muted">
          {fetching && <IconRefresh width={14} height={14} className="animate-spin" />}
          {!open && (
            <span className="tabular flex items-center gap-1">
              <IconGas width={14} height={14} />
              {feeUsd != null ? formatUsd(feeUsd) : feeEth != null ? `${formatAmount(feeEth, 3)} ETH` : "—"}
            </span>
          )}
          <IconChevronDown width={16} height={16} className={cn("transition", open && "rotate-180")} />
        </span>
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-200", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="border-t border-line pb-3 pt-2">
            <Row label="Price impact" tip="Estimated difference between the market price and your execution price due to trade size.">
              <span className={impactTone(quote.priceImpactBps)}>{quote.priceImpactBps != null ? `${(quote.priceImpactBps / 100).toFixed(2)}%` : "—"}</span>
            </Row>
            <Row label="Minimum received" tip="The least you will receive after slippage. Otherwise the transaction reverts.">
              {formatTokenAmount(quote.minAmountOut, tokenOut.decimals)} {tokenOut.symbol}
            </Row>
            <Row label="Network fee" tip="Estimated gas cost, paid in ETH on Robinhood Chain.">
              {feeEth != null ? (
                <>
                  {formatAmount(feeEth, 3)} ETH {feeUsd != null && <span className="text-muted">({formatUsd(feeUsd)})</span>}
                </>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Routed via" tip={`Best of ${quotesCount} quote${quotesCount === 1 ? "" : "s"} from ${checked} source${checked === 1 ? "" : "s"}.`}>
              {quote.providerName}
            </Row>
            <div className="flex items-start justify-between gap-4 py-1.5 text-[13px]">
              <span className="text-muted">Route</span>
              <RouteView quote={quote} symbolOf={symbolOf} />
            </div>
            {!quote.firm && <p className="pt-1.5 text-xs text-faint">Indicative price. Connect a wallet to get an executable quote.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Resolves a route token (address or symbol) to a display symbol. */
export function makeSymbolOf(tokens: Token[]) {
  return (s: string) => {
    if (!isAddress(s)) return s;
    const t = tokens.find((x) => x.address.toLowerCase() === s.toLowerCase());
    return t?.symbol ?? `${s.slice(0, 6)}…`;
  };
}
