"use client";
import { CopyButton } from "@/components/ui/misc";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { IconExternal } from "@/components/ui/Icons";
import { SITE } from "@/config/site";
import { chainName, explorerUrl } from "@/config/chains";
import { cn } from "@/lib/cn";
import { shortAddress } from "@/lib/format";

/** Official Morrow token contract (set in src/config/site.ts). Shows "Coming soon" until then. */
export function ContractAddress({ className }: { className?: string }) {
  const { address, chainId, buyUrl, buyLabel } = SITE.token;
  const live = /^0x[0-9a-fA-F]{40}$/.test(address);
  const buy = live && /^https?:\/\//.test(buyUrl);
  return (
    <div className={cn("inline-flex flex-wrap items-center justify-center gap-2", className)}>
    <div className={cn("inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/70 py-1.5 pl-1.5 pr-3 text-[13px] backdrop-blur")}>
      <span className="rounded-full bg-lime px-2.5 py-1 text-[11px] font-bold tracking-wide text-on-lime">CA</span>
      {live ? (
        <>
          <ChainLogo chainId={chainId} size={16} />
          <span className="font-mono text-ink" title={`${address} on ${chainName(chainId)}`}>
            <span className="hidden sm:inline">{address}</span>
            <span className="sm:hidden">{shortAddress(address, 6)}</span>
          </span>
          <CopyButton value={address} />
          <a href={explorerUrl(chainId, "token", address)} target="_blank" rel="noreferrer" aria-label="View on explorer" className="text-faint hover:text-ink">
            <IconExternal width={13} height={13} />
          </a>
        </>
      ) : (
        <span className="font-medium text-muted">Coming soon</span>
      )}
    </div>
    {buy && (
      <a
        href={buyUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-[13px] font-semibold text-on-lime transition hover:brightness-105"
      >
        {buyLabel} <IconExternal width={12} height={12} />
      </a>
    )}
    </div>
  );
}
