"use client";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { erc20Abi } from "@/lib/abis";
import { isNative } from "@/lib/tokens/core";
import type { Token } from "@/lib/tokens/types";
import type { SupportedChainId } from "@/config/chains";

/** Live on-chain balances for a set of tokens on the given chain. */
export function useBalances(tokens: (Token | undefined)[], chainId: SupportedChainId) {
  const { address } = useAccount();
  const list = tokens.filter(Boolean) as Token[];
  const erc = list.filter((t) => !isNative(t));

  const native = useBalance({ address, chainId, query: { enabled: !!address, refetchInterval: 12_000 } });
  const reads = useReadContracts({
    contracts: erc.map((t) => ({ address: t.address, abi: erc20Abi, functionName: "balanceOf", args: [address!], chainId })),
    query: { enabled: !!address && erc.length > 0, refetchInterval: 12_000 },
  });

  const map = new Map<string, bigint>();
  if (native.data) map.set(list.find(isNative)?.address.toLowerCase() ?? "native", native.data.value);
  erc.forEach((t, i) => {
    const r = reads.data?.[i];
    if (r?.status === "success") map.set(t.address.toLowerCase(), r.result as bigint);
  });

  return {
    get: (t?: Token) => (t ? map.get(t.address.toLowerCase()) : undefined),
    refetch: () => {
      native.refetch();
      reads.refetch();
    },
    isLoading: native.isLoading || reads.isLoading,
  };
}
