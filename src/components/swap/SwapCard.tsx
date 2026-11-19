"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, useGasPrice, usePublicClient, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/Button";
import { IconArrowDown } from "@/components/ui/Icons";
import { Notice } from "@/components/ui/misc";
import { LiveBadge } from "@/components/ui/Live";
import { openWalletModal } from "@/components/wallet/WalletModal";
import { CONTRACTS } from "@/config/contracts";
import { getChain, type SupportedChainId } from "@/config/chains";
import { formatAmount, formatUsd, safeParseUnits } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { isNative } from "@/lib/tokens/core";
import type { Token } from "@/lib/tokens/types";
import type { Quote } from "@/lib/swap/types";
import { useTokenList } from "@/hooks/useTokenList";
import { useBalances } from "@/hooks/useBalances";
import { usePrices } from "@/hooks/usePrices";
import { fetchQuotes, useQuote } from "@/hooks/useQuote";
import { useSwapExecution } from "@/hooks/useSwapExecution";
import { TokenField } from "./TokenField";
import { SettingsPopover, settingsStore } from "./SettingsPopover";
import { QuoteDetails, makeSymbolOf } from "./QuoteDetails";
import { ReviewModal } from "./ReviewModal";

/** Native ETH gas reserve kept back when the user presses MAX on ETH. */
const GAS_RESERVE = 200_000_000_000_000n; // 0.0002 ETH

export type PairProps = {
  tokenIn?: Token;
  tokenOut?: Token;
  amount: string;
  setAmount: (v: string) => void;
  onPick: (side: "in" | "out") => void;
  /** Swap sides; `nextAmount` is what the pay field should show afterwards. */
  onFlip: (nextAmount: string) => void;
};

