"use client";
import { UnifiedSwap } from "./UnifiedSwap";

/** Kept for existing imports: the swap card now covers same-network and cross-network swaps. */
export function SwapSwitch({ preset }: { preset?: "cross" }) {
  return <UnifiedSwap preset={preset} />;
}
