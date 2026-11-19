"use client";
import { formatUnits } from "viem";
import { cn } from "@/lib/cn";
import { formatTokenAmount, formatUsd } from "@/lib/format";
import { ChainTokenIcon } from "@/components/ui/ChainTokenIcon";
import { IconChevronDown } from "@/components/ui/Icons";
import { Skeleton } from "@/components/ui/Spinner";
import type { Token } from "@/lib/tokens/types";

export function TokenField({
  label,
  token,
  value,
  onChange,
  onSelectToken,
  balance,
  usdValue,
  onMax,
  readOnly,
  loading,
  dim,
}: {
  label: string;
  token?: Token;
  value: string;
  onChange?: (v: string) => void;
  onSelectToken: () => void;
  balance?: bigint;
  usdValue?: number;
  onMax?: () => void;
  readOnly?: boolean;
  loading?: boolean;
  dim?: boolean;
}) {
  return (
    <div className={cn("group rounded-[20px] border border-transparent px-4 pb-3.5 pt-3.5 transition", readOnly ? "bg-surface-2" : "bg-surface-2 focus-within:border-line-strong focus-within:bg-surface")}>
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {loading ? (
            <Skeleton className="h-9 w-40 rounded-lg" />
          ) : (
            <input
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              placeholder="0"
              value={value}
              readOnly={readOnly}
              onChange={(e) => {
                const v = e.target.value.replace(/,/g, ".");
                if (/^\d*\.?\d*$/.test(v) && v.length <= 32) onChange?.(v);
              }}
              className={cn(
                "tabular w-full bg-transparent text-[34px] font-medium leading-none tracking-tight outline-none placeholder:text-faint/70",
                dim && "text-muted",
              )}
              aria-label={`${label} amount`}
            />
          )}
        </div>
        <button
          onClick={onSelectToken}
          className={cn(
            "flex h-11 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-3 text-[15px] font-semibold transition",
            token ? "border border-line bg-surface hover:border-line-strong" : "bg-lime pl-4 text-on-lime hover:bg-lime-deep",
          )}
        >
          {token && <ChainTokenIcon token={token} size={30} />}
          {token ? token.symbol : "Select token"}
          <IconChevronDown width={16} height={16} className={token ? "text-faint" : "text-on-lime/70"} />
        </button>
      </div>
      <div className="mt-2.5 flex h-5 items-center justify-between text-[13px] text-muted">
        <span className="tabular">{usdValue != null && value ? formatUsd(usdValue) : ""}</span>
        {token && balance !== undefined && (
          <span className="flex items-center gap-1.5">
            <span className="tabular">Balance {formatTokenAmount(balance, token.decimals)}</span>
            {onMax && balance > 0n && value !== formatUnits(balance, token.decimals) && (
              <button onClick={onMax} className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink hover:bg-lime hover:text-on-lime">
                Max
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
