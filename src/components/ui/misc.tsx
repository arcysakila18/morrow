"use client";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { explorerUrl } from "@/config/chains";
import { shortAddress } from "@/lib/format";
import { IconCheck, IconCopy, IconExternal, IconInfo } from "./Icons";
import { useAppChain } from "@/hooks/useAppChain";

export function Tooltip({ content, children }: { content: ReactNode; children?: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children ?? <IconInfo width={14} height={14} className="text-faint" />}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-xs leading-relaxed text-paper opacity-0 shadow-lg transition group-hover:opacity-100">
        {content}
      </span>
    </span>
  );
}

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className={cn("rounded-md p-1 text-faint transition hover:bg-surface-2 hover:text-ink", className)}
      aria-label="Copy"
    >
      {done ? <IconCheck width={14} height={14} /> : <IconCopy width={14} height={14} />}
    </button>
  );
}

export function AddressLink({ address, chainId: chainIdProp, kind = "address", chars = 4, className }: { address: string; chainId?: number; kind?: "address" | "token" | "tx"; chars?: number; className?: string }) {
  const app = useAppChain();
  const chainId = chainIdProp ?? app.chainId;
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-[13px] text-muted", className)}>
      <a href={explorerUrl(chainId, kind, address)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
        {shortAddress(address, chars)}
        <IconExternal width={12} height={12} />
      </a>
      <CopyButton value={address} />
    </span>
  );
}

export function Change({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value == null || !Number.isFinite(value)) return <span className={cn("text-faint", className)}>—</span>;
  const up = value >= 0;
  return (
    <span className={cn("tabular inline-flex items-center gap-0.5", up ? "text-up" : "text-down", className)}>
      <svg viewBox="0 0 10 10" width="8" height="8" className={up ? "" : "rotate-180"} aria-hidden="true">
        <path d="M5 1.5 9 8H1Z" fill="currentColor" />
      </svg>
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

export function Notice({ tone = "neutral", children, className }: { tone?: "neutral" | "warn" | "error" | "ok"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-surface-2 text-muted",
    warn: "bg-warn/10 text-[#8a5a12]",
    error: "bg-down/10 text-down",
    ok: "bg-up/10 text-up",
  };
  return <div className={cn("rounded-2xl px-4 py-3 text-[13px] leading-relaxed", tones[tone], className)}>{children}</div>;
}

export function Segmented<T extends string>({ options, value, onChange, className }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-[14px] bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-8 rounded-[10px] px-3.5 text-[13px] font-medium transition",
            value === o.value ? "bg-surface text-ink shadow-[0_1px_2px_rgba(16,17,20,0.08)]" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 h-10 w-10 rounded-full border border-dashed border-line-strong" />
      <p className="text-[15px] font-medium">{title}</p>
      {body && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
