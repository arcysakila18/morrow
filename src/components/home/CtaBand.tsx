import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";
import { Reveal } from "@/components/home/Reveal";

export function CtaBand() {
  return (
    <Reveal className="w-full">
      <section className="relative overflow-hidden rounded-[36px] border border-lime/20 bg-surface px-6 py-16 text-center sm:px-10 sm:py-24">
        <div aria-hidden className="aurora !inset-[-40%] !opacity-30" />
        <div aria-hidden className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "18px 18px", maskImage: "radial-gradient(ellipse at center, #000 20%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at center, #000 20%, transparent 70%)" }} />
        <div className="relative">
          <div className="anim-float mx-auto w-fit" style={{ ["--dur" as string]: "6s" }}>
            <LogoMark className="h-16 w-16" />
          </div>
          <h2 className="mx-auto mt-6 max-w-[14ch] text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[64px]">
            Ready when <span className="shimmer-text">you are.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[18px] leading-relaxed text-muted">Connect a wallet and trade in seconds. No account, no custody.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/#swap" className="group inline-flex h-14 items-center gap-3 rounded-full bg-lime px-8 text-[17px] font-semibold text-on-lime shadow-[0_0_40px_-6px_rgba(217,243,106,0.6)] transition hover:bg-lime-deep">
              Launch swap
              <span aria-hidden className="text-[22px] leading-none transition-transform group-hover:translate-x-1.5">→</span>
            </Link>
            <Link href="/explore" className="inline-flex h-14 items-center rounded-full border border-line-strong px-8 text-[17px] font-semibold transition hover:bg-surface-2">
              Explore tokens
            </Link>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
