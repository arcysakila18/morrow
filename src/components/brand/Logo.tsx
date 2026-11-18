import { cn } from "@/lib/cn";

const LOGO_SRC = "/logo-mark.png";

/** MORROW leaf mark (public/logo-mark.png), transparent background. */
export function LogoMark({ className }: { className?: string; inverted?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={LOGO_SRC} alt="" width={36} height={36} className={cn("h-9 w-9 object-contain", className)} />
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("text-[15px] font-semibold tracking-[0.18em]", inverted ? "text-paper" : "text-ink")}>MORROW</span>
    </span>
  );
}
