"use client";
import { useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Notice, Segmented } from "@/components/ui/misc";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { openWalletModal } from "@/components/wallet/WalletModal";
import { erc20Abi, positionManagerAbi } from "@/lib/abis";
import { CONTRACTS } from "@/config/contracts";
import { formatAmount, formatTokenAmount, safeParseUnits } from "@/lib/format";
import { pairedAmount, rangeForPreset, sqrtPriceX96ToFloat, tickToPrice, toRaw } from "@/lib/uniswap/math";
import type { PoolState } from "@/hooks/usePoolState";
import { useBalances } from "@/hooks/useBalances";
import { useAppChain } from "@/hooks/useAppChain";
import { useTxRunner, type TxStep } from "@/hooks/useTxRunner";
import { settingsStore } from "@/components/swap/SettingsPopover";
import type { Token } from "@/lib/tokens/types";

export function AddLiquidity({ pool }: { pool: PoolState }) {
  const { address, isConnected } = useAccount();
  const { wrongNetwork } = useAppChain();
  const settings = settingsStore.use();
  const client = usePublicClient({ chainId: 4663 });
  const npm = CONTRACTS[4663].uniswapV3!.positionManager;
  const [preset, setPreset] = useState<"full" | "wide" | "narrow">("full");
  const [input, setInput] = useState<{ side: 0 | 1; value: string }>({ side: 0, value: "" });
  const runner = useTxRunner();

  const t0: Token = { chainId: 4663, address: pool.token0.address, symbol: pool.token0.symbol, name: pool.token0.symbol, decimals: pool.token0.decimals, source: "custom" };
  const t1: Token = { chainId: 4663, address: pool.token1.address, symbol: pool.token1.symbol, name: pool.token1.symbol, decimals: pool.token1.decimals, source: "custom" };
  const balances = useBalances([t0, t1], 4663);

  const { lower, upper } = rangeForPreset(pool.tick, pool.tickSpacing, preset);
  const sqrtP = sqrtPriceX96ToFloat(pool.sqrtPriceX96);

  const amounts = useMemo(() => {
    const dec = input.side === 0 ? t0.decimals : t1.decimals;
    const raw = safeParseUnits(input.value, dec);
    if (!raw) return null;
    const other = pairedAmount(input.side, Number(raw), sqrtP, lower, upper);
    if (Number.isNaN(other)) return { error: `Only ${input.side === 0 ? t1.symbol : t0.symbol} can be deposited for this range.` } as const;
    const a0 = input.side === 0 ? raw : toRaw(other);
    const a1 = input.side === 1 ? raw : toRaw(other);
    return { a0, a1 } as const;
  }, [input, sqrtP, lower, upper, t0.decimals, t1.decimals, t0.symbol, t1.symbol]);

  const display = (side: 0 | 1) => {
    if (input.side === side) return input.value;
    if (!amounts || "error" in amounts) return "";
    const v = side === 0 ? amounts.a0 : amounts.a1;
    return v > 0n ? formatAmount(formatUnits(v, side === 0 ? t0.decimals : t1.decimals), 8).replace(/,/g, "") : "0";
  };

  const pLow = tickToPrice(lower, t0.decimals, t1.decimals);
  const pHigh = tickToPrice(upper, t0.decimals, t1.decimals);
  const pNow = tickToPrice(pool.tick, t0.decimals, t1.decimals);

  const ok = amounts && !("error" in amounts) && (amounts.a0 > 0n || amounts.a1 > 0n);
  const insufficient =
    ok &&
    ((balances.get(t0) !== undefined && amounts.a0 > balances.get(t0)!) || (balances.get(t1) !== undefined && amounts.a1 > balances.get(t1)!));

  const submit = () => {
    if (!ok || !address || !client) return;
    const { a0, a1 } = amounts;
    const slip = BigInt(10_000 - settings.slippageBps);
    const approve = (t: Token, amt: bigint): TxStep => ({
      label: `Approve ${t.symbol}`,
      kind: "approve",
      address: t.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [npm, amt],
      skip: async () => amt === 0n || (await client.readContract({ address: t.address, abi: erc20Abi, functionName: "allowance", args: [address, npm] })) >= amt,
    });
    runner.run(
      [
        approve(t0, a0),
        approve(t1, a1),
        {
          label: `Add ${t0.symbol}/${t1.symbol} liquidity`,
          kind: "add-liquidity",
          address: npm,
          abi: positionManagerAbi,
          functionName: "mint",
          args: [
            {
              token0: t0.address,
              token1: t1.address,
              fee: pool.fee,
              tickLower: lower,
              tickUpper: upper,
              amount0Desired: a0,
              amount1Desired: a1,
              amount0Min: (a0 * slip) / 10_000n,
              amount1Min: (a1 * slip) / 10_000n,
              recipient: address,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
            },
          ],
        },
      ],
      4663,
    );
  };

  const busy = runner.state.phase === "sign" || runner.state.phase === "pending";

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold">Add liquidity</h3>
      <p className="mt-1 text-xs text-muted">Uniswap v3 · {pool.fee / 10_000}% fee tier</p>

      <div className="mt-4">
        <div className="mb-2 text-xs font-medium text-muted">Price range</div>
        <Segmented
          className="w-full [&>button]:flex-1"
          value={preset}
          onChange={setPreset}
          options={[
            { value: "full", label: "Full range" },
            { value: "wide", label: "±50%" },
            { value: "narrow", label: "±10%" },
          ]}
        />
        <div className="tabular mt-2.5 grid grid-cols-3 gap-2 text-center text-xs">
          {[
            ["Min", preset === "full" ? "0" : formatAmount(pLow, 5)],
            ["Current", formatAmount(pNow, 5)],
            ["Max", preset === "full" ? "∞" : formatAmount(pHigh, 5)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-surface-2 px-2 py-2">
              <div className="text-faint">{k}</div>
              <div className="mt-0.5 font-medium">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-center text-[11px] text-faint">{t1.symbol} per {t0.symbol}</p>
      </div>

      <div className="mt-4 space-y-2">
        {([0, 1] as const).map((side) => {
          const t = side === 0 ? t0 : t1;
          const bal = balances.get(t);
          return (
            <div key={side} className="rounded-2xl bg-surface-2 px-3.5 py-3">
              <div className="flex items-center gap-3">
                <input
                  inputMode="decimal"
                  placeholder="0"
                  value={display(side)}
                  onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setInput({ side, value: e.target.value })}
                  className="tabular min-w-0 flex-1 bg-transparent text-[22px] font-medium outline-none placeholder:text-faint"
                />
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <TokenIcon symbol={t.symbol} address={t.address} size={24} />
                  {t.symbol}
                </span>
              </div>
              {isConnected && bal !== undefined && <div className="tabular mt-1 text-right text-xs text-muted">Balance {formatTokenAmount(bal, t.decimals)}</div>}
            </div>
          );
        })}
      </div>
      {amounts && "error" in amounts && <Notice tone="warn" className="mt-3">{amounts.error}</Notice>}
      {runner.state.phase === "error" && <Notice tone="error" className="mt-3">{runner.state.message}</Notice>}
      {runner.state.phase === "done" && <Notice tone="ok" className="mt-3">Position created. It now appears under Your positions.</Notice>}

      {!isConnected ? (
        <Button variant="primary" size="lg" block className="mt-4" onClick={openWalletModal}>Connect wallet</Button>
      ) : wrongNetwork ? (
        <Button variant="soft" size="lg" block className="mt-4" disabled>Switch to Robinhood Chain</Button>
      ) : (
        <Button variant="primary" size="lg" block className="mt-4" disabled={!ok || !!insufficient || busy} loading={busy} onClick={submit}>
          {busy ? (runner.state.phase === "sign" ? "Confirm in wallet" : "Waiting for confirmation") : insufficient ? "Insufficient balance" : ok ? "Add liquidity" : "Enter an amount"}
        </Button>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        Positions are Uniswap v3 NFTs held in your wallet. Concentrated ranges earn more fees while in range but stop earning when price leaves it. Liquidity is subject to impermanent loss.
      </p>
    </div>
  );
}
