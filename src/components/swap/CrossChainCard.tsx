"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { getPublicClient, getWalletClient, switchChain } from "@wagmi/core";
import { erc20Abi, formatUnits, isAddress, type Address, type Hex } from "viem";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { Button } from "@/components/ui/Button";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { Notice } from "@/components/ui/misc";
import { IconArrowDown, IconExternal } from "@/components/ui/Icons";
import { Row } from "@/components/swap/QuoteDetails";
import { TokenField } from "@/components/swap/TokenField";
import { SettingsPopover, settingsStore } from "@/components/swap/SettingsPopover";
import type { PairProps } from "@/components/swap/SwapCard";
import { openWalletModal } from "@/components/wallet/WalletModal";
import { chainName, explorerUrl, type SupportedChainId } from "@/config/chains";
import { wagmiConfig } from "@/lib/wagmi";
import { cn } from "@/lib/cn";
import { formatTokenAmount, formatUsd, safeParseUnits, shortAddress } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { b64ToBytes } from "@/lib/solana/codec";
import { SOL_MINT, isMint } from "@/lib/solana/constants";
import { isNative } from "@/lib/tokens/core";
import { crossSupported, isSol, lifiChain, lifiToken } from "@/lib/tokens/universal";
import { addTx, updateTx } from "@/lib/tx/store";
import { useDebounced } from "@/hooks/useQuote";
import { useBalances } from "@/hooks/useBalances";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { useSolanaPortfolio } from "@/hooks/useSolana";

type Quote = {
  tool: string;
  toolLogo: string | null;
  toAmount: string | null;
  toAmountMin: string | null;
  toAmountUSD: string | null;
  fromAmountUSD: string | null;
  approvalAddress: string | null;
  durationSec: number | null;
  feeUSD: number;
  gasUSD: number;
  transactionRequest: { to?: string; data?: string; value?: string; gasLimit?: string } | null;
};

type Step =
  | { kind: "idle" }
  | { kind: "switch" }
  | { kind: "approve" }
  | { kind: "sign" }
  | { kind: "source-pending"; hash: string }
  | { kind: "bridging"; hash: string; sub?: string | null }
  | { kind: "done"; hash: string; receivingTx?: string | null; link?: string | null }
  | { kind: "error"; message: string; hash?: string };

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const GAS_RESERVE = 300_000_000_000_000n; // 0.0003 native kept back on MAX (EVM)
const SOL_RESERVE = 15_000_000n; // 0.015 SOL

/**
 * Swap between networks in one step: any token on one network for any token on another, routed by
 * LI.FI (bridges + DEXs). Approve the exact amount → simulate → sign on the source network → track
 * until it lands. Morrow adds no fee.
 */
