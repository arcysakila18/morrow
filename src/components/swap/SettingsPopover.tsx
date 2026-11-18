"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { IconSettings } from "@/components/ui/Icons";
import { Tooltip } from "@/components/ui/misc";
import { create } from "@/hooks/store";

export type SwapSettings = { slippageBps: number; auto: boolean; infiniteApproval: boolean };
export const DEFAULT_SLIPPAGE_BPS = 50;
export const settingsStore = create<SwapSettings>({ slippageBps: DEFAULT_SLIPPAGE_BPS, auto: true, infiniteApproval: false }, "morrow:settings");

const PRESETS = [10, 50, 100];

export function SettingsPopover() {
  const s = settingsStore.use();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const set = (patch: Partial<SwapSettings>) => settingsStore.set({ ...s, ...patch });
  const pct = s.slippageBps / 100;
  const warn = s.slippageBps > 300 ? "High slippage increases the risk of an unfavourable trade." : s.slippageBps < 10 ? "Very low slippage may cause the transaction to fail." : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn("flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink", open && "bg-surface-2 text-ink")}
        aria-label="Swap settings"
      >
        {!s.auto && <span className={cn("tabular", s.slippageBps > 300 && "text-warn")}>{pct}% slippage</span>}
        <IconSettings />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-[332px] animate-rise rounded-[20px] border border-line bg-surface p-4" style={{ boxShadow: "var(--shadow-pop)" }}>
          <div className="flex items-center gap-1.5 text-[13px] font-medium">
            Max slippage
            <Tooltip content="Your transaction reverts if the price moves unfavourably by more than this percentage." />
          </div>
          <div className="mt-3 flex gap-1.5">
            <button
              onClick={() => set({ auto: true, slippageBps: DEFAULT_SLIPPAGE_BPS })}
              className={cn("h-9 shrink-0 rounded-xl px-3 text-[13px] font-medium", s.auto ? "bg-ink text-paper" : "bg-surface-2 hover:bg-surface-3")}
            >
              Auto
            </button>
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  set({ auto: false, slippageBps: p });
                  setCustom("");
                }}
                className={cn("tabular h-9 flex-1 rounded-xl text-[13px] font-medium", !s.auto && s.slippageBps === p && !custom ? "bg-ink text-paper" : "bg-surface-2 hover:bg-surface-3")}
              >
                {p / 100}%
              </button>
            ))}
            <div className={cn("flex h-9 w-[84px] shrink-0 items-center rounded-xl bg-surface-2 px-2.5", custom && "ring-1 ring-ink")}>
              <input
                value={custom}
                inputMode="decimal"
                placeholder="Custom"
                onChange={(e) => {
                  const v = e.target.value;
                  if (!/^\d*\.?\d{0,2}$/.test(v)) return;
                  setCustom(v);
                  const n = Math.round(parseFloat(v) * 100);
                  if (n >= 1 && n <= 5000) set({ auto: false, slippageBps: n });
                }}
                className="tabular w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
              />
              <span className="text-[13px] text-faint">%</span>
            </div>
          </div>
          {warn && <p className="mt-2.5 text-xs text-warn">{warn}</p>}

          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[13px] font-medium">
              Unlimited approvals
              <Tooltip content="Off (recommended): approve only the exact amount for each swap. On: one approval per token and router, but a larger allowance stays open." />
            </div>
            <button
              role="switch"
              aria-checked={s.infiniteApproval}
              onClick={() => set({ infiniteApproval: !s.infiniteApproval })}
              className={cn("relative h-6 w-10 rounded-full transition", s.infiniteApproval ? "bg-ink" : "bg-surface-3")}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition", s.infiniteApproval ? "left-[18px]" : "left-0.5")} />
            </button>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-faint">Uniswap routes use a 20-minute transaction deadline.</p>
        </div>
      )}
    </div>
  );
}
