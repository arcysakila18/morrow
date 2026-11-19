"use client";
import { useEffect, useRef, useState } from "react";
import { useSwitchChain } from "wagmi";
import { cn } from "@/lib/cn";
import { CHAIN_META, SUPPORTED_CHAINS, type SupportedChainId } from "@/config/chains";
import { IconAlert, IconCheck, IconChevronDown } from "@/components/ui/Icons";
import { Spinner } from "@/components/ui/Spinner";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { useAppChain, viewChainStore } from "@/hooks/useAppChain";
import { humanizeError } from "@/lib/errors";

/**
 * Shows the active network. Switching the wallet only happens on an explicit click.
 */
export function NetworkSelector() {
  const { chainId, wrongNetwork, isConnected } = useAppChain();
  const { switchChainAsync, isPending, variables } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const select = async (id: SupportedChainId) => {
    setErr(null);
    viewChainStore.set(id);
    if (!isConnected) {
      setOpen(false);
      return;
    }
    try {
      await switchChainAsync({ chainId: id });
      setOpen(false);
    } catch (e) {
      setErr(humanizeError(e));
    }
  };

  const showWrong = mounted && wrongNetwork;
  const mainnets = SUPPORTED_CHAINS.filter((c) => !CHAIN_META[c.id].testnet);
  const testnets = SUPPORTED_CHAINS.filter((c) => CHAIN_META[c.id].testnet);

  const row = (c: (typeof SUPPORTED_CHAINS)[number]) => {
    const pending = isPending && variables?.chainId === c.id;
    return (
      <button key={c.id} onClick={() => select(c.id)} disabled={isPending} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface-2">
        <ChainLogo chainId={c.id} size={26} />
        <span className="flex-1">
          <span className="block font-medium">{c.name}</span>
          <span className="block text-xs text-faint">Chain ID {c.id}</span>
        </span>
        {pending ? <Spinner className="h-4 w-4" /> : !showWrong && c.id === chainId && <IconCheck width={16} height={16} />}
      </button>
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 items-center gap-2 rounded-full border pl-1.5 pr-3 text-[13px] font-medium transition",
          showWrong ? "border-down/30 bg-down/5 pl-3 text-down" : "border-line bg-surface hover:border-line-strong",
        )}
        aria-label="Select network"
      >
        {showWrong ? <IconAlert width={16} height={16} /> : <ChainLogo chainId={chainId} size={28} />}
        <span className="hidden md:inline">{showWrong ? "Wrong network" : CHAIN_META[chainId].short}</span>
        <IconChevronDown width={14} height={14} className="text-faint" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 max-h-[70dvh] w-72 animate-rise overflow-y-auto rounded-[20px] border border-line bg-surface p-2" style={{ boxShadow: "var(--shadow-pop)" }}>
          {showWrong && <p className="px-3 pb-2 pt-2 text-xs leading-relaxed text-muted">Your wallet is on an unsupported network. Choose one to switch to.</p>}
          {mainnets.map(row)}
          <div className="mx-3 my-1.5 h-px bg-line" />
          {testnets.map(row)}
          {isConnected && <p className="px-3 pb-1 pt-2 text-[11px] leading-relaxed text-faint">Your wallet will ask you to approve the switch.</p>}
          {err && <p className="px-3 pb-2 text-xs text-down">{err}</p>}
        </div>
      )}
    </div>
  );
}
