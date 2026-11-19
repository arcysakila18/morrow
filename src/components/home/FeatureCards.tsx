"use client";
import Link from "next/link";
import type { MouseEvent, ReactNode, SVGProps } from "react";
import { useApi } from "@/hooks/useApi";
import { useAppChain } from "@/hooks/useAppChain";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { ChainLogo } from "@/components/ui/ChainLogo";
import { LogoMark } from "@/components/brand/Logo";
import { Change } from "@/components/ui/misc";
import { Flash } from "@/components/ui/Live";
import { Skeleton } from "@/components/ui/Spinner";
import { IconBridge, IconCompass, IconDrop, IconPie, IconSwapNav } from "@/components/ui/Icons";
import { useInView } from "@/components/home/Reveal";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MarketToken } from "@/lib/market/dexpaprika";
import { useVerifiedSet } from "@/hooks/useVerified";

type Tone = "lime" | "sky" | "violet" | "mint" | "peach";
const TONES: Record<Tone, { bg: string; text: string; hex: string }> = {
  lime: { bg: "bg-lime/[0.07] border-lime/15 hover:border-lime/35", text: "text-lime", hex: "#d9f36a" },
  sky: { bg: "bg-sky/[0.07] border-sky/15 hover:border-sky/35", text: "text-sky", hex: "#7cc4ff" },
  violet: { bg: "bg-violet/[0.08] border-violet/15 hover:border-violet/35", text: "text-violet", hex: "#b9a3ff" },
  mint: { bg: "bg-mint/[0.07] border-mint/15 hover:border-mint/35", text: "text-mint", hex: "#5fd6a8" },
  peach: { bg: "bg-peach/[0.07] border-peach/15 hover:border-peach/35", text: "text-peach", hex: "#ffb37a" },
};

function track(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

function Feature({
  tone, Icon, label, title, body, cta, href, visual, side, delay = 0, className,
}: {
  tone: Tone; Icon: (p: SVGProps<SVGSVGElement>) => ReactNode; label: string; title: ReactNode; body: string; cta: string; href: string; visual?: ReactNode; side?: boolean; delay?: number; className?: string;
}) {
  const t = TONES[tone];
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <article
      ref={ref}
      onMouseMove={track}
      className={cn(
        "reveal spotlight lift group flex flex-col overflow-hidden rounded-[32px] border p-7 sm:p-9",
        side && "md:grid md:grid-cols-2 md:items-center md:gap-10",
        inView && "is-shown",
        t.bg,
        className,
      )}
      style={{ transitionDelay: `${delay}ms, ${delay}ms, ${delay}ms, 0ms` }}
    >
      <div>
        <div className={cn("flex items-center gap-3 text-[17px] font-semibold", t.text)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper/60 transition-transform duration-500 group-hover:rotate-[-12deg] group-hover:scale-110">
            <Icon width={20} height={20} strokeWidth={2} />
          </span>
          {label}
        </div>
        <h3 className={cn("mt-6 text-[36px] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[46px]", t.text)}>{title}</h3>
        <p className={cn("mt-4 max-w-md text-[18px] leading-snug opacity-85 sm:text-[19px]", t.text)}>{body}</p>
        <div className="mt-8">
          <Link href={href} className={cn("group/cta inline-flex h-14 items-center gap-3 rounded-full bg-paper/90 px-7 text-[17px] font-semibold transition hover:bg-paper", t.text)}>
            {cta}
            <span aria-hidden className="text-[22px] leading-none transition-transform duration-300 group-hover/cta:translate-x-1.5">→</span>
          </Link>
        </div>
      </div>
      {visual && <div className={cn("mt-10", side && "md:mt-0")}>{visual}</div>}
    </article>
  );
}

/* ---------- Visuals ---------- */

const ROUTES = [
  { name: "Uniswap v3", d: "M40 120 C 140 120, 150 44, 240 44 S 340 120, 440 120", y: 44 },
  { name: "0x", d: "M40 120 C 140 120, 150 120, 240 120 S 340 120, 440 120", y: 120 },
  { name: "1inch", d: "M40 120 C 140 120, 150 196, 240 196 S 340 120, 440 120", y: 196 },
];

/** Diagram of how a quote is found: every source is checked and the best route wins. Illustrative, no prices. */
function RouteViz() {
  return (
    <div className="relative mx-auto w-full max-w-[480px]">
      <svg viewBox="0 0 480 240" className="w-full">
        {ROUTES.map((r, i) => (
          <g key={r.name}>
            <path d={r.d} fill="none" stroke="#d9f36a" strokeOpacity={i === 0 ? 0.9 : 0.22} strokeWidth={i === 0 ? 2.5 : 1.5} className="dash-flow" style={{ animationDuration: `${1 + i * 0.25}s` }} />
            {i === 0 && (
              <circle r="5" fill="#d9f36a">
                <animateMotion dur="2.6s" repeatCount="indefinite" path={r.d} />
              </circle>
            )}
          </g>
        ))}
        <circle cx="40" cy="120" r="18" fill="#16171a" stroke="#d9f36a" strokeOpacity=".5" />
        <circle cx="440" cy="120" r="18" fill="#d9f36a" />
        <path d="M433 120h14m-5-5 5 5-5 5" stroke="#101114" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M33 120h14m-5-5 5 5-5 5" stroke="#d9f36a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {ROUTES.map((r, i) => (
        <span
          key={r.name}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-semibold backdrop-blur",
            i === 0 ? "border-lime/50 bg-lime text-on-lime shadow-[0_0_24px_rgba(217,243,106,0.35)]" : "border-line bg-paper/80 text-muted",
          )}
          style={{ top: `${(r.y / 240) * 100}%` }}
        >
          {r.name}
          {i === 0 && <span className="ml-1.5 opacity-70">best</span>}
        </span>
      ))}
    </div>
  );
}

