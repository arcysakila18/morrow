import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "ink" | "soft" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary: "bg-lime text-ink hover:bg-lime-deep disabled:bg-surface-2 disabled:text-faint",
  ink: "bg-ink text-paper hover:bg-ink-2 disabled:bg-surface-2 disabled:text-faint",
  soft: "bg-surface-2 text-ink hover:bg-surface-3 disabled:text-faint",
  ghost: "bg-transparent text-ink hover:bg-surface-2 disabled:text-faint",
  outline: "bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-2 disabled:text-faint",
  danger: "bg-down/10 text-down hover:bg-down/15",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-[10px] gap-1.5",
  md: "h-10 px-4 text-sm rounded-[12px] gap-2",
  lg: "h-12 px-5 text-[15px] rounded-[14px] gap-2",
  xl: "h-14 px-6 text-base rounded-[18px] gap-2.5",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; block?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "ink", size = "md", loading, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.985] disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});
