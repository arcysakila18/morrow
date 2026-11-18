"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { IconClose } from "./Icons";

/** Centered dialog on desktop, bottom sheet on mobile. */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-line bg-surface outline-none",
          "animate-sheet sm:animate-rise sm:rounded-[28px]",
          wide ? "sm:max-w-[560px]" : "sm:max-w-[440px]",
          className,
        )}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line-strong sm:hidden" />
        {title !== undefined && (
          <div className="flex items-center justify-between px-5 pb-2 pt-4 sm:pt-5">
            <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
            <button onClick={onClose} className="-mr-1.5 rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-ink" aria-label="Close">
              <IconClose />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