function LiveTokens() {
  const { marketChainId } = useAppChain();
  const q = useApi<{ tokens: MarketToken[] }>(`/api/market/tokens?order=volume&chainId=${marketChainId}`, { refetchInterval: 30_000 });
  const { isVerified } = useVerifiedSet();
  const verified = q.data?.tokens.filter((t) => isVerified(t.address) && t.priceUsd != null);
  if (q.isError || (verified && !verified.length)) return null;
  const list = verified?.slice(0, 3);
  return (
    <div className="space-y-2.5">
      {(list ?? [null, null, null]).map((t, i) =>
        t ? (
          <Link
            key={t.address}
            href={`/explore/${t.address}`}
            className="flex items-center gap-3 rounded-[22px] bg-paper/80 px-5 py-4 transition duration-300 hover:translate-x-1 hover:bg-paper"
          >
            <TokenIcon symbol={t.symbol} address={t.address} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold text-ink">{t.name}</div>
              <div className="text-[13px] text-muted">{t.symbol}</div>
            </div>
            <div className="text-right">
              <div className="tabular text-[16px] font-semibold text-ink">
                <Flash value={t.priceUsd} className="-mx-1 px-1">{formatUsd(t.priceUsd)}</Flash>
              </div>
              <Change value={t.change24h} className="text-[13px]" />
            </div>
          </Link>
        ) : (
          <div key={i} className="flex items-center gap-3 rounded-[22px] bg-paper/80 px-5 py-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ),
      )}
    </div>
  );
}

const BRIDGE_CHAINS = [4663, 1, 8453, 42161, 56];

/** The networks orbiting Morrow. */
function ChainOrbit() {
  const R = 104;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px]">
      <div className="absolute inset-[14%] rounded-full border border-dashed border-violet/30" />
      <div className="absolute inset-[34%] rounded-full bg-violet/10 blur-xl pulse-soft" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-violet/30 bg-paper/80"><LogoMark className="h-10 w-10" /></span>
      </div>
      <div className="anim-spin-slow absolute inset-0">
        {BRIDGE_CHAINS.map((id, i) => {
          const a = (i / BRIDGE_CHAINS.length) * Math.PI * 2;
          return (
            <div
              key={id}
              className="absolute left-1/2 top-1/2"
              style={{ transform: `translate(-50%, -50%) translate(${Math.cos(a) * R}px, ${Math.sin(a) * R}px)` }}
            >
              <div className="anim-spin-rev flex h-12 w-12 items-center justify-center rounded-full bg-paper/90 ring-1 ring-violet/25">
                <ChainLogo chainId={id} size={34} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Abstract concentrated-liquidity shape: bars rise in, the active range is highlighted. No figures. */
function LiquidityViz() {
  const n = 26;
  return (
    <div className="relative flex h-40 items-end gap-[5px] px-1">
      {Array.from({ length: n }).map((_, i) => {
        const x = (i - (n - 1) / 2) / (n / 4.2);
        const h = 12 + 88 * Math.exp(-x * x);
        const inRange = i >= 9 && i <= 16;
        return (
          <span
            key={i}
            className={cn("grow-bar flex-1 rounded-t-[6px]", inRange ? "bg-mint" : "bg-mint/20")}
            style={{ height: `${h}%`, transitionDelay: `${i * 35}ms` }}
          />
        );
      })}
      <span className="pulse-soft absolute bottom-0 left-1/2 top-0 w-px bg-ink/60" />
      <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-paper/90 px-2.5 py-0.5 text-[11px] font-semibold text-mint">Your range</span>
    </div>
  );
}

/** Abstract allocation ring drawing in. Illustrative only. */
function PortfolioViz() {
  const C = 2 * Math.PI * 60;
  const segs = [
    { f: 0.36, c: "#ffb37a" },
    { f: 0.26, c: "#d9f36a" },
    { f: 0.2, c: "#7cc4ff" },
    { f: 0.14, c: "#b9a3ff" },
  ];
  let acc = 0;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0 -rotate-90">
        <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
        {segs.map((s, i) => {
          const len = s.f * C - 4;
          const rot = acc * 360;
          acc += s.f;
          return (
            <circle
              key={i}
              cx="80"
              cy="80"
              r="60"
              fill="none"
              stroke={s.c}
              strokeWidth="18"
              strokeLinecap="round"
              strokeDasharray={`${len} ${C}`}
              className="draw-arc"
              style={{ ["--from" as string]: `${len}`, ["--to" as string]: "0", transform: `rotate(${rot}deg)`, transformOrigin: "80px 80px", transitionDelay: `${300 + i * 220}ms` }}
            />
          );
        })}
      </svg>
      <div className="flex-1 space-y-3">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ background: s.c }} />
            <span className="h-2.5 flex-1 rounded-full bg-paper/70" style={{ maxWidth: `${90 - i * 14}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Feature
        tone="lime"
        Icon={IconSwapNav}
        label="Swap"
        title={<>Best price.<br />Every swap.</>}
        body="Morrow checks Uniswap v3, 0x and 1inch, then simulates the trade before you sign."
        cta="Start swapping"
        href="/#swap"
        side
        visual={<RouteViz />}
        className="md:col-span-2"
      />
      <Feature tone="sky" Icon={IconCompass} label="Explore" title={<>Explore.<br />Swap. Repeat.</>} body="Live prices, volume and pools for every network, read from on-chain data." cta="Explore tokens" href="/explore" visual={<LiveTokens />} />
      <Feature tone="violet" Icon={IconBridge} label="Cross-network" title={<>Swap across<br />networks.</>} body="Pay on one network, receive on another, in one swap. Robinhood Chain, Ethereum, Base, Arbitrum and BNB Chain." cta="Try it" href="/bridge" visual={<ChainOrbit />} delay={120} />
      <Feature tone="mint" Icon={IconDrop} label="Liquidity" title={<>Provide liquidity,<br />earn fees.</>} body="Add liquidity to Uniswap v3 pools and track every position in one place." cta="View pools" href="/pools" visual={<LiquidityViz />} />
      <Feature tone="peach" Icon={IconPie} label="Portfolio" title={<>Everything you<br />hold. One view.</>} body="Balances read straight from the chain and valued at live market prices." cta="Open portfolio" href="/portfolio" visual={<PortfolioViz />} delay={120} />
    </div>
  );
}
