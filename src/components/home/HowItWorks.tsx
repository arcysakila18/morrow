import { IconCheck, IconShuffle, IconWallet } from "@/components/ui/Icons";
import { Reveal } from "./Reveal";

const STEPS = [
  { Icon: IconWallet, title: "Connect a wallet", body: "Use MetaMask, Rabby, any WalletConnect wallet, or sign in with email. Your keys never leave your wallet." },
  { Icon: IconShuffle, title: "Pick any token, on any network", body: "Same network or across networks, it is one swap. Morrow compares routes and shows what you will receive." },
  { Icon: IconCheck, title: "Review and sign once", body: "Every trade is simulated first. You approve only the exact amount, then sign in your own wallet." },
];

export function HowItWorks() {
  return (
    <div className="relative grid gap-4 md:grid-cols-3">
      <div aria-hidden className="absolute left-[16%] right-[16%] top-[52px] hidden h-px bg-gradient-to-r from-transparent via-lime/30 to-transparent md:block" />
      {STEPS.map(({ Icon, title, body }, i) => (
        <Reveal key={title} delay={i * 120}>
          <div className="relative h-full rounded-[28px] border border-line bg-surface/70 p-7 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-lime text-on-lime shadow-[0_0_32px_-8px_rgba(217,243,106,0.6)]">
                <Icon width={24} height={24} strokeWidth={2} />
              </span>
              <span className="tabular text-[44px] font-semibold leading-none tracking-[-0.04em] text-surface-3">0{i + 1}</span>
            </div>
            <h3 className="mt-7 text-[21px] font-semibold tracking-[-0.01em]">{title}</h3>
            <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
