"use client";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { erc20Abi, positionManagerAbi, v3FactoryAbi, v3PoolAbi } from "@/lib/abis";
import { CONTRACTS } from "@/config/contracts";

export type Position = {
  tokenId: bigint;
  token0: { address: Address; symbol: string; decimals: number };
  token1: { address: Address; symbol: string; decimals: number };
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
  pool: Address;
  sqrtPriceX96: bigint;
  tick: number;
};

const MAX_POSITIONS = 25;

/** Uniswap v3 positions (NonfungiblePositionManager NFTs) owned by the connected wallet. */
export function usePositions() {
  const { address, chainId } = useAccount();
  const client = usePublicClient({ chainId: 4663 });
  const uni = CONTRACTS[4663].uniswapV3!;
  return useQuery({
    queryKey: ["positions", address],
    enabled: !!address && !!client && chainId === 4663,
    refetchInterval: 30_000,
    queryFn: async (): Promise<Position[]> => {
      const c = client!;
      const n = await c.readContract({ address: uni.positionManager, abi: positionManagerAbi, functionName: "balanceOf", args: [address!] });
      const count = Math.min(Number(n), MAX_POSITIONS);
      const ids = await Promise.all(
        Array.from({ length: count }, (_, i) => c.readContract({ address: uni.positionManager, abi: positionManagerAbi, functionName: "tokenOfOwnerByIndex", args: [address!, BigInt(i)] })),
      );
      const raw = await Promise.all(ids.map((id) => c.readContract({ address: uni.positionManager, abi: positionManagerAbi, functionName: "positions", args: [id] })));
      const metaCache = new Map<string, Promise<{ address: Address; symbol: string; decimals: number }>>();
      const meta = (a: Address) => {
        if (!metaCache.has(a))
          metaCache.set(
            a,
            Promise.all([
              c.readContract({ address: a, abi: erc20Abi, functionName: "symbol" }),
              c.readContract({ address: a, abi: erc20Abi, functionName: "decimals" }),
            ]).then(([s, d]) => ({ address: a, symbol: String(s), decimals: Number(d) })),
          );
        return metaCache.get(a)!;
      };
      const out = await Promise.all(
        raw.map(async (p, i) => {
          const [, , token0, token1, fee, tickLower, tickUpper, liquidity, , , owed0, owed1] = p;
          if (liquidity === 0n && owed0 === 0n && owed1 === 0n) return null;
          const pool = await c.readContract({ address: uni.factory, abi: v3FactoryAbi, functionName: "getPool", args: [token0, token1, fee] });
          const [slot0, m0, m1] = await Promise.all([c.readContract({ address: pool, abi: v3PoolAbi, functionName: "slot0" }), meta(token0), meta(token1)]);
          return {
            tokenId: ids[i],
            token0: m0,
            token1: m1,
            fee: Number(fee),
            tickLower: Number(tickLower),
            tickUpper: Number(tickUpper),
            liquidity,
            tokensOwed0: owed0,
            tokensOwed1: owed1,
            pool,
            sqrtPriceX96: slot0[0],
            tick: Number(slot0[1]),
          } satisfies Position;
        }),
      );
      return out.filter((x): x is Position => !!x);
    },
  });
}
