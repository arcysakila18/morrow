"use client";
import Link from "next/link";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { Reveal } from "./Reveal";

const NETS: { id: number; name: string; note: string }[] = [
  { id: 4663, name: "Robinhood Chain", note: "Stock tokens" },
  { id: 1, name: "Ethereum", note: "Deepest liquidity" },
  { id: 8453, name: "Base", note: "Low fees" },
  { id: 42161, name: "Arbitrum", note: "Low fees" },
  { id: 56, name: "BNB Chain", note: "BNB ecosystem" },
];

/** The supported networks. */
export function Networks() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {NETS.map((n, i) => (
        <Reveal key={n.id} delay={i * 60}>
          <Link
            href="/bridge"
            className="group flex h-full flex-col items-start gap-4 rounded-[22px] border border-line bg-surface/70 p-4 backdrop-blur transition hover:-translate-y-0.5 hover:border-line-strong sm:p-5"
          >
            <span className="rounded-[14px] bg-paper/70 p-1.5 ring-1 ring-line transition group-hover:ring-lime/40">
              <ChainLogo chainId={n.id} size={32} />
            </span>
            <span>
              <span className="block text-[15px] font-semibold leading-tight">{n.name}</span>
              <span className="mt-1 block text-[13px] text-muted">{n.note}</span>
            </span>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
