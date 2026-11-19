"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getAddress, isAddress } from "viem";
import { useAccount } from "wagmi";
import { useQueries } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { ChainTokenIcon } from "@/components/ui/ChainTokenIcon";
import { VerifiedBadge } from "@/components/ui/Verified";
import { Skeleton } from "@/components/ui/Spinner";
import { IconCheck, IconChevronDown, IconSearch, IconShuffle, IconStar, IconTrend, IconWallet } from "@/components/ui/Icons";
import { ImportToken } from "./ImportToken";
import { SOLANA_ID, chainName, isSupportedChain, type AppChainId, type SupportedChainId } from "@/config/chains";
import { cn } from "@/lib/cn";
import { formatTokenAmount, formatUsd, shortAddress } from "@/lib/format";
import { MAINNETS, coreFor, marketToToken, nativeFor, sameAny, solToToken, tokenKey } from "@/lib/tokens/universal";
import type { Token } from "@/lib/tokens/types";
import type { MarketToken } from "@/lib/market/dexpaprika";
import { customTokensStore } from "@/hooks/useTokenList";
import { useBalances } from "@/hooks/useBalances";
import { usePrices } from "@/hooks/usePrices";
import { useDebounced } from "@/hooks/useQuote";
import { useAppChain } from "@/hooks/useAppChain";
import { useSolanaPortfolio, useSolanaTokens } from "@/hooks/useSolana";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";

type Filter = "all" | AppChainId;
const fetchJson = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `Request failed (${r.status})`);
  return j as T;
};

/**
 * One token picker for every network: search, a network filter, quick picks, swaps across
 * networks and the most-traded tokens. Picking a token on another network turns the swap
 * into a cross-network swap.
 */
export function UniversalTokenModal(props: { open: boolean; onClose: () => void; onSelect: (t: Token) => void; selected?: Token; title?: string }) {
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.title ?? "Select a token"}>
      {props.open && <Picker {...props} />}
    </Modal>
  );
}

