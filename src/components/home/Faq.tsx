"use client";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Reveal } from "./Reveal";

const QA = [
  { q: "Is Morrow custodial?", a: "No. Morrow builds transactions; your wallet signs them. Morrow never asks for, receives or stores seed phrases or private keys, and never holds your funds." },
  { q: "What does it cost?", a: "Morrow adds no fee. You pay network gas plus the fees of the pool, aggregator or bridge that fills your trade. Every fee is shown before you sign." },
  { q: "How do cross-network swaps work?", a: "Pick a pay token on one network and a receive token on another. LI.FI finds a route through bridges and DEXs, you sign once on the source network, and Morrow tracks the transfer until it lands." },
  { q: "Which networks are supported?", a: "Robinhood Chain, Ethereum, Base, Arbitrum, BNB Chain and Solana. Stock tokens live on Robinhood Chain." },
  { q: "Has Morrow been audited?", a: "No. Morrow uses third-party smart contracts (Uniswap, 0x, 1inch, Jupiter, LI.FI) that it does not control. Only trade what you can afford to lose." },
  { q: "Is Morrow affiliated with Robinhood?", a: "No. Morrow is an independent interface and is not affiliated with, sponsored by, or endorsed by Robinhood Markets, Inc. or its affiliates." },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line overflow-hidden rounded-[28px] border border-line bg-surface/70 backdrop-blur">
      {QA.map((item, i) => {
        const isOpen = open === i;
        return (
          <Reveal key={item.q} delay={i * 50}>
            <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left sm:px-8 sm:py-6">
              <span className="text-[17px] font-semibold sm:text-[19px]">{item.q}</span>
              <span className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line transition duration-300", isOpen && "rotate-45 border-lime/50 bg-lime text-on-lime")}>
                <span className="absolute h-[1.5px] w-3.5 rounded bg-current" />
                <span className="absolute h-3.5 w-[1.5px] rounded bg-current" />
              </span>
            </button>
            <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <div className="overflow-hidden">
                <p className="px-6 pb-6 text-[15px] leading-relaxed text-muted sm:px-8 sm:text-[16px]">{item.a}</p>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