/** Same-network swap on an EVM chain (Morrow router: Uniswap v3, 0x, 1inch). */
export function SwapCard({ chainId, tokenIn, tokenOut, amount, setAmount, onPick, onFlip }: PairProps & { chainId: SupportedChainId }) {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const wrongNetwork = isConnected && walletChainId !== chainId;
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const settings = settingsStore.use();
  const { tokens } = useTokenList(chainId);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [review, setReview] = useState(false);
  // Snapshot of what the user is reviewing; follows live quotes only until they confirm.
  const [reviewed, setReviewed] = useState<{ quote: Quote; tokenIn: Token; tokenOut: Token; usdIn?: number; usdOut?: number } | null>(null);
  const [switchErr, setSwitchErr] = useState<string | null>(null);

  const hasInfra = !!CONTRACTS[chainId as SupportedChainId]?.uniswapV3;
  const symbolOf = useMemo(() => makeSymbolOf(tokens), [tokens]);
  const amountIn = tokenIn ? safeParseUnits(amount, tokenIn.decimals) : null;
  const balances = useBalances([tokenIn, tokenOut], chainId);
  const price = usePrices([tokenIn, tokenOut, tokens.find(isNative)], chainId);
  const ethPrice = price(tokens.find(isNative));
  const taker = isConnected && !wrongNetwork ? address : undefined;

  const quoteQ = useQuote({ chainId, tokenIn, tokenOut, amountIn: hasInfra ? amountIn : null, slippageBps: settings.slippageBps, taker, symbolOf: (a) => symbolOf(a) });
  const best = quoteQ.data?.best ?? null;
  const stale = best && amountIn !== null && best.amountIn !== amountIn;
  const quote = stale ? null : best;

  const { data: gasPrice } = useGasPrice({ chainId, query: { refetchInterval: 15_000 } });
  const networkFeeWei = quote?.gasEstimate && gasPrice ? quote.gasEstimate * gasPrice : undefined;
  const feeEth = networkFeeWei != null ? Number(formatUnits(networkFeeWei, 18)) : undefined;
  const networkFeeText = feeEth != null ? `${formatAmount(feeEth, 3)} ETH${ethPrice ? ` (${formatUsd(feeEth * ethPrice)})` : ""}` : undefined;

  const balIn = balances.get(tokenIn);
  const insufficient = !!amountIn && balIn !== undefined && amountIn > balIn;
  const outAmount = quote && tokenOut ? formatAmount(formatUnits(quote.amountOut, tokenOut.decimals), 8).replace(/,/g, "") : "";
  const usdIn = amountIn && tokenIn && price(tokenIn) != null ? Number(formatUnits(amountIn, tokenIn.decimals)) * price(tokenIn)! : undefined;
  const usdOut = quote && tokenOut && price(tokenOut) != null ? Number(formatUnits(quote.amountOut, tokenOut.decimals)) * price(tokenOut)! : undefined;
  const halted = tokenIn?.stock?.halted ? tokenIn : tokenOut?.stock?.halted ? tokenOut : undefined;

  const exec = useSwapExecution();
  const publicClient = usePublicClient({ chainId });

  useEffect(() => {
    if (review && exec.step.kind === "idle" && quote && tokenIn && tokenOut) setReviewed({ quote, tokenIn, tokenOut, usdIn, usdOut });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review, quote, exec.step.kind]);

  const flip = () => onFlip(outAmount || amount);

  const onMax = () => {
    if (!tokenIn || balIn === undefined) return;
    const v = isNative(tokenIn) ? (balIn > GAS_RESERVE ? balIn - GAS_RESERVE : 0n) : balIn;
    setAmount(formatUnits(v, tokenIn.decimals));
  };

  const requote = useCallback(async (): Promise<Quote | null> => {
    const quote = reviewed?.quote;
    if (!quote || !address) return null;
    const r = await fetchQuotes(
      publicClient,
      { chainId, tokenIn: quote.tokenIn, tokenOut: quote.tokenOut, amountIn: quote.amountIn, slippageBps: settings.slippageBps, taker: address },
      (a) => symbolOf(a),
    );
    // Prefer the same venue so the approved spender stays valid.
    return r.quotes.find((q) => q.provider === quote.provider && q.firm) ?? r.best;
  }, [reviewed, address, publicClient, chainId, settings.slippageBps, symbolOf]);

  const confirm = () => {
    if (!reviewed) return;
    const { quote, tokenIn, tokenOut } = reviewed;
    exec.execute(quote, {
      requote,
      infiniteApproval: settings.infiniteApproval,
      summary: `Swap ${formatAmount(formatUnits(quote.amountIn, tokenIn.decimals))} ${tokenIn.symbol} for ${tokenOut.symbol}`,
    });
  };

  useEffect(() => {
    if (exec.step.kind === "success") {
      balances.refetch();
      setAmount("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exec.step.kind]);

  // ── Primary CTA state machine ─────────────────────────────
  let cta: { label: string; onClick?: () => void; disabled?: boolean; loading?: boolean; variant?: "primary" | "ink" | "danger" } = { label: "Swap" };
  if (!mounted || !isConnected) cta = { label: "Connect wallet", onClick: () => openWalletModal(), variant: "primary" };
  else if (wrongNetwork)
    cta = {
      label: `Switch to ${getChain(chainId).name}`,
      loading: switching,
      variant: "ink",
      onClick: async () => {
        setSwitchErr(null);
        try {
          await switchChainAsync({ chainId });
        } catch (e) {
          setSwitchErr(humanizeError(e));
        }
      },
    };
  else if (!hasInfra) cta = { label: "Swaps unavailable on this network", disabled: true };
  else if (!tokenIn || !tokenOut) cta = { label: "Select a token", disabled: true };
  else if (!amountIn) cta = { label: "Enter an amount", disabled: true };
  else if (insufficient) cta = { label: `Insufficient ${tokenIn.symbol} balance`, disabled: true };
  else if (halted) cta = { label: `${halted.symbol} trading is halted`, disabled: true };
  else if (quoteQ.isLoading || (quoteQ.isFetching && !quote)) cta = { label: "Finding the best price", loading: true, disabled: true };
  else if (quoteQ.isError) cta = { label: "Quote failed — retry", onClick: () => quoteQ.refetch(), variant: "ink" };
  else if (!quote) cta = { label: "No route for this pair", disabled: true };
  else if ((quote.priceImpactBps ?? 0) >= 1500) cta = { label: "Price impact too high", disabled: true };
  else
    cta = {
      label: quote.provider === "wrap" ? quote.providerName : (quote.priceImpactBps ?? 0) >= 500 ? "Swap anyway" : "Swap",
      onClick: () => {
        exec.reset();
        setReviewed({ quote, tokenIn, tokenOut, usdIn, usdOut });
        setReview(true);
      },
      variant: (quote.priceImpactBps ?? 0) >= 500 ? "danger" : "primary",
    };

  const noRouteInfo = quoteQ.data && !quoteQ.data.best ? quoteQ.data.statuses : null;

  return (
    <div className="w-full max-w-[468px]">
      <div className="card p-2 sm:p-2.5">
        <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-surface-2 px-3.5 py-1.5 text-sm font-semibold">Swap</span>
            <LiveBadge />
          </div>
          <SettingsPopover />
        </div>

        <div className="relative space-y-1">
          <TokenField
            label="You pay"
            token={tokenIn}
            value={amount}
            onChange={setAmount}
            onSelectToken={() => onPick("in")}
            balance={mounted && isConnected ? balIn : undefined}
            usdValue={usdIn}
            onMax={onMax}
          />
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <button
              onClick={flip}
              aria-label="Switch tokens"
              className="group flex h-11 w-11 items-center justify-center rounded-[14px] border-4 border-surface bg-surface-2 text-ink transition hover:bg-surface-3"
            >
              <IconArrowDown width={18} height={18} className="transition duration-200 group-hover:rotate-180" />
            </button>
          </div>
          <TokenField
            label="You receive"
            token={tokenOut}
            value={outAmount}
            readOnly
            onSelectToken={() => onPick("out")}
            balance={mounted && isConnected ? balances.get(tokenOut) : undefined}
            usdValue={usdOut}
            loading={!!amountIn && quoteQ.isFetching && !quote}
            dim={!!stale}
          />
        </div>

        {quote && tokenIn && tokenOut && (
          <QuoteDetails
            quote={quote}
            tokenIn={tokenIn}
            tokenOut={tokenOut}
            networkFeeWei={networkFeeWei}
            ethPrice={ethPrice}
            statuses={quoteQ.data?.statuses ?? []}
            quotesCount={quoteQ.data?.quotes.length ?? 0}
            fetching={quoteQ.isFetching}
            symbolOf={symbolOf}
          />
        )}

        <Button
          size="xl"
          block
          className="mt-2"
          variant={cta.variant ?? "primary"}
          disabled={cta.disabled}
          loading={cta.loading}
          onClick={cta.onClick}
        >
          {cta.label}
        </Button>
      </div>

      {switchErr && <Notice tone="error" className="mt-3">{switchErr}</Notice>}
      {mounted && !hasInfra && (
        <Notice className="mt-3">
          No verified swap contracts are published for this network yet. Switch to a mainnet to trade.
        </Notice>
      )}
      {noRouteInfo && amountIn && (
        <Notice className="mt-3">
          No liquidity found for this pair.{" "}
          {noRouteInfo
            .filter((s) => s.state === "not-configured")
            .map((s) => s.name)
            .join(", ") && (
            <span className="text-faint">
              Additional sources not enabled on this deployment:{" "}
              {noRouteInfo
                .filter((s) => s.state === "not-configured")
                .map((s) => s.name)
                .join(", ")}
              .
            </span>
          )}
        </Notice>
      )}

      {reviewed && (
        <ReviewModal
          open={review}
          onClose={() => setReview(false)}
          quote={reviewed.quote}
          tokenIn={reviewed.tokenIn}
          tokenOut={reviewed.tokenOut}
          usdIn={reviewed.usdIn}
          usdOut={reviewed.usdOut}
          networkFee={networkFeeText}
          step={exec.step}
          onConfirm={confirm}
          onReset={exec.reset}
          symbolOf={symbolOf}
          chainId={chainId}
        />
      )}
    </div>
  );
}
