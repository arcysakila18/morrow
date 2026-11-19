"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { IconAlert } from "@/components/ui/Icons";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Spinner";
import { AddressLink } from "@/components/ui/misc";
import { erc20Abi } from "@/lib/abis";
import type { Token } from "@/lib/tokens/types";
import type { SupportedChainId } from "@/config/chains";
import { customTokensStore } from "@/hooks/useTokenList";

/** Import an ERC-20 by address: metadata read on-chain, explicit risk acknowledgement. */
export function ImportToken({ address, chainId, onImported }: { address: `0x${string}`; chainId: SupportedChainId; onImported: (t: Token) => void }) {
  const client = usePublicClient({ chainId });
  const [ack, setAck] = useState(false);
  const q = useQuery({
    queryKey: ["import-token", chainId, address],
    queryFn: async () => {
      if (!client) throw new Error("No network client");
      const code = await client.getCode({ address });
      if (!code || code === "0x") throw new Error("No contract deployed at this address on this network.");
      const [symbol, name, decimals] = await Promise.all([
        client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
        client.readContract({ address, abi: erc20Abi, functionName: "name" }).catch(() => ""),
        client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
      ]);
      if (decimals > 36) throw new Error("Unsupported token decimals.");
      return { chainId, address, symbol: String(symbol).slice(0, 16), name: String(name || symbol).slice(0, 48), decimals: Number(decimals), source: "custom" } satisfies Token;
    },
    retry: false,
  });

  if (q.isLoading)
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
    );
  if (q.error || !q.data) return <p className="px-4 py-10 text-center text-sm text-down">{(q.error as Error)?.message ?? "This address is not a valid ERC-20 token."}</p>;

  const t = q.data;
  return (
    <div className="p-3">
      <div className="rounded-2xl border border-line p-4">
        <div className="flex items-center gap-3">
          <TokenIcon symbol={t.symbol} address={t.address} size={40} />
          <div>
            <div className="text-[15px] font-semibold">{t.symbol}</div>
            <div className="text-[13px] text-muted">{t.name}</div>
          </div>
        </div>
        <div className="mt-3">
          <AddressLink address={t.address} chainId={chainId} kind="token" chars={6} />
        </div>
      </div>
      <div className="mt-3 flex gap-2.5 rounded-2xl bg-warn/10 p-4 text-[13px] leading-relaxed text-warn">
        <IconAlert className="mt-0.5 shrink-0" width={18} height={18} />
        <div>
          This token isn&apos;t on Morrow&apos;s list. Anyone can create a token with any name, including fake versions of existing tokens. Make sure this is the token you want.
          <label className="mt-3 flex items-center gap-2 font-medium text-ink">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="h-4 w-4 accent-ink" />I understand the risk
          </label>
        </div>
      </div>
      <Button
        variant="ink"
        size="lg"
        block
        className="mt-3"
        disabled={!ack}
        onClick={() => {
          customTokensStore.set((list) => [...list.filter((x) => !(x.chainId === t.chainId && x.address === t.address)), t]);
          onImported(t);
        }}
      >
        Import {t.symbol}
      </Button>
    </div>
  );
}
