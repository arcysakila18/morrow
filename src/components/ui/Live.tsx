"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useIsLive } from "@/hooks/useLive";

/** Small "Live" pill: pulses while new blocks are arriving; shows the latest block on hover. */
export function LiveBadge({ className }: { className?: string }) {
  const { block, live } = useIsLive();
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      title={block ? `Latest block #${block.toString()}` : "Connecting to Robinhood Chain"}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", live ? "bg-up/10 text-up" : "bg-surface-2 text-faint", className)}
    >
      <span className="relative flex h-1.5 w-1.5">
        {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-60" />}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", live ? "bg-up" : "bg-faint")} />
      </span>
      {live ? "Live" : "Syncing"}
    </span>
  );
}

/** Briefly tints a value green/red when it moves. */
export function Flash({ value, children, className }: { value: number | null | undefined; children: React.ReactNode; className?: string }) {
  const prev = useRef(value);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (value != null && prev.current != null && value !== prev.current) {
      setDir(value > prev.current ? "up" : "down");
      const id = setTimeout(() => setDir(null), 900);
      prev.current = value;
      return () => clearTimeout(id);
    }
    prev.current = value;
  }, [value]);
  return (
    <span className={cn("rounded-md transition-colors duration-700", dir === "up" && "bg-up/12 text-up", dir === "down" && "bg-down/12 text-down", className)}>
      {children}
    </span>
  );
}
