"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, getAddress, isAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { AddressLink, CopyButton, EmptyState, Notice } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/Spinner";
import { IconExternal } from "@/components/ui/Icons";
import { Avatar } from "@/components/wallet/ConnectButton";
import { openWalletModal } from "@/components/wallet/WalletModal";
import { BLOCKSCOUT_API, SOLANA_ID, explorerUrl, getChain, type SupportedChainId } from "@/config/chains";
import { cn } from "@/lib/cn";
import { formatTokenAmount, formatUsd, shortAddress, timeAgo } from "@/lib/format";
import { txStore, updateTx } from "@/lib/tx/store";
import { useAppChain } from "@/hooks/useAppChain";
import { useTokenList } from "@/hooks/useTokenList";
import { useBalances } from "@/hooks/useBalances";
import { usePrices } from "@/hooks/usePrices";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { useSolanaPortfolio } from "@/hooks/useSolana";
import type { Token } from "@/lib/tokens/types";

type BsTokenBalance = { value: string; token: { address_hash?: string; address?: string; symbol: string; name: string; decimals: string | null; exchange_rate: string | null; icon_url: string | null; type: string } };
type BsTx = { hash: string; timestamp: string; status: "ok" | "error" | null; result: string; method: string | null; from: { hash: string }; to: { hash: string } | null; value: string; fee?: { value: string } };

const ALLOC_COLORS = ["#D9F36A", "#7cc4ff", "#b9a3ff", "#5fd6a8", "#ffb37a", "#6c6d73"];

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { chainId, isSolana } = useAppChain();
  const sol = useSolanaWallet();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (mounted && isSolana && sol.address) return <SolanaPortfolio owner={sol.address} />;
  if (!mounted || (isSolana ? !sol.address : !isConnected || !address))
    return (
      <div className="mx-auto max-w-[1200px] px-4 pt-14 sm:px-6">
        <h1 className="text-[32px] font-semibold tracking-[-0.025em]">Portfolio</h1>
        <div className="card mt-8">
          <EmptyState title="Connect a wallet to see your portfolio" body="Balances, allocation and activity are read directly from the chain." action={<Button variant="primary" size="lg" onClick={() => openWalletModal(isSolana ? "solana" : "any")}>{isSolana ? "Connect Solana wallet" : "Connect wallet"}</Button>} />
        </div>
      </div>
    );
  return <PortfolioView address={address!} chainId={chainId} />;
}

