"use client";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { useAppChain } from "@/hooks/useAppChain";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { cn } from "@/lib/cn";
import type { MarketToken } from "@/lib/market/dexpaprika";

/** Slots around the hero. The first two also show on phones (above the headline). */
const SLOTS = [
  { pos: "left-[4%] top-[2%] md:left-[6%] md:top-[14%]", size: 40, md: 64, dur: 7, tilt: -8 },
  { pos: "right-[6%] top-[0%] md:right-[7%] md:top-[10%]", size: 34, md: 56, dur: 8.5, tilt: 6 },
  { pos: "hidden md:block md:left-[15%] md:top-[44%]", size: 0, md: 48, dur: 6.5, tilt: 4 },
  { pos: "hidden md:block md:right-[15%] md:top-[38%]", size: 0, md: 60, dur: 9, tilt: -5 },
  { pos: "hidden md:block md:left-[4%] md:top-[66%]", size: 0, md: 44, dur: 7.8, tilt: 8 },
  { pos: "hidden md:block md:right-[5%] md:top-[64%]", size: 0, md: 52, dur: 8.2, tilt: -6 },
  { pos: "hidden md:block md:left-[24%] md:top-[6%]", size: 0, md: 36, dur: 6.8, tilt: 5 },
  { pos: "hidden md:block md:right-[24%] md:top-[4%]", size: 0, md: 40, dur: 7.4, tilt: -4 },
];

/** Real logos of the most-traded tokens on the selected network, floating around the hero. */
export function HeroTokens() {
  const { marketChainId } = useAppChain();
  const q = useApi<{ tokens: MarketToken[] }>(`/api/market/tokens?order=volume&chainId=${marketChainId}`, { refetchInterval: 30_000 });
  const tokens = q.data?.tokens ?? [];
  if (!tokens.length) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {SLOTS.slice(0, tokens.length).map((s, i) => {
        const t = tokens[i];
        return (
          <div key={t.address} className={cn("absolute", s.pos)}>
            <div className="token-pop" style={{ animationDelay: `${500 + i * 110}ms` }}>
              <div className="anim-float" style={{ ["--dur" as string]: `${s.dur}s`, ["--delay" as string]: `${-i * 0.9}s` }}>
                <Link
                  href={`/explore/${t.address}`}
                  tabIndex={-1}
                  className="pointer-events-auto block rounded-full p-1 ring-1 ring-white/10 transition duration-300 hover:scale-110 hover:ring-lime/50"
                  style={{ transform: `rotate(${s.tilt}deg)`, background: "rgba(255,255,255,0.04)", boxShadow: "0 12px 40px -10px rgba(217,243,106,0.25)" }}
                >
                  <span className="block md:hidden"><TokenIcon symbol={t.symbol} address={t.address} size={s.size || 32} /></span>
                  <span className="hidden md:block"><TokenIcon symbol={t.symbol} address={t.address} size={s.md} /></span>
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
