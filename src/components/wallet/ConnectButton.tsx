"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/misc";
import { IconExternal } from "@/components/ui/Icons";
import { explorerUrl } from "@/config/chains";
import { shortAddress } from "@/lib/format";
import { useAppChain } from "@/hooks/useAppChain";
import { disconnectSolana, useSolanaWallet } from "@/hooks/useSolanaWallet";
import { openWalletModal } from "./WalletModal";

export function Avatar({ address, size = 22 }: { address: string; size?: number }) {
  // Deterministic, quiet two-tone disc derived from the address.
  let n = 0;
  for (let i = 0; i < address.length; i++) n = (n * 31 + address.charCodeAt(i)) >>> 0;
  const angle = n % 360;
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: `conic-gradient(from ${angle}deg, #101114 0 50%, #D9F36A 50% 75%, #e9e9e4 75%)` }}
    />
  );
}

export function ConnectButton() {
  const evm = useAccount();
  const sol = useSolanaWallet();
  const { disconnect } = useDisconnect();
  const { ready, authenticated, logout, user } = usePrivy();
  const { marketChainId, isSolana } = useAppChain();
  const address = isSolana ? sol.address : evm.address;
  const isConnected = isSolana ? !!sol.address : evm.isConnected;
  const connector = isSolana ? { name: sol.wallet?.name ?? "Solana wallet" } : evm.connector;
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
      <Button variant="primary" size="md" onClick={() => openWalletModal(isSolana ? "solana" : "any")} loading={mounted && !ready && !isSolana} className="rounded-full px-4">
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
        <div className="fixed inset-x-3 top-[4.25rem] z-40 animate-rise rounded-[20px] border border-line bg-surface p-2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-72" style={{ boxShadow: "var(--shadow-pop)" }}>
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar address={address} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 font-mono text-[13px]">
                {shortAddress(address, 6)} <CopyButton value={address} />
              </div>
              <div className="truncate text-xs text-muted">{user?.email?.address ? `${user.email.address} · ` : ""}via {connector?.name ?? "wallet"}</div>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          {!isSolana && !sol.address && (
            <button onClick={() => { setOpen(false); openWalletModal("solana"); }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface-2">
              Connect a Solana wallet
            </button>
          )}
          <Link href="/portfolio" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2">
            Portfolio
          </Link>
          <a href={explorerUrl(marketChainId, "address", address)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-surface-2">
            View on explorer <IconExternal width={14} height={14} className="text-faint" />
          </a>
          <button
            onClick={async () => {
              setOpen(false);
              if (isSolana) return void (await disconnectSolana());
              if (evm.isConnected) disconnect();
              if (authenticated) await logout();
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