function PortfolioView({ address, chainId }: { address: `0x${string}`; chainId: SupportedChainId }) {
  const indexed = !!BLOCKSCOUT_API[chainId];
  const nativeSym = getChain(chainId).nativeCurrency;
  // 1) On-chain balances (native + every token Morrow lists on this chain): fast and always available.
  const { tokens } = useTokenList(chainId);
  const onchain = useBalances(tokens, chainId);
  // 2) The explorer adds tokens Morrow doesn't list. Never blocks the page.
  const balances = useQuery({
    queryKey: ["bs-balances", chainId, address],
    enabled: indexed,
    refetchInterval: 30_000,
    retry: 1,
    queryFn: async () => {
      const r = await fetch(`/api/explorer/addresses/${address}/token-balances?chainId=${chainId}`, { signal: AbortSignal.timeout(12_000) });
      if (!r.ok) throw new Error("Explorer balances unavailable");
      return (await r.json()) as BsTokenBalance[];
    },
  });
  const txs = useQuery({
    queryKey: ["bs-txs", chainId, address],
    enabled: indexed,
    refetchInterval: 30_000,
    retry: 1,
    queryFn: async () => {
      const r = await fetch(`/api/explorer/addresses/${address}/transactions?chainId=${chainId}`, { signal: AbortSignal.timeout(12_000) });
      if (!r.ok) throw new Error("Explorer history unavailable");
      return ((await r.json()).items ?? []) as BsTx[];
    },
  });

  type Holding = { address: string; symbol: string; name: string; decimals: number; raw: bigint; icon?: string; token?: Token };
  const holdings = useMemo(() => {
    const out = new Map<string, Holding>();
    for (const t of tokens) {
      const raw = onchain.get(t);
      if (raw && raw > 0n) out.set(t.address.toLowerCase(), { address: t.address, symbol: t.symbol, name: t.name, decimals: t.decimals, raw, icon: t.logoURI, token: t });
    }
    for (const b of balances.data ?? []) {
      const addr = (b.token?.address_hash ?? b.token?.address ?? "").toLowerCase();
      if (b.token?.type !== "ERC-20" || b.token.decimals == null || !isAddress(addr) || out.has(addr)) continue;
      const raw = BigInt(b.value || "0");
      if (raw > 0n) out.set(addr, { address: getAddress(addr), symbol: b.token.symbol, name: b.token.name, decimals: Number(b.token.decimals), raw, icon: b.token.icon_url ?? undefined });
    }
    return [...out.values()];
  }, [tokens, onchain, balances.data]);

  const price = usePrices(
    holdings.map((h) => h.token ?? ({ chainId, address: h.address, symbol: h.symbol, name: h.name, decimals: h.decimals, source: "custom" } as Token)),
    chainId,
  );
  const rows = holdings
    .map((h) => {
      const p = price(h.token ?? ({ chainId, address: h.address } as Token));
      return { ...h, price: p, usd: p != null ? Number(formatUnits(h.raw, h.decimals)) * p : undefined };
    })
    .sort((x, y) => (y.usd ?? -1) - (x.usd ?? -1));
  const loadingBalances = onchain.isLoading && !holdings.length;
  const priced = rows.filter((r) => r.usd != null);
  const total = priced.reduce((s, r) => s + (r.usd ?? 0), 0);
  const unpriced = rows.length - priced.length;

  return (
    <div className="mx-auto max-w-[1200px] overflow-x-clip px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar address={address} size={52} />
        <div>
          <div className="flex items-center gap-1 font-mono text-[15px]">{shortAddress(address, 6)} <CopyButton value={address} /></div>
          <a href={explorerUrl(chainId, "address", address)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
            View on explorer <IconExternal width={12} height={12} />
          </a>
        </div>
      </div>

      {!indexed && <Notice className="mt-6">Explorer history isn&apos;t available for {getChain(chainId).name}. Balances of listed tokens are read from the chain.</Notice>}

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="card min-w-0 p-6">
          <div className="text-[13px] text-muted">Total value</div>
          <div className="tabular mt-1 text-[44px] font-semibold leading-none tracking-[-0.03em]">
            {loadingBalances ? <Skeleton className="h-11 w-48" /> : priced.length ? formatUsd(total) : holdings.length ? "—" : formatUsd(0)}
          </div>
          {unpriced > 0 && <p className="mt-2 text-xs text-faint">Excludes {unpriced} token{unpriced > 1 ? "s" : ""} without a market price.</p>}
          {total > 0 && (
            <>
              <div className="mt-6 flex h-2.5 overflow-hidden rounded-full bg-surface-2">
                {priced.slice(0, 6).map((r, i) => (
                  <span key={r.address} style={{ width: `${((r.usd ?? 0) / total) * 100}%`, background: ALLOC_COLORS[i] }} />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                {priced.slice(0, 6).map((r, i) => (
                  <span key={r.address} className="tabular flex items-center gap-1.5 text-muted">
                    <span className="h-2 w-2 rounded-full" style={{ background: ALLOC_COLORS[i] }} />
                    {r.symbol} {(((r.usd ?? 0) / total) * 100).toFixed(1)}%
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <Activity txs={txs.data} loading={txs.isLoading} error={txs.isError} address={address} chainId={chainId} />
      </div>

      <h2 className="mt-10 text-[17px] font-semibold">Tokens</h2>
      <div className="card mt-4 overflow-hidden">
        {loadingBalances ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !rows.length ? (
          <EmptyState title="No tokens yet" body={`Bridge ${nativeSym.symbol} to ${getChain(chainId).name} to get started.`} action={<Link href="/bridge"><Button variant="outline">Open bridge</Button></Link>} />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="py-3.5 pl-5 text-left font-medium">Token</th>
                <th className="hidden py-3.5 pr-4 text-right font-medium sm:table-cell">Price</th>
                <th className="py-3.5 pr-4 text-right font-medium">Balance</th>
                <th className="py-3.5 pr-5 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.address} className="border-b border-line/70 last:border-0">
                  <td className="py-3 pl-5">
                    <div className="flex items-center gap-3">
                      <TokenIcon symbol={r.symbol} src={r.icon} address={r.address} chainId={chainId} size={32} />
                      <div className="min-w-0">
                        <div className="font-medium">{r.symbol}</div>
                        <div className="max-w-[160px] truncate text-xs text-muted">{r.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="tabular hidden py-3 pr-4 text-right text-muted sm:table-cell">{formatUsd(r.price)}</td>
                  <td className="tabular py-3 pr-4 text-right">{formatTokenAmount(r.raw, r.decimals)}</td>
                  <td className="tabular py-3 pr-5 text-right font-medium">{formatUsd(r.usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {balances.isError && <Notice className="mt-3">Balances of listed tokens are read directly from the chain. Unlisted tokens from the explorer are temporarily unavailable.</Notice>}
    </div>
  );
}

function Activity({ txs, loading, error, address, chainId }: { txs?: BsTx[]; loading: boolean; error: boolean; address: string; chainId: SupportedChainId }) {
  const local = txStore.use().filter((t) => t.from.toLowerCase() === address.toLowerCase() && t.chainId === chainId);
  const client = usePublicClient({ chainId });

  // Re-check any locally pending transactions against the chain.
  useEffect(() => {
    if (!client) return;
    local
      .filter((t) => t.status === "pending")
      .forEach((t) =>
        client
          .getTransactionReceipt({ hash: t.hash })
          .then((r) => updateTx(t.hash, { status: r.status === "success" ? "success" : "failed" }))
          .catch(() => {}),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, local.length]);

  const localHashes = new Set(local.map((t) => t.hash.toLowerCase()));
  const items = [
    ...local.slice(0, 8).map((t) => ({ hash: t.hash, label: t.summary, status: t.status, time: t.createdAt })),
    ...(txs ?? [])
      .filter((t) => !localHashes.has(t.hash.toLowerCase()))
      .slice(0, 10)
      .map((t) => ({
        hash: t.hash,
        label: t.method ? t.method.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase()) : t.to ? `To ${shortAddress(t.to.hash)}` : "Contract creation",
        status: t.status === "ok" ? ("success" as const) : t.status === "error" ? ("failed" as const) : ("pending" as const),
        time: Date.parse(t.timestamp),
      })),
  ]
    .sort((a, b) => b.time - a.time)
    .slice(0, 10);

  return (
    <div className="card min-w-0 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="shrink-0 text-[15px] font-semibold">Recent activity</h2>
        <AddressLink address={address} chainId={chainId} />
      </div>
      <div className="mt-3">
        {loading && !local.length ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : !items.length ? (
          <p className="py-8 text-center text-sm text-muted">{error ? "Activity is temporarily unavailable." : "No transactions yet."}</p>
        ) : (
          <ul className="divide-y divide-line/70">
            {items.map((t) => (
              <li key={t.hash}>
                <a href={explorerUrl(chainId, "tx", t.hash)} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-2.5 hover:opacity-80">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", t.status === "success" ? "bg-up" : t.status === "failed" ? "bg-down" : "animate-pulse bg-warn")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{t.label}</span>
                    <span className="block text-xs text-faint">
                      {t.status === "success" ? "Confirmed" : t.status === "failed" ? "Failed" : "Pending"} · {timeAgo(t.time)}
                    </span>
                  </span>
                  <IconExternal width={13} height={13} className="text-faint" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SolanaPortfolio({ owner }: { owner: string }) {
  const q = useSolanaPortfolio(owner);
  const rows = (q.data ?? [])
    .map((h) => ({ ...h, rawBig: BigInt(h.raw), usd: h.usdPrice != null ? Number(formatUnits(BigInt(h.raw), h.decimals)) * h.usdPrice : undefined }))
    .filter((h) => h.rawBig > 0n)
    .sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1));
  const priced = rows.filter((r) => r.usd != null);
  const total = priced.reduce((s, r) => s + (r.usd ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1200px] overflow-x-clip px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar address={owner} size={52} />
        <div>
          <div className="flex items-center gap-1 font-mono text-[15px]">{shortAddress(owner, 6)} <CopyButton value={owner} /></div>
          <a href={explorerUrl(SOLANA_ID, "address", owner)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
            View on Solscan <IconExternal width={12} height={12} />
          </a>
        </div>
      </div>
      <div className="card mt-8 p-6">
        <div className="text-[13px] text-muted">Total value · Solana</div>
        <div className="tabular mt-1 text-[44px] font-semibold leading-none tracking-[-0.03em]">{q.isLoading ? <Skeleton className="h-11 w-48" /> : formatUsd(total)}</div>
        {rows.length > priced.length && <p className="mt-2 text-xs text-faint">Excludes {rows.length - priced.length} token{rows.length - priced.length > 1 ? "s" : ""} without a market price.</p>}
      </div>
      <h2 className="mt-10 text-[17px] font-semibold">Tokens</h2>
      <div className="card mt-4 overflow-hidden">
        {q.isLoading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : q.isError ? (
          <EmptyState title="Balances unavailable" body="The Solana RPC couldn't be reached. Try again shortly." />
        ) : !rows.length ? (
          <EmptyState title="No tokens yet" body="Bridge assets to Solana to get started." action={<Link href="/bridge"><Button variant="outline">Open bridge</Button></Link>} />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="py-3.5 pl-5 text-left font-medium">Token</th>
                <th className="hidden py-3.5 pr-4 text-right font-medium sm:table-cell">Price</th>
                <th className="py-3.5 pr-4 text-right font-medium">Balance</th>
                <th className="py-3.5 pr-5 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.mint} className="border-b border-line/70 last:border-0">
                  <td className="py-3 pl-5">
                    <div className="flex items-center gap-3">
                      <TokenIcon symbol={r.symbol} src={r.logoURI} address={r.mint} chainId={SOLANA_ID} size={32} />
                      <div className="min-w-0">
                        <div className="font-medium">{r.symbol}</div>
                        <div className="max-w-[160px] truncate text-xs text-muted">{r.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="tabular hidden py-3 pr-4 text-right text-muted sm:table-cell">{formatUsd(r.usdPrice)}</td>
                  <td className="tabular py-3 pr-4 text-right">{formatTokenAmount(r.rawBig, r.decimals)}</td>
                  <td className="tabular py-3 pr-5 text-right font-medium">{formatUsd(r.usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-[11px] text-faint">Balances from the Solana RPC. Prices and logos from Jupiter.</p>
    </div>
  );
}
