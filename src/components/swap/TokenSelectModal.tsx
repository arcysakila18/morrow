"use client";
import { useEffect, useMemo, useState } from "react";
import { getAddress, isAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { IconAlert, IconSearch } from "@/components/ui/Icons";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Spinner";
import { AddressLink } from "@/components/ui/misc";
import { erc20Abi } from "@/lib/abis";
import { cn } from "@/lib/cn";
import { formatTokenAmount, formatUsd } from "@/lib/format";
import { sameToken } from "@/lib/tokens/core";
import type { Token } from "@/lib/tokens/types";
import type { SupportedChainId } from "@/config/chains";
import { VerifiedBadge } from "@/components/ui/Verified";
import { customTokensStore } from "@/hooks/useTokenList";
import { useBalances } from "@/hooks/useBalances";
import { usePrices } from "@/hooks/usePrices";

export function TokenSelectModal({
  open,
  onClose,
  tokens,
  chainId,
  onSelect,
  selected,
  other: _other,
}: {
  open: boolean;
  onClose: () => void;
  tokens: Token[];
  chainId: SupportedChainId;
  onSelect: (t: Token) => void;
  selected?: Token;
  other?: Token;
}) {
  const [q, setQ] = useState("");
  useEffect(() => {
    if (open) setQ("");
  }, [open]);
  const { isConnected } = useAccount();
  const balances = useBalances(open ? tokens : [], chainId);
  const price = usePrices(open ? tokens.slice(0, 30) : [], chainId);

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = !query
      ? tokens
      : tokens.filter((t) => t.symbol.toLowerCase().includes(query) || t.name.toLowerCase().includes(query) || t.address.toLowerCase() === query);
    // Held tokens first (by USD value where known), then core, then the rest alphabetically.
    return [...list].sort((a, b) => {
      const ba = balances.get(a) ?? 0n;
      const bb = balances.get(b) ?? 0n;
      if ((ba > 0n) !== (bb > 0n)) return ba > 0n ? -1 : 1;
      if ((a.source === "core") !== (b.source === "core")) return a.source === "core" ? -1 : 1;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [tokens, query, balances]);

  const importAddr = isAddress(q.trim()) && !tokens.some((t) => t.address.toLowerCase() === query) ? getAddress(q.trim()) : null;
  const core = tokens.filter((t) => t.source === "core");

  const pick = (t: Token) => {
    onSelect(t);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Select a token">
      <div className="px-5 pt-2">
        <label className="flex h-12 items-center gap-2.5 rounded-2xl border border-line bg-surface-2 px-3.5 focus-within:border-line-strong focus-within:bg-surface">
          <IconSearch className="text-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, symbol or paste address"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {core.map((t) => (
            <button
              key={t.address}
              onClick={() => pick(t)}
              disabled={sameToken(t, selected)}
              className="flex h-9 items-center gap-2 rounded-full border border-line pl-1.5 pr-3 text-sm font-medium transition hover:bg-surface-2 disabled:opacity-40"
            >
              <TokenIcon symbol={t.symbol} address={t.address} src={t.logoURI} size={24} />
              {t.symbol}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 h-px bg-line" />
      <div className="min-h-[300px] flex-1 overflow-y-auto px-2 py-2">
        {importAddr ? (
          <ImportToken address={importAddr} chainId={chainId} onImported={pick} />
        ) : filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">No tokens match “{q}”. Paste a contract address to import.</p>
        ) : (
          filtered.map((t) => {
            const bal = balances.get(t);
            const p = price(t);
            const usd = bal !== undefined && p !== undefined ? (Number(bal) / 10 ** t.decimals) * p : undefined;
            const disabled = sameToken(t, selected);
            return (
              <button
                key={t.address}
                onClick={() => pick(t)}
                disabled={disabled}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-surface-2 disabled:opacity-40"
              >
                <TokenIcon symbol={t.symbol} address={t.address} src={t.logoURI} stock={t.source === "stock"} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[15px] font-medium">
                    {t.symbol}
                    {t.source !== "custom" && <VerifiedBadge size={13} />}
                    {t.source === "stock" && <span className="rounded-md bg-surface-3 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-muted">Stock</span>}
                    {t.source === "custom" && <span className="rounded-md bg-warn/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-warn">Imported</span>}
                    {t.stock?.halted && <span className="rounded-md bg-down/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-down">Halted</span>}
                  </span>
                  <span className="block truncate text-[13px] text-muted">{t.name}</span>
                </span>
                {isConnected && (
                  <span className="text-right">
                    {bal === undefined ? (
                      <Skeleton className="h-4 w-12" />
                    ) : bal > 0n ? (
                      <>
                        <span className="tabular block text-sm font-medium">{formatTokenAmount(bal, t.decimals, 5)}</span>
                        {usd !== undefined && <span className="tabular block text-xs text-muted">{formatUsd(usd)}</span>}
                      </>
                    ) : null}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
      <p className="border-t border-line px-5 py-3 text-[11px] leading-relaxed text-faint">
        Token list: Robinhood Chain core assets and the official Stock Token registry, validated on-chain. Anyone can create a token — verify addresses before trading.
      </p>
    </Modal>
  );
}

function ImportToken({ address, chainId, onImported }: { address: `0x${string}`; chainId: SupportedChainId; onImported: (t: Token) => void }) {
  const client = usePublicClient({ chainId });
  const [ack, setAck] = useState(false);
  const q = useQuery({
    queryKey: ["import-token", chainId, address],
    queryFn: async () => {
      if (!client) throw new Error("No network client");
      const code = await client.getCode({ address });
      if (!code || code === "0x") throw new Error("No contract deployed at this address on this network.");
      const [symbol, name, decimals] = await Promise.all([
        client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
        client.readContract({ address, abi: erc20Abi, functionName: "name" }).catch(() => ""),
        client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
      ]);
      if (decimals > 36) throw new Error("Unsupported token decimals.");
      return { chainId, address, symbol: String(symbol).slice(0, 16), name: String(name || symbol).slice(0, 48), decimals: Number(decimals), source: "custom" } satisfies Token;
    },
    retry: false,
  });

  if (q.isLoading)
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
    );
  if (q.error || !q.data) return <p className="px-4 py-10 text-center text-sm text-down">{(q.error as Error)?.message ?? "This address is not a valid ERC-20 token."}</p>;

  const t = q.data;
  return (
    <div className="p-3">
      <div className="rounded-2xl border border-line p-4">
        <div className="flex items-center gap-3">
          <TokenIcon symbol={t.symbol} address={t.address} size={40} />
          <div>
            <div className="text-[15px] font-semibold">{t.symbol}</div>
            <div className="text-[13px] text-muted">{t.name}</div>
          </div>
        </div>
        <div className="mt-3">
          <AddressLink address={t.address} chainId={chainId} kind="token" chars={6} />
        </div>
      </div>
      <div className="mt-3 flex gap-2.5 rounded-2xl bg-warn/10 p-4 text-[13px] leading-relaxed text-[#8a5a12]">
        <IconAlert className="mt-0.5 shrink-0" width={18} height={18} />
        <div>
          This token isn&apos;t on MORROW&apos;s list. Anyone can create a token with any name, including fake versions of existing tokens. Make sure this is the token you want.
          <label className="mt-3 flex items-center gap-2 font-medium text-ink">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="h-4 w-4 accent-ink" />I understand the risk
          </label>
        </div>
      </div>
      <Button
        variant="ink"
        size="lg"
        block
        className="mt-3"
        disabled={!ack}
        onClick={() => {
          customTokensStore.set((list) => [...list.filter((x) => !(x.chainId === t.chainId && x.address === t.address)), t]);
          onImported(t);
        }}
      >
        Import {t.symbol}
      </Button>
    </div>
  );
}
