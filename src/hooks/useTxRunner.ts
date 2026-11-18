"use client";
import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import type { Abi, Address, Hash } from "viem";
import { humanizeError } from "@/lib/errors";
import { addTx, updateTx, type LocalTx } from "@/lib/tx/store";

export type TxStep = { label: string; address: Address; abi: Abi; functionName: string; args: readonly unknown[]; value?: bigint; kind: LocalTx["kind"]; skip?: () => Promise<boolean> };
export type RunnerState = { index: number; phase: "idle" | "sign" | "pending" | "done" | "error"; message?: string; hashes: Hash[] };

/** Runs a sequence of contract writes: simulate → sign → wait for receipt, one at a time. */
export function useTxRunner() {
  const { address, chainId } = useAccount();
  const { data: wallet } = useWalletClient();
  const client = usePublicClient();
  const [state, setState] = useState<RunnerState>({ index: 0, phase: "idle", hashes: [] });

  const run = useCallback(
    async (steps: TxStep[], expectedChainId: number) => {
      if (!address || !wallet || !client) return setState({ index: 0, phase: "error", message: "Connect a wallet first.", hashes: [] });
      if (chainId !== expectedChainId) return setState({ index: 0, phase: "error", message: "Switch your wallet to Robinhood Chain to continue.", hashes: [] });
      const hashes: Hash[] = [];
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        try {
          if (s.skip && (await s.skip())) continue;
          setState({ index: i, phase: "sign", hashes });
          const { request } = await client.simulateContract({ account: address, address: s.address, abi: s.abi, functionName: s.functionName as never, args: s.args as never, value: s.value } as never);
          const hash = await wallet.writeContract(request as never);
          hashes.push(hash);
          addTx({ hash, chainId: expectedChainId, from: address, kind: s.kind, summary: s.label, status: "pending", createdAt: Date.now() });
          setState({ index: i, phase: "pending", hashes: [...hashes] });
          const r = await client.waitForTransactionReceipt({ hash, timeout: 120_000 });
          updateTx(hash, { status: r.status === "success" ? "success" : "failed" });
          if (r.status !== "success") return setState({ index: i, phase: "error", message: `${s.label} reverted on-chain.`, hashes });
        } catch (e) {
          return setState({ index: i, phase: "error", message: humanizeError(e), hashes });
        }
      }
      setState({ index: steps.length - 1, phase: "done", hashes });
    },
    [address, wallet, client, chainId],
  );

  return { state, run, reset: () => setState({ index: 0, phase: "idle", hashes: [] }) };
}