export function CrossChainCard({ tokenIn: from, tokenOut: to, amount, setAmount, onPick, onFlip }: PairProps) {
  const evm = useAccount();
  const sol = useSolanaWallet();
  const settings = settingsStore.use();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [recipient, setRecipient] = useState("");
  const [editRecipient, setEditRecipient] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "idle" });

  const fromChain = from?.chainId ?? 1;
  const toChain = to?.chainId ?? 1;
  const fromSol = isSol(from);
  const toSol = isSol(to);
  const supported = crossSupported(fromChain) && crossSupported(toChain);
  const sender = fromSol ? sol.address : evm.address;
  const autoRecipient = toSol ? sol.address : evm.address;
  const dest = editRecipient ? recipient.trim() : autoRecipient ?? "";
  const recipientValid = !!dest && (toSol ? isMint(dest) : isAddress(dest));

  useEffect(() => setStep({ kind: "idle" }), [from?.address, to?.address, fromChain, toChain]);

  // Source balance.
  const evmBal = useBalances(!fromSol && from ? [from] : [], (fromSol ? 1 : fromChain) as SupportedChainId);
  const solPf = useSolanaPortfolio(fromSol ? sol.address : undefined);
  const balance: bigint | undefined = !from
    ? undefined
    : fromSol
      ? (() => {
          const h = solPf.data?.find((x) => x.mint === from.address);
          return h ? BigInt(h.raw) : solPf.data ? 0n : undefined;
        })()
      : evmBal.get(from);

  const raw = from ? safeParseUnits(amount, from.decimals) : null;
  const dRaw = useDebounced(raw, 500);
  const insufficient = raw != null && balance != null && raw > balance;

  // Quotes need a sender address; before connecting, quote with a placeholder only for display.
  const quoteFrom = sender ?? (fromSol ? "11111111111111111111111111111111" : "0x0000000000000000000000000000000000000001");
  const quoteTo = recipientValid ? dest : toSol ? "11111111111111111111111111111111" : "0x0000000000000000000000000000000000000001";
  const quote = useQuery({
    queryKey: ["xchain-quote", fromChain, toChain, from?.address, to?.address, dRaw?.toString(), quoteFrom, quoteTo, settings.slippageBps],
    enabled: supported && !!from && !!to && !!dRaw && step.kind === "idle",
    refetchInterval: 30_000,
    retry: 0,
    queryFn: async () => {
      const q = new URLSearchParams({
        fromChain: String(lifiChain(fromChain)),
        toChain: String(lifiChain(toChain)),
        fromToken: lifiToken(from!),
        toToken: lifiToken(to!),
        fromAmount: dRaw!.toString(),
        fromAddress: quoteFrom,
        toAddress: quoteTo,
        slippage: String(settings.slippageBps / 10_000),
      });
      const r = await fetch(`/api/bridge/quote?${q}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No route");
      return j as Quote;
    },
  });
  const qd = raw && dRaw === raw ? quote.data : undefined;
  const firm = !!sender && recipientValid; // quote built for the real wallets

  const pollStatus = async (hash: string) => {
    for (let i = 0; i < 360; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const s = await fetch(`/api/bridge/status?txHash=${hash}&fromChain=${lifiChain(fromChain)}&toChain=${lifiChain(toChain)}`).then((r) => r.json()).catch(() => null);
      if (!s) continue;
      if (s.status === "DONE") return setStep({ kind: "done", hash, receivingTx: s.receivingTx, link: s.receivingLink ?? s.lifiExplorer });
      if (s.status === "FAILED") return setStep({ kind: "error", message: s.substatus || "The route reported a failure. Funds are typically refunded on the source network.", hash });
      setStep({ kind: "bridging", hash, sub: s.substatus });
    }
    setStep({ kind: "error", message: "Still in progress. Track it on the explorer.", hash });
  };

  const execute = async () => {
    const tr = qd?.transactionRequest;
    if (!qd || !tr?.data || !raw || !from || !to || !firm) return;
    const summary = `Swap ${amount} ${from.symbol} (${chainName(fromChain)}) for ${to.symbol} (${chainName(toChain)})`;
    try {
      if (fromSol) {
        if (!sol.wallet) return openWalletModal("solana");
        setStep({ kind: "sign" });
        const tx = VersionedTransaction.deserialize(b64ToBytes(tr.data));
        const signed = (await sol.wallet.signTransaction(tx)) as VersionedTransaction;
        const conn = new Connection(SOLANA_RPC, "confirmed");
        const sig = await conn.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
        setStep({ kind: "source-pending", hash: sig });
        const res = await conn.confirmTransaction(sig, "confirmed");
        if (res.value.err) return setStep({ kind: "error", message: "The source transaction failed on Solana.", hash: sig });
        setStep({ kind: "bridging", hash: sig });
        return pollStatus(sig);
      }

      const cid = fromChain as SupportedChainId;
      if (evm.chainId !== fromChain) {
        setStep({ kind: "switch" });
        await switchChain(wagmiConfig, { chainId: cid });
      }
      const wallet = await getWalletClient(wagmiConfig, { chainId: cid });
      const pub = getPublicClient(wagmiConfig, { chainId: cid })!;
      const account = wallet.account.address;

      if (!isNative(from) && qd.approvalAddress && isAddress(qd.approvalAddress)) {
        const allowance = await pub.readContract({ address: from.address as Address, abi: erc20Abi, functionName: "allowance", args: [account, qd.approvalAddress] });
        if (allowance < raw) {
          setStep({ kind: "approve" });
          const h = await wallet.writeContract({ address: from.address as Address, abi: erc20Abi, functionName: "approve", args: [qd.approvalAddress, raw], account, chain: wallet.chain });
          addTx({ hash: h, chainId: fromChain, from: account, kind: "approve", summary: `Approve ${from.symbol}`, status: "pending", createdAt: Date.now() });
          const r = await pub.waitForTransactionReceipt({ hash: h, timeout: 180_000 });
          updateTx(h, { status: r.status === "success" ? "success" : "failed" });
          if (r.status !== "success") return setStep({ kind: "error", message: "Approval reverted.", hash: h });
        }
      }

      setStep({ kind: "sign" });
      const request = { to: tr.to as Address, data: tr.data as Hex, value: tr.value ? BigInt(tr.value) : 0n };
      await pub.call({ account, ...request }); // simulate before asking for a signature
      const hash = await wallet.sendTransaction({ account, chain: wallet.chain, ...request, gas: tr.gasLimit ? BigInt(tr.gasLimit) : undefined });
      addTx({ hash, chainId: fromChain, from: account, kind: "swap", summary, status: "pending", createdAt: Date.now() });
      setStep({ kind: "source-pending", hash });
      const rc = await pub.waitForTransactionReceipt({ hash, timeout: 180_000 });
      updateTx(hash, { status: rc.status === "success" ? "success" : "failed" });
      if (rc.status !== "success") return setStep({ kind: "error", message: "The source transaction reverted. Nothing was sent.", hash });
      setStep({ kind: "bridging", hash });
      return pollStatus(hash);
    } catch (e) {
      setStep((s) => ({ kind: "error", message: humanizeError(e), hash: "hash" in s ? s.hash : undefined }));
    }
  };

  const onMax = () => {
    if (!from || balance == null) return;
    const native = fromSol ? (from.address as string) === SOL_MINT : isNative(from);
    const reserve = fromSol ? SOL_RESERVE : GAS_RESERVE;
    setAmount(formatUnits(native ? (balance > reserve ? balance - reserve : 0n) : balance, from.decimals));
  };

  const busy = !["idle", "done", "error"].includes(step.kind);
  const needWallet = fromSol ? !sol.address : !evm.address;
  const needDestWallet = !editRecipient && !autoRecipient;

  let cta: { label: string; onClick?: () => void; disabled?: boolean; loading?: boolean } = { label: "Swap", onClick: execute };
  if (!supported) cta = { label: "Cross-network swaps need two mainnets", disabled: true };
  else if (!from || !to) cta = { label: "Select a token", disabled: true };
  else if (!mounted || needWallet) cta = { label: fromSol ? "Connect Solana wallet" : "Connect wallet", onClick: () => openWalletModal(fromSol ? "solana" : "any") };
  else if (needDestWallet) cta = { label: toSol ? "Connect a Solana wallet to receive" : "Connect an EVM wallet to receive", onClick: () => openWalletModal(toSol ? "solana" : "any") };
  else if (!recipientValid) cta = { label: "Enter a valid recipient", disabled: true };
  else if (!raw) cta = { label: "Enter an amount", disabled: true };
  else if (insufficient) cta = { label: `Insufficient ${from.symbol} balance`, disabled: true };
  else if (quote.isFetching && !qd) cta = { label: "Finding the best route", loading: true, disabled: true };
  else if (quote.isError) cta = { label: `${(quote.error as Error).message} — retry`, onClick: () => quote.refetch() };
  else if (!qd?.transactionRequest) cta = { label: "No route for this swap", disabled: true };
  else if (!fromSol && evm.chainId !== fromChain) cta = { label: `Switch to ${chainName(fromChain)} & swap`, onClick: execute };

  const outAmount = qd?.toAmount && to ? formatTokenAmount(BigInt(qd.toAmount), to.decimals, 8).replace(/,/g, "") : "";
  const explorerFor = (c: number, hash: string) => explorerUrl(c, "tx", hash);

  return (
    <div className="w-full max-w-[468px]">
      <div className="card p-2 sm:p-2.5">
        <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-surface-2 px-3.5 py-1.5 text-sm font-semibold">Swap</span>
            <span className="flex items-center gap-1.5 rounded-full bg-violet/10 px-2.5 py-1 text-[12px] font-semibold text-violet">
              <ChainLogo chainId={fromChain} size={14} />
              <span aria-hidden>→</span>
              <ChainLogo chainId={toChain} size={14} />
              Cross-network
            </span>
          </div>
          <SettingsPopover />
        </div>

        <div className="relative space-y-1">
          <TokenField
            label={`You pay on ${chainName(fromChain)}`}
            token={from}
            value={amount}
            onChange={setAmount}
            onSelectToken={() => onPick("in")}
            balance={mounted && sender ? balance : undefined}
            usdValue={qd?.fromAmountUSD ? Number(qd.fromAmountUSD) : undefined}
            onMax={onMax}
          />
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <button onClick={() => onFlip(outAmount || amount)} aria-label="Switch tokens" className="group flex h-11 w-11 items-center justify-center rounded-[14px] border-4 border-surface bg-surface-2 text-ink transition hover:bg-surface-3">
              <IconArrowDown width={18} height={18} className="transition duration-200 group-hover:rotate-180" />
            </button>
          </div>
          <TokenField
            label={`You receive on ${chainName(toChain)}`}
            token={to}
            value={outAmount}
            readOnly
            onSelectToken={() => onPick("out")}
            usdValue={qd?.toAmountUSD ? Number(qd.toAmountUSD) : undefined}
            loading={!!raw && quote.isFetching && !qd}
          />
        </div>

        <div className="mt-2 rounded-[20px] border border-line px-4 py-3 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Recipient on {chainName(toChain)}</span>
            <button onClick={() => { setEditRecipient((e) => !e); setRecipient(autoRecipient ?? ""); }} className="text-[12px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
              {editRecipient ? "Use my wallet" : "Change"}
            </button>
          </div>
          {editRecipient ? (
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={toSol ? "Solana address" : "0x… address"} className={cn("mt-2 h-10 w-full rounded-xl border bg-surface px-3 font-mono text-[13px] outline-none", recipient && !recipientValid ? "border-down/50" : "border-line")} />
          ) : (
            <div className="mt-1 font-mono">{autoRecipient ? shortAddress(autoRecipient, 6) : <span className="font-sans text-faint">Connect {toSol ? "a Solana" : "an EVM"} wallet</span>}</div>
          )}
        </div>

        {qd && to && (
          <div className="mt-2 rounded-[20px] border border-line px-4 py-2">
            <Row label="Route">
              <span className="inline-flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qd.toolLogo && <img src={qd.toolLogo} alt="" className="h-4 w-4 rounded" />}
                {qd.tool} via LI.FI
              </span>
            </Row>
            {qd.toAmountMin && <Row label="Minimum received">{formatTokenAmount(BigInt(qd.toAmountMin), to.decimals)} {to.symbol}</Row>}
            {qd.durationSec != null && <Row label="Estimated time">{qd.durationSec < 90 ? `~${Math.max(1, Math.round(qd.durationSec))}s` : `~${Math.round(qd.durationSec / 60)} min`}</Row>}
            <Row label="Fees" tip="Bridge and DEX fees plus estimated network gas, in USD. Morrow adds no fee.">{formatUsd(qd.feeUSD + qd.gasUSD)}</Row>
            {!firm && <p className="py-2 text-[12px] text-faint">Indicative quote. Connect your wallet for a firm route.</p>}
          </div>
        )}

        <Button size="xl" block className="mt-2" variant="primary" disabled={cta.disabled || busy} loading={cta.loading || busy} onClick={cta.onClick}>
          {busy
            ? step.kind === "switch" ? "Switch network in your wallet"
            : step.kind === "approve" ? `Approve ${from?.symbol} in your wallet`
            : step.kind === "sign" ? "Confirm in your wallet"
            : step.kind === "source-pending" ? `Confirming on ${chainName(fromChain)}`
            : `Arriving on ${chainName(toChain)}…`
            : cta.label}
        </Button>
      </div>

      {(step.kind === "bridging" || step.kind === "source-pending") && (
        <Notice className="mt-3">
          {step.kind === "bridging" ? `In transit to ${chainName(toChain)}${step.sub ? ` · ${step.sub}` : ""}. You can leave this page; it keeps going.` : "Waiting for the source transaction to confirm."}{" "}
          <a href={explorerFor(fromChain, step.hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-ink hover:underline">Source tx <IconExternal width={12} height={12} /></a>
        </Notice>
      )}
      {step.kind === "done" && (
        <Notice tone="ok" className="mt-3">
          Delivered on {chainName(toChain)}.{" "}
          {step.receivingTx ? (
            <a href={explorerFor(toChain, step.receivingTx)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">View receiving tx <IconExternal width={12} height={12} /></a>
          ) : step.link ? (
            <a href={step.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">View transfer <IconExternal width={12} height={12} /></a>
          ) : null}
          <button onClick={() => { setStep({ kind: "idle" }); setAmount(""); }} className="ml-2 font-medium underline">New swap</button>
        </Notice>
      )}
      {step.kind === "error" && (
        <Notice tone="error" className="mt-3">
          {step.message}{" "}
          {step.hash && <a href={explorerFor(fromChain, step.hash)} target="_blank" rel="noreferrer" className="font-medium underline">Source tx</a>}
          <button onClick={() => setStep({ kind: "idle" })} className="ml-2 font-medium underline">Try again</button>
        </Notice>
      )}
      {toChain === 4663 && to && !isNative(to) && (
        <p className="mt-3 px-1 text-xs leading-relaxed text-faint">Gas on Robinhood Chain is paid in ETH. Bring a little ETH too if your wallet there is empty.</p>
      )}
      <p className="mt-3 px-1 text-[11px] leading-relaxed text-faint">
        Cross-network routes come from LI.FI (Relay, Across, Stargate, the canonical Arbitrum bridge and DEXs). Prefer the trustless canonical bridge? See{" "}
        <a href="https://docs.robinhood.com/chain/bridging/" target="_blank" rel="noreferrer" className="underline">Robinhood Chain bridging</a>.
      </p>
    </div>
  );
}

