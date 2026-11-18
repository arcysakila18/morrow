"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { maxUint128, encodeFunctionData } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Notice } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/Spinner";
import { openWalletModal } from "@/components/wallet/WalletModal";
import { positionManagerAbi } from "@/lib/abis";
import { CONTRACTS } from "@/config/contracts";
import { cn } from "@/lib/cn";
import { formatAmount, formatTokenAmount } from "@/lib/format";
import { amountsForLiquidity, sqrtPriceX96ToFloat, tickToPrice, toRaw, MIN_TICK, MAX_TICK } from "@/lib/uniswap/math";
import { usePositions, type Position } from "@/hooks/usePositions";
import { useTxRunner } from "@/hooks/useTxRunner";
import { settingsStore } from "@/components/swap/SettingsPopover";
import { PairIcons } from "./PoolTable";

export function Positions() {
  const { isConnected, chainId } = useAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const q = usePositions();
  const [removing, setRemoving] = useState<Position | null>(null);

  return (
    <section className="mt-8">
      <h2 className="text-[17px] font-semibold">Your positions</h2>
      <div className="card mt-4">
        {!mounted || !isConnected ? (
          <EmptyState title="Connect a wallet to view positions" body="Your Uniswap v3 liquidity positions on Robinhood Chain will appear here." action={<Button variant="primary" onClick={openWalletModal}>Connect wallet</Button>} />
        ) : chainId !== 4663 ? (
          <EmptyState title="Positions are available on Robinhood Chain mainnet" />
        ) : q.isLoading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : q.isError ? (
          <EmptyState title="Couldn't load positions" body={(q.error as Error).message} />
        ) : !q.data?.length ? (
          <EmptyState title="No active positions" body="Choose a Uniswap v3 pool below to add liquidity." />
        ) : (
          <ul className="divide-y divide-line">
            {q.data.map((p) => (
              <PositionRow key={p.tokenId.toString()} p={p} onRemove={() => setRemoving(p)} />
            ))}
          </ul>
        )}
      </div>
      {removing && <RemoveModal p={removing} onClose={() => { setRemoving(null); q.refetch(); }} />}
    </section>
  );
}

function PositionRow({ p, onRemove }: { p: Position; onRemove: () => void }) {
  const inRange = p.tick >= p.tickLower && p.tick < p.tickUpper;
  const full = p.tickLower <= MIN_TICK + 60000 && p.tickUpper >= MAX_TICK - 60000;
  const { amount0, amount1 } = amountsForLiquidity(p.liquidity, sqrtPriceX96ToFloat(p.sqrtPriceX96), p.tickLower, p.tickUpper);
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
      <Link href={`/pools/${p.pool}`} className="flex flex-1 items-center gap-3">
        <PairIcons a={p.token0.symbol} b={p.token1.symbol} aAddress={p.token0.address} bAddress={p.token1.address} size={32} />
        <div>
          <div className="flex items-center gap-2 font-medium">
            {p.token0.symbol} / {p.token1.symbol}
            <span className="tabular rounded bg-surface-2 px-1.5 py-px text-[11px] text-muted">{p.fee / 10_000}%</span>
            <span className={cn("flex items-center gap-1 text-[11px] font-medium", p.liquidity === 0n ? "text-faint" : inRange ? "text-up" : "text-warn")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", p.liquidity === 0n ? "bg-faint" : inRange ? "bg-up" : "bg-warn")} />
              {p.liquidity === 0n ? "Closed" : inRange ? "In range" : "Out of range"}
            </span>
          </div>
          <div className="tabular mt-0.5 text-xs text-muted">
            {full ? "Full range" : `${formatAmount(tickToPrice(p.tickLower, p.token0.decimals, p.token1.decimals), 4)} – ${formatAmount(tickToPrice(p.tickUpper, p.token0.decimals, p.token1.decimals), 4)} ${p.token1.symbol}/${p.token0.symbol}`}
            {" · "}#{p.tokenId.toString()}
          </div>
        </div>
      </Link>
      <div className="tabular text-sm sm:text-right">
        <div>{formatTokenAmount(toRaw(amount0), p.token0.decimals)} {p.token0.symbol}</div>
        <div className="text-muted">{formatTokenAmount(toRaw(amount1), p.token1.decimals)} {p.token1.symbol}</div>
      </div>
      <Button variant="outline" size="sm" onClick={onRemove} className="sm:ml-4">
        {p.liquidity === 0n ? "Collect" : "Remove"}
      </Button>
    </li>
  );
}

