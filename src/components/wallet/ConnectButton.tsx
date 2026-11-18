"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/misc";
import { IconExternal } from "@/components/ui/Icons";
import { explorerUrl } from "@/config/chains";
import { shortAddress } from "@/lib/format";
import { useAppChain } from "@/hooks/useAppChain";
import { openWalletModal } from "./WalletModal";

export function Avatar({ address, size = 22 }: { address: string; size?: number }) {
  // Deterministic, quiet two-tone disc derived from the address.
  const n = parseInt(address.slice(2, 10), 16);
  const angle = n % 360;
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: `conic-gradient(from ${angle}deg, #101114 0 50%, #D9F36A 50% 75%, #e9e9e4 75%)` }}
    />
  );
}

export function ConnectButton() {
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { chainId } = useAppChain();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!mounted || !isConnected || !address)
    return (
      <Button variant="primary" size="md" onClick={openWalletModal} className="rounded-full px-4">
        <span>
          Connect<span className="hidden sm:inline"> wallet</span>
        </span>
      </Button>
    );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface pl-1.5 pr-3.5 text-sm font-medium transition hover:border-line-strong"
      >
        <Avatar address={address} size={28} />
        <span className="tabular">{shortAddress(address)}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-72 animate-rise rounded-[20px] border border-line bg-surface p-2" style={{ boxShadow: "var(--shadow-pop)" }}>
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar address={address} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 font-mono text-[13px]">
                {shortAddress(address, 6)} <CopyButton value={address} />
              </div>
              <div className="text-xs text-muted">via {connector?.name ?? "wallet"}</div>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link href="/portfolio" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2">
            Portfolio
          </Link>
          <a href={explorerUrl(chainId, "address", address)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2">
            View on explorer <IconExternal width={14} height={14} className="text-faint" />
          </a>
          <button
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-down hover:bg-down/5"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