function Picker({ onClose, onSelect, selected }: { onClose: () => void; onSelect: (t: Token) => void; selected?: Token }) {
  const app = useAppChain();
  const { isConnected } = useAccount();
  const sol = useSolanaWallet();
  const custom = customTokensStore.use();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const dq = useDebounced(q.trim(), 300);
  const searching = dq.length >= 2;

  const extra: AppChainId[] = MAINNETS.includes(app.marketChainId) ? [] : [app.marketChainId];
  const networks: AppChainId[] = [...MAINNETS, ...extra];
  const focus: AppChainId = filter === "all" ? app.marketChainId : filter;
  const chains: AppChainId[] = filter === "all" ? networks : [filter];
  const evmChains = chains.filter((c) => c !== SOLANA_ID) as SupportedChainId[];
  const includesSol = chains.includes(SOLANA_ID);

  // Official token registries (verified set + local search) for every EVM network in view.
  const registries = useQueries({
    queries: evmChains.map((c) => ({
      queryKey: ["token-registry", c],
      staleTime: 10 * 60_000,
      queryFn: () => fetchJson<{ tokens: Token[] }>(`/api/tokens?chainId=${c}`),
    })),
  });
  const registry = useMemo(() => {
    const m = new Map<number, Token[]>();
    evmChains.forEach((c, i) => m.set(c, [...(registries[i]?.data?.tokens ?? coreFor(c)), ...custom.filter((t) => t.chainId === c)]));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registries.map((r) => r.dataUpdatedAt).join(","), evmChains.join(","), custom]);

  const solList = useSolanaTokens(includesSol && searching ? dq : "");
  const solVerified = useSolanaTokens("");
  const verifiedKeys = useMemo(() => {
    const s = new Set<string>();
    registry.forEach((list) => list.forEach((t) => t.source !== "custom" && s.add(tokenKey(t))));
    (solVerified.data ?? []).forEach((t) => t.verified && s.add(`${SOLANA_ID}:${t.mint}`));
    coreFor(SOLANA_ID).forEach((t) => s.add(tokenKey(t)));
    return s;
  }, [registry, solVerified.data]);
  const isVerified = (t: Token) => verifiedKeys.has(tokenKey(t));

  // Most-traded tokens (DexPaprika) and market search, per network.
  const top = useQueries({
    queries: chains.map((c) => ({
      queryKey: ["api", `/api/market/tokens?order=volume&chainId=${c}`],
      staleTime: 30_000,
      queryFn: () => fetchJson<{ tokens: MarketToken[] }>(`/api/market/tokens?order=volume&chainId=${c}`),
    })),
  });
  const found = useQueries({
    queries: (searching ? chains.filter((c) => c !== SOLANA_ID) : []).map((c) => ({
      queryKey: ["api", `/api/market/search?q=${encodeURIComponent(dq)}&chainId=${c}`],
      staleTime: 60_000,
      queryFn: () => fetchJson<{ tokens: MarketToken[] }>(`/api/market/search?q=${encodeURIComponent(dq)}&chainId=${c}`),
    })),
  });

  // Balances on the focused network.
  const focusEvm = focus !== SOLANA_ID && isSupportedChain(focus) ? (focus as SupportedChainId) : undefined;
  const focusTokens = focusEvm ? registry.get(focusEvm) ?? [] : [];
  const balances = useBalances(isConnected && focusEvm ? focusTokens : [], focusEvm ?? 4663);
  const price = usePrices(isConnected && focusEvm ? focusTokens.slice(0, 40) : [], focusEvm ?? 4663);
  const solPf = useSolanaPortfolio(focus === SOLANA_ID ? sol.address : undefined);
  const balanceOf = (t: Token): bigint | undefined => {
    if (t.chainId === SOLANA_ID) {
      const h = solPf.data?.find((x) => x.mint === t.address);
      return h ? BigInt(h.raw) : undefined;
    }
    return t.chainId === focusEvm ? balances.get(t) : undefined;
  };

  const pick = (t: Token) => {
    onSelect(t);
    onClose();
  };

  const topTokens = useMemo(() => {
    const rows: { t: Token; v: number }[] = [];
    chains.forEach((c, i) =>
      (top[i]?.data?.tokens ?? []).slice(0, filter === "all" ? 8 : 30).forEach((m) => {
        const base = marketToToken(c, m, false);
        if (!base) return;
        const known = (c === SOLANA_ID ? [] : registry.get(c) ?? []).find((x) => sameAny(x, base));
        const t = known ?? { ...base, source: isVerified(base) ? "list" : "custom" } as Token;
        rows.push({ t, v: m.volume24hUsd ?? 0 });
      }),
    );
    const seen = new Set<string>();
    return rows
      .sort((a, b) => b.v - a.v)
      .filter((r) => (seen.has(tokenKey(r.t)) ? false : (seen.add(tokenKey(r.t)), true)))
      .slice(0, 30)
      .map((r) => r.t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top.map((x) => x.dataUpdatedAt).join(","), chains.join(","), registry, verifiedKeys]);

  const yourTokens = useMemo(() => {
    if (!isConnected && !sol.address) return [];
    if (focus === SOLANA_ID)
      return (solPf.data ?? []).filter((h) => BigInt(h.raw) > 0n).map((h) => solToToken({ mint: h.mint, symbol: h.symbol, name: h.name, decimals: h.decimals, logoURI: h.logoURI, verified: h.verified }));
    return focusTokens
      .filter((t) => (balances.get(t) ?? 0n) > 0n)
      .sort((a, b) => {
        const ua = (Number(balances.get(a) ?? 0n) / 10 ** a.decimals) * (price(a) ?? 0);
        const ub = (Number(balances.get(b) ?? 0n) / 10 ** b.decimals) * (price(b) ?? 0);
        return ub - ua;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, focusTokens, balances, solPf.data, isConnected, sol.address]);

  const results = useMemo(() => {
    if (!searching) return [];
    const ql = dq.toLowerCase();
    const out: Token[] = [];
    registry.forEach((list) => list.forEach((t) => (t.symbol.toLowerCase().includes(ql) || t.name.toLowerCase().includes(ql) || t.address.toLowerCase() === ql) && out.push(t)));
    if (includesSol) (solList.data ?? []).forEach((t) => out.push(solToToken(t)));
    const evmSearch = chains.filter((c) => c !== SOLANA_ID);
    evmSearch.forEach((c, i) =>
      (found[i]?.data?.tokens ?? []).forEach((m) => {
        const base = marketToToken(c, m, false);
        if (base) out.push({ ...base, source: isVerified(base) ? "list" : "custom" });
      }),
    );
    const seen = new Set<string>();
    const score = (t: Token) => (t.symbol.toLowerCase() === ql ? 0 : t.symbol.toLowerCase().startsWith(ql) ? 1 : 2) + (isVerified(t) ? 0 : 3);
    return out.filter((t) => (seen.has(tokenKey(t)) ? false : (seen.add(tokenKey(t)), true))).sort((a, b) => score(a) - score(b)).slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, dq, registry, solList.data, found.map((x) => x.dataUpdatedAt).join(","), verifiedKeys, chains.join(",")]);

  const searchLoading = searching && (found.some((f) => f.isLoading) || (includesSol && solList.isLoading));
  const importAddr = searching && focusEvm && filter !== "all" && isAddress(dq) && !results.some((t) => t.address.toLowerCase() === dq.toLowerCase()) && !searchLoading ? getAddress(dq) : null;

  const quick = coreFor(focus).slice(0, 5);
  const across = networks.filter((c) => c !== focus && MAINNETS.includes(c)).map((c) => nativeFor(c)).filter(Boolean);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-1 sm:px-5">
        <div className="flex h-14 items-center gap-2.5 rounded-[20px] bg-surface-2 pl-4 pr-1.5 focus-within:ring-1 focus-within:ring-line-strong">
          <IconSearch className="shrink-0 text-faint" width={22} height={22} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tokens"
            className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-faint"
          />
          <NetworkFilter value={filter} onChange={setFilter} networks={networks} />
        </div>
      </div>

      <div className="mt-3 min-h-[320px] flex-1 overflow-y-auto px-2 pb-3 sm:px-3">
        {searching ? (
          <>
            {importAddr ? (
              <ImportToken address={importAddr} chainId={focusEvm!} onImported={pick} />
            ) : results.length ? (
              <List tokens={results} pick={pick} selected={selected} isVerified={isVerified} balanceOf={balanceOf} />
            ) : searchLoading ? (
              <RowsSkeleton />
            ) : (
              <p className="px-4 py-12 text-center text-sm text-muted">
                No tokens match “{dq}”{filter === "all" ? "." : ` on ${chainName(filter)}.`}
                {filter !== "all" && focusEvm ? " Paste a contract address to import." : ""}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-2 px-2">
              {quick.map((t) => (
                <Tile key={tokenKey(t)} token={t} onClick={() => pick(t)} disabled={sameAny(t, selected)} />
              ))}
            </div>

            {filter === "all" && across.length > 0 && (
              <>
                <SectionTitle icon={<IconShuffle width={18} height={18} />}>Swap across networks</SectionTitle>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
                  {across.map((t) => (
                    <Tile key={tokenKey(t)} token={t} onClick={() => pick(t)} disabled={sameAny(t, selected)} className="w-[76px] shrink-0" sub={shortChain(t.chainId)} />
                  ))}
                </div>
              </>
            )}

            {yourTokens.length > 0 && (
              <>
                <SectionTitle icon={<IconWallet width={18} height={18} />}>Your tokens on {chainName(focus)}</SectionTitle>
                <List tokens={yourTokens} pick={pick} selected={selected} isVerified={isVerified} balanceOf={balanceOf} usdOf={(t) => {
                  const b = balanceOf(t);
                  const p = t.chainId === SOLANA_ID ? solPf.data?.find((h) => h.mint === t.address)?.usdPrice : price(t);
                  return b != null && p != null ? (Number(b) / 10 ** t.decimals) * p : undefined;
                }} />
              </>
            )}

            <SectionTitle icon={<IconTrend width={18} height={18} />}>Tokens by 24H volume</SectionTitle>
            {topTokens.length ? (
              <List tokens={topTokens} pick={pick} selected={selected} isVerified={isVerified} balanceOf={balanceOf} />
            ) : top.some((x) => x.isLoading) ? (
              <RowsSkeleton />
            ) : (
              <>
                <p className="px-4 pb-2 text-[13px] text-faint">Market data is unavailable right now. Popular tokens:</p>
                <List tokens={chains.flatMap((c) => coreFor(c))} pick={pick} selected={selected} isVerified={isVerified} balanceOf={balanceOf} />
              </>
            )}
          </>
        )}
      </div>
      <p className="border-t border-line px-5 py-3 text-[11px] leading-relaxed text-faint">
        <IconStar width={11} height={11} className="mr-1 inline -translate-y-px" />
        Verified tokens come from official registries (Robinhood Stock Tokens, Uniswap list, Jupiter). Anyone can create a token, so check the address before trading.
      </p>
    </div>
  );
}

const shortChain = (c: number) => (c === SOLANA_ID ? "Solana" : chainName(c).replace(" Mainnet", "").replace("Robinhood Chain", "Robinhood").replace("Arbitrum One", "Arbitrum").replace("BNB Smart Chain", "BNB"));

function NetworkFilter({ value, onChange, networks }: { value: Filter; onChange: (f: Filter) => void; networks: AppChainId[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Filter by network" className="flex h-11 items-center gap-1.5 rounded-[14px] px-2.5 transition hover:bg-surface-3">
        {value === "all" ? (
          <span className="grid grid-cols-2 gap-[2px]">
            {networks.slice(0, 4).map((c) => (
              <ChainLogo key={c} chainId={c} size={12} className="rounded-[3px]" />
            ))}
          </span>
        ) : (
          <ChainLogo chainId={value} size={24} />
        )}
        <IconChevronDown width={16} height={16} className="text-muted" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 animate-rise rounded-[18px] border border-line bg-surface p-1.5" style={{ boxShadow: "var(--shadow-pop)" }}>
          {(["all", ...networks] as Filter[]).map((c) => (
            <button
              key={String(c)}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] hover:bg-surface-2"
            >
              {c === "all" ? (
                <span className="grid h-6 w-6 grid-cols-2 gap-[2px]">
                  {networks.slice(0, 4).map((n) => (
                    <ChainLogo key={n} chainId={n} size={11} className="rounded-[3px]" />
                  ))}
                </span>
              ) : (
                <ChainLogo chainId={c} size={24} />
              )}
              <span className="flex-1 font-medium">{c === "all" ? "All networks" : chainName(c)}</span>
              {c === value && <IconCheck width={16} height={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-4 pb-2 pt-6 text-[15px] font-medium text-muted">
      {icon}
      {children}
    </div>
  );
}

function Tile({ token, onClick, disabled, className, sub }: { token: Token; onClick: () => void; disabled?: boolean; className?: string; sub?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={`${token.symbol} on ${chainName(token.chainId)}`}
      className={cn("flex flex-col items-center gap-1.5 rounded-[18px] bg-surface-2 px-1 py-3 transition hover:bg-surface-3 disabled:opacity-40", className)}
    >
      <ChainTokenIcon token={token} size={34} />
      <span className="max-w-full truncate text-[13px] font-semibold">{token.symbol}</span>
      {sub && <span className="-mt-1 max-w-full truncate text-[10px] text-faint">{sub}</span>}
    </button>
  );
}

function List({ tokens, pick, selected, isVerified, balanceOf, usdOf }: { tokens: Token[]; pick: (t: Token) => void; selected?: Token; isVerified: (t: Token) => boolean; balanceOf: (t: Token) => bigint | undefined; usdOf?: (t: Token) => number | undefined }) {
  return (
    <div>
      {tokens.map((t) => {
        const bal = balanceOf(t);
        const usd = usdOf?.(t);
        const native = t.address === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
        return (
          <button
            key={tokenKey(t)}
            onClick={() => pick(t)}
            disabled={sameAny(t, selected)}
            className="flex w-full items-center gap-3.5 rounded-[18px] px-3 py-2.5 text-left transition hover:bg-surface-2 disabled:opacity-40"
          >
            <ChainTokenIcon token={t} size={42} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[16px] font-semibold">
                <span className="truncate">{t.name}</span>
                {isVerified(t) && <VerifiedBadge size={14} />}
                {t.source === "stock" && <span className="rounded-md bg-surface-3 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-muted">Stock</span>}
                {t.stock?.halted && <span className="rounded-md bg-down/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-down">Halted</span>}
              </span>
              <span className="flex items-center gap-2 text-[13px] text-muted">
                <span className="font-medium">{t.symbol}</span>
                <span className="truncate text-faint">{native ? chainName(t.chainId) : shortAddress(t.address, 4)}</span>
              </span>
            </span>
            {bal != null && bal > 0n && (
              <span className="text-right">
                <span className="tabular block text-sm font-medium">{formatTokenAmount(bal, t.decimals, 5)}</span>
                {usd != null && <span className="tabular block text-xs text-muted">{formatUsd(usd)}</span>}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function RowsSkeleton() {
  return (
    <div className="space-y-1 px-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3.5 py-2.5">
          <Skeleton className="h-[42px] w-[42px] rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