function RemoveModal({ p, onClose }: { p: Position; onClose: () => void }) {
  const { address } = useAccount();
  const [pct, setPct] = useState(100);
  const runner = useTxRunner();
  const settings = settingsStore.use();
  const npm = CONTRACTS[4663].uniswapV3!.positionManager;
  const liq = (p.liquidity * BigInt(pct)) / 100n;
  const est = amountsForLiquidity(liq, sqrtPriceX96ToFloat(p.sqrtPriceX96), p.tickLower, p.tickUpper);
  const slip = BigInt(10_000 - settings.slippageBps);
  const min0 = (toRaw(est.amount0) * slip) / 10_000n;
  const min1 = (toRaw(est.amount1) * slip) / 10_000n;
  const busy = runner.state.phase === "sign" || runner.state.phase === "pending";

  const submit = () => {
    if (!address) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
    const calls: `0x${string}`[] = [];
    if (liq > 0n) calls.push(encodeFunctionData({ abi: positionManagerAbi, functionName: "decreaseLiquidity", args: [{ tokenId: p.tokenId, liquidity: liq, amount0Min: min0, amount1Min: min1, deadline }] }));
    calls.push(encodeFunctionData({ abi: positionManagerAbi, functionName: "collect", args: [{ tokenId: p.tokenId, recipient: address, amount0Max: maxUint128, amount1Max: maxUint128 }] }));
    runner.run([{ label: `Remove ${p.token0.symbol}/${p.token1.symbol} liquidity`, kind: "remove-liquidity", address: npm, abi: positionManagerAbi, functionName: "multicall", args: [calls] }], 4663);
  };

  return (
    <Modal open onClose={() => !busy && onClose()} title={p.liquidity === 0n ? "Collect fees" : "Remove liquidity"}>
      <div className="px-5 pb-5">
        {p.liquidity > 0n && (
          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="tabular text-[34px] font-medium tracking-tight">{pct}%</div>
            <input type="range" min={1} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="mt-2 w-full accent-ink" />
            <div className="mt-3 flex gap-2">
              {[25, 50, 75, 100].map((v) => (
                <button key={v} onClick={() => setPct(v)} className={cn("h-8 flex-1 rounded-lg text-[13px] font-medium", pct === v ? "bg-ink text-paper" : "bg-surface hover:bg-surface-3")}>
                  {v === 100 ? "Max" : `${v}%`}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="tabular mt-4 space-y-1.5 px-1 text-sm">
          <div className="flex justify-between"><span className="text-muted">Pooled {p.token0.symbol}</span><span>{formatTokenAmount(toRaw(est.amount0), p.token0.decimals)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Pooled {p.token1.symbol}</span><span>{formatTokenAmount(toRaw(est.amount1), p.token1.decimals)}</span></div>
          <div className="flex justify-between text-xs text-faint"><span>Plus all uncollected fees</span><span>Slippage {settings.slippageBps / 100}%</span></div>
        </div>
        {runner.state.phase === "error" && <Notice tone="error" className="mt-3">{runner.state.message}</Notice>}
        {runner.state.phase === "done" ? (
          <>
            <Notice tone="ok" className="mt-4">Liquidity removed and tokens sent to your wallet.</Notice>
            <Button variant="ink" size="lg" block className="mt-3" onClick={onClose}>Done</Button>
          </>
        ) : (
          <Button variant="primary" size="lg" block className="mt-4" loading={busy} disabled={busy} onClick={submit}>
            {busy ? (runner.state.phase === "sign" ? "Confirm in wallet" : "Waiting for confirmation") : p.liquidity === 0n ? "Collect" : "Remove"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
