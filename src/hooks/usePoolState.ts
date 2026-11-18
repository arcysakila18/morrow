"use client";
import { useQuery } from "@tanstack/react-query";
import { getAddress, isAddress, type Address } from "viem";
import { usePublicClient } from "wagmi";
import { erc20Abi, v3FactoryAbi, v3PoolAbi } from "@/lib/abis";
import { CONTRACTS } from "@/config/contracts";

export type PoolState = {
  address: Address;
  token0: { address: Address; symbol: string; decimals: number };
  token1: { address: Address; symbol: string; decimals: number };
  fee: number;
  tickSpacing: number;
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
};

/** Reads a pool on-chain and confirms it was created by the canonical Uniswap v3 factory. */
export function useUniswapV3Pool(address?: string) {
  const client = usePublicClient({ chainId: 4663 });
  return useQuery({
    queryKey: ["v3-pool", address],
    enabled: !!client && !!address && isAddress(address),
    refetchInterval: 15_000,
    queryFn: async (): Promise<PoolState | null> => {
      const pool = getAddress(address!);
      const factory = CONTRACTS[4663].uniswapV3!.factory;
      const code = await client!.getCode({ address: pool });
      if (!code || code === "0x") return null;
      try {
        const [t0, t1, fee, spacing, slot0, liq] = await Promise.all([
          client!.readContract({ address: pool, abi: v3PoolAbi, functionName: "token0" }),
          client!.readContract({ address: pool, abi: v3PoolAbi, functionName: "token1" }),
          client!.readContract({ address: pool, abi: v3PoolAbi, functionName: "fee" }),
          client!.readContract({ address: pool, abi: v3PoolAbi, functionName: "tickSpacing" }),
          client!.readContract({ address: pool, abi: v3PoolAbi, functionName: "slot0" }),
          client!.readContract({ address: pool, abi: v3PoolAbi, functionName: "liquidity" }),
        ]);
        const canonical = await client!.readContract({ address: factory, abi: v3FactoryAbi, functionName: "getPool", args: [t0, t1, fee] });
        if (canonical.toLowerCase() !== pool.toLowerCase()) return null;
        const meta = async (a: Address) => ({
          address: a,
          symbol: String(await client!.readContract({ address: a, abi: erc20Abi, functionName: "symbol" })),
          decimals: Number(await client!.readContract({ address: a, abi: erc20Abi, functionName: "decimals" })),
        });
        const [m0, m1] = await Promise.all([meta(t0), meta(t1)]);
        return { address: pool, token0: m0, token1: m1, fee: Number(fee), tickSpacing: Number(spacing), sqrtPriceX96: slot0[0], tick: Number(slot0[1]), liquidity: liq };
      } catch {
        return null; // not a v3 pool interface
      }
    },
  });
}
