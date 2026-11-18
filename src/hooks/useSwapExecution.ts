"use client";
import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { maxUint256, WaitForTransactionReceiptTimeoutError, type Hash } from "viem";
import { erc20Abi } from "@/lib/abis";
import { humanizeError } from "@/lib/errors";
import { addTx, updateTx } from "@/lib/tx/store";
import type { Quote } from "@/lib/swap/types";

const RECEIPT_TIMEOUT = 120_000;

export type ExecStep =
  | { kind: "idle" }
  | { kind: "approve-sign" }
  | { kind: "approve-pending"; hash: Hash }
  | { kind: "requote" }
  | { kind: "simulate" }
  | { kind: "swap-sign" }
  | { kind: "swap-pending"; hash: Hash }
  | { kind: "success"; hash: Hash; amountOut: bigint }
  | { kind: "error"; message: string; hash?: Hash };

/**
 * Approval → fresh firm quote → simulation → signature → confirmation.
 * Never reports success without a successful on-chain receipt.
 */
export function useSwapExecution() {
  const { address, chainId: walletChainId } = useAccount();
  const { data: wallet } = useWalletClient();
  const [step, setStep] = useState<ExecStep>({ kind: "idle" });

  const publicClient = usePublicClient();

  const execute = useCallback(
    async (quote: Quote, opts: { requote: () => Promise<Quote | null>; summary: string; infiniteApproval?: boolean }) => {
      if (!address || !wallet) return setStep({ kind: "error", message: "Connect a wallet first." });
      if (walletChainId !== quote.chainId) return setStep({ kind: "error", message: "Your wallet is on a different network. Switch to Robinhood Chain to continue." });
      const client = publicClient;
      if (!client || client.chain?.id !== quote.chainId) return setStep({ kind: "error", message: "Network client unavailable." });

      let hash: Hash | undefined;
      try {
        // 1. Approval (exact amount by default)
        if (quote.spender) {
          const allowance = await client.readContract({ address: quote.tokenIn, abi: erc20Abi, functionName: "allowance", args: [address, quote.spender] });
          if (allowance < quote.amountIn) {
            setStep({ kind: "approve-sign" });
            const approveHash = await wallet.writeContract({
              address: quote.tokenIn,
              abi: erc20Abi,
              functionName: "approve",
              args: [quote.spender, opts.infiniteApproval ? maxUint256 : quote.amountIn],
              account: address,
              chain: client.chain,
            });
            addTx({ hash: approveHash, chainId: quote.chainId, from: address, kind: "approve", summary: `Approve ${opts.summary.split(" ")[1] ?? "token"}`, status: "pending", createdAt: Date.now() });
            setStep({ kind: "approve-pending", hash: approveHash });
            const r = await client.waitForTransactionReceipt({ hash: approveHash, timeout: RECEIPT_TIMEOUT });
            updateTx(approveHash, { status: r.status === "success" ? "success" : "failed" });
            if (r.status !== "success") return setStep({ kind: "error", message: "Approval transaction reverted.", hash: approveHash });
          }
        }

        // 2. Fresh firm quote, bounded by the user's accepted minimum.
        setStep({ kind: "requote" });
        const fresh = quote.provider === "wrap" ? quote : await opts.requote();
        if (!fresh?.tx) return setStep({ kind: "error", message: "Couldn't get an executable quote. Please try again." });
        if (fresh.amountOut < quote.minAmountOut) return setStep({ kind: "error", message: "The price moved beyond your slippage tolerance. Review the updated quote." });
        if (fresh.spender && quote.spender && fresh.spender.toLowerCase() !== quote.spender.toLowerCase())
          return setStep({ kind: "error", message: "Route changed to a different contract. Review the updated quote." });

        // 3. Simulate
        setStep({ kind: "simulate" });
        const { to, data, value } = fresh.tx;
        await client.call({ account: address, to, data, value });
        const gas = await client.estimateGas({ account: address, to, data, value });

        // 4. Sign & send
        setStep({ kind: "swap-sign" });
        const sent: Hash = await wallet.sendTransaction({ account: address, chain: client.chain, to, data, value, gas: (gas * 12n) / 10n });
        hash = sent;
        addTx({ hash: sent, chainId: quote.chainId, from: address, kind: fresh.provider === "wrap" ? "wrap" : "swap", summary: opts.summary, status: "pending", createdAt: Date.now() });
        setStep({ kind: "swap-pending", hash: sent });

        // 5. Confirm
        const receipt = await client.waitForTransactionReceipt({ hash: sent, timeout: RECEIPT_TIMEOUT });
        updateTx(sent, { status: receipt.status === "success" ? "success" : "failed" });
        if (receipt.status !== "success") return setStep({ kind: "error", message: "The swap reverted on-chain. No tokens were exchanged.", hash: sent });
        setStep({ kind: "success", hash: sent, amountOut: fresh.amountOut });
      } catch (e) {
        if (e instanceof WaitForTransactionReceiptTimeoutError)
          return setStep({ kind: "error", message: "Still waiting for confirmation. Track the transaction on the explorer.", hash });
        // A signed tx that errored before a receipt is not marked failed; its status is re-checked later.
        setStep({ kind: "error", message: humanizeError(e), hash });
      }
    },
    [address, wallet, walletChainId, publicClient],
  );

  return { step, execute, reset: () => setStep({ kind: "idle" }) };
}
