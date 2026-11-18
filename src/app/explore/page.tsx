"use client";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useDebounced } from "@/hooks/useQuote";
import { Segmented } from "@/components/ui/misc";
import { IconSearch } from "@/components/ui/Icons";
import { TokenTable } from "@/components/explore/TokenTable";
import type { MarketToken } from "@/lib/market/dexpaprika";
import { useVerifiedSet } from "@/hooks/useVerified";
import { cn } from "@/lib/cn";
import { LiveBadge } from "@/components/ui/Live";

const MIN_LIQUIDITY = 10_000;

export default function ExplorePage() {
  const [tab, setTab] = useState<"volume" | "new">("volume");
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim(), 300);
  const list = useApi<{ tokens: MarketToken[] }>(dq.length >= 2 ? null : `/api/market/tokens?order=${tab}`, { refetchInterval: 30_000 });
  const search = useApi<{ tokens: MarketToken[] }>(dq.length >= 2 ? `/api/market/search?q=${encodeURIComponent(dq)}` : null);
  const active = dq.length >= 2 ? search : list;
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [hideLow, setHideLow] = useState(true);
  const { isVerified } = useVerifiedSet();
  const all = active.data?.tokens;
  const shown = all?.filter((t) => (!verifiedOnly || isVerified(t.address)) && (!hideLow || isVerified(t.address) || (t.liquidityUsd ?? 0) >= MIN_LIQUIDITY));
  const hidden = (all?.length ?? 0) - (shown?.length ?? 0);

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="flex items-center gap-3"><h1 className="text-[32px] font-semibold tracking-[-0.025em]">Explore</h1><LiveBadge /></div>
      <p className="mt-1.5 text-[15px] text-muted">Tokens trading on Robinhood Chain, ranked by on-chain activity.</p>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={tab}
          onChange={(v) => {
            setTab(v);
            setQ("");
          }}
          options={[
            { value: "volume", label: "Trending" },
            { value: "new", label: "Recently added" },
          ]}
        />
        <label className="flex h-11 w-full items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 focus-within:border-line-strong sm:w-80">
          <IconSearch width={18} height={18} className="text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tokens or paste address" className="w-full bg-transparent text-sm outline-none placeholder:text-faint" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[
          { on: verifiedOnly, set: setVerifiedOnly, label: "Verified only" },
          { on: hideLow, set: setHideLow, label: "Hide low liquidity" },
        ].map((f) => (
          <button
            key={f.label}
            onClick={() => f.set(!f.on)}
            aria-pressed={f.on}
            className={cn("h-8 rounded-full border px-3 text-[13px] font-medium transition", f.on ? "border-ink bg-ink text-paper" : "border-line bg-surface text-muted hover:text-ink")}
          >
            {f.label}
          </button>
        ))}
        {hidden > 0 && <span className="text-xs text-faint">{hidden} hidden</span>}
      </div>
      <div className="mt-3">
        <TokenTable tokens={shown} loading={active.isLoading} error={active.isError ? (active.error as Error).message : undefined} />
      </div>
      <p className="mt-3 text-[11px] text-faint">
        {tab === "volume" ? "Trending = highest 24h DEX volume." : "Recently added = tokens from the newest pools."} Data from DexPaprika, indexed from Robinhood Chain swaps. Low liquidity = under $10k (verified tokens always shown). Listing is not an endorsement.
      </p>
    </div>
  );
}
