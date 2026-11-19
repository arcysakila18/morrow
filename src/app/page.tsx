import { Suspense } from "react";
import { SwapSwitch } from "@/components/swap/SwapSwitch";
import { MarketStats } from "@/components/home/MarketStats";
import { FeatureCards } from "@/components/home/FeatureCards";
import { HeroTokens } from "@/components/home/HeroTokens";
import { LiveTicker } from "@/components/home/LiveTicker";
import { CtaBand } from "@/components/home/CtaBand";
import { Networks } from "@/components/home/Networks";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Faq } from "@/components/home/Faq";
import { SectionHeader } from "@/components/home/Section";
import { ContractAddress } from "@/components/home/ContractAddress";
import { SITE } from "@/config/site";

const SOURCES = ["Uniswap v3", "0x", "1inch", "LI.FI"];

export default function HomePage() {
  const words = SITE.tagline.split(" ");
  return (
    <div className="flex flex-col items-center overflow-x-clip pb-10">
      {/* Hero */}
      <section id="swap" className="relative w-full scroll-mt-20">
        <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-4 pt-20 sm:px-6 md:pt-20">
          <HeroTokens />
          <a href="/bridge" className="fade-up relative inline-flex items-center gap-2 rounded-full border border-lime/25 bg-lime/[0.08] py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium text-lime transition hover:border-lime/50">
            <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-semibold text-on-lime">New</span>
            Swap across networks in one step
            <span aria-hidden>→</span>
          </a>
          <h1 className="relative mt-6 max-w-[12ch] text-center text-[50px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[80px]">
            {words.map((w, i) => (
              <span key={i} className="word-rise" style={{ animationDelay: `${120 + i * 90}ms` }}>
                {i === words.length - 1 ? <span className="shimmer-text">{w}</span> : w}
                {i < words.length - 1 && " "}
              </span>
            ))}
          </h1>
          <p className="fade-up relative mt-5 max-w-[28rem] text-center text-[17px] leading-relaxed text-muted sm:text-[19px]" style={{ animationDelay: "380ms" }}>
            Stock tokens and crypto on five networks. Best route, one signature, <span className="text-ink">no added fee</span>.
          </p>
          <div className="fade-up relative mt-9 flex w-full justify-center" style={{ animationDelay: "520ms" }}>
            <div className="relative w-full max-w-[468px]">
              <div aria-hidden className="aurora" />
              <div className="relative">
                <Suspense>
                  <SwapSwitch />
                </Suspense>
              </div>
            </div>
          </div>
          <div className="fade-up relative mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-faint" style={{ animationDelay: "700ms" }}>
            <span>Routes from</span>
            {SOURCES.map((s) => (
              <span key={s} className="font-semibold tracking-tight text-muted">{s}</span>
            ))}
          </div>
          <div className="fade-up relative mt-5" style={{ animationDelay: "760ms" }}>
            <ContractAddress />
          </div>
        </div>
        <div className="fade-up mt-12" style={{ animationDelay: "850ms" }}>
          <LiveTicker />
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
        {/* Networks */}
        <section className="mt-28 sm:mt-36">
          <SectionHeader eyebrow="Networks" title={<>Five networks.<br /><span className="text-muted">One swap.</span></>} lead="Trade where your assets already are, or move them in the same step. Morrow never switches your wallet without asking." />
          <div className="mt-10">
            <Networks />
          </div>
        </section>

        {/* Market */}
        <section className="mt-28 sm:mt-36">
          <SectionHeader eyebrow="Live market" title={<>Real markets.<br /><span className="text-muted">Real routes.</span></>} lead="Every quote comes from live on-chain liquidity. No placeholder prices, no made-up volume." />
          <div className="mt-10">
            <MarketStats />
          </div>
        </section>

        {/* How it works */}
        <section className="mt-28 sm:mt-36">
          <SectionHeader center eyebrow="How it works" title="Three steps. Your keys the whole time." />
          <div className="mt-12">
            <HowItWorks />
          </div>
        </section>

        {/* Features */}
        <section className="mt-28 sm:mt-36">
          <SectionHeader eyebrow="Product" title={<>Built for every way<br />you trade</>} />
          <div className="mt-10">
            <FeatureCards />
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-28 max-w-3xl sm:mt-36">
          <SectionHeader center eyebrow="FAQ" title="Questions, answered." />
          <div className="mt-10">
            <Faq />
          </div>
        </section>

        <div className="mt-28 sm:mt-36">
          <CtaBand />
        </div>
      </div>
    </div>
  );
}
