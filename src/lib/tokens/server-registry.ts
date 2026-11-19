import "server-only";
import { createPublicClient, getAddress, http, isAddress, type Address, type PublicClient } from "viem";
import { erc20Abi } from "@/lib/abis";
import { getChain, type SupportedChainId } from "@/config/chains";
import { CONTRACTS } from "@/config/contracts";
import { serverRpc } from "@/config/server-env";
import { coreTokens } from "./core";
import type { Token } from "./types";

const STOCK_API = "https://api.robinhood.com/rhj/assets";
/** Uniswap Labs default token list (official, includes logoURI for each token). */
const UNISWAP_LIST = "https://tokens.uniswap.org";

type RhAsset = {
  tokenSymbol?: string;
  name?: string;
  status?: string;
  isTradingHalt?: boolean;
  deployments?: Array<{ contractAddress?: string; chainId?: number | string }>;
};

const clients = new Map<number, PublicClient>();
export function serverClient(chainId: SupportedChainId): PublicClient {
  if (!clients.has(chainId)) clients.set(chainId, createPublicClient({ chain: getChain(chainId), transport: http(serverRpc(chainId)) }) as PublicClient);
  return clients.get(chainId)!;
}

export const ipfsToHttps = (u?: string) => (u?.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${u.slice(7)}` : u);

export async function readErc20Meta(chainId: SupportedChainId, addresses: Address[]) {
  const client = serverClient(chainId);
  const out = new Map<Address, { symbol: string; name: string; decimals: number }>();
  const mc = CONTRACTS[chainId].multicall3;
  const hasMulticall = mc ? !!(await client.getCode({ address: mc }).catch(() => undefined)) : false;

  const calls = addresses.flatMap((address) => [
    { address, abi: erc20Abi, functionName: "symbol" as const },
    { address, abi: erc20Abi, functionName: "name" as const },
    { address, abi: erc20Abi, functionName: "decimals" as const },
  ]);

  let results: Array<{ status: "success" | "failure"; result?: unknown }>;
  if (hasMulticall) {
    results = await client.multicall({ contracts: calls, allowFailure: true, multicallAddress: mc! });
  } else {
    results = await Promise.all(
      calls.map((c) =>
        client
          .readContract(c as never)
          .then((result) => ({ status: "success" as const, result }))
          .catch(() => ({ status: "failure" as const })),
      ),
    );
  }
  addresses.forEach((address, i) => {
    const [s, n, d] = results.slice(i * 3, i * 3 + 3);
    if (s?.status === "success" && d?.status === "success")
      out.set(address, { symbol: String(s.result), name: n?.status === "success" ? String(n.result) : String(s.result), decimals: Number(d.result) });
  });
  return out;
}

/** Stock Tokens from Robinhood's official Stock Token API, confirmed on-chain. */
async function fetchStockTokens(chainId: SupportedChainId): Promise<Token[]> {
  const res = await fetch(STOCK_API, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Stock Token API ${res.status}`);
  const json = await res.json();
  const assets: RhAsset[] = Array.isArray(json) ? json : json.assets ?? json.results ?? json.data ?? [];
  const candidates = assets.flatMap((a) => {
    const dep = a.deployments?.find((d) => Number(d.chainId) === chainId && d.contractAddress && isAddress(d.contractAddress));
    return dep ? [{ asset: a, address: getAddress(dep.contractAddress!) }] : [];
  });
  if (!candidates.length) return [];
  const meta = await readErc20Meta(chainId, candidates.map((c) => c.address));
  return candidates.flatMap(({ asset, address }) => {
    const m = meta.get(address);
    if (!m) return [];
    return [{
      chainId, address, symbol: m.symbol, name: asset.name || m.name, decimals: m.decimals, source: "stock" as const,
      stock: { underlying: asset.tokenSymbol ?? m.symbol, halted: !!asset.isTradingHalt, status: asset.status ?? "ASSET_STATUS_UNSPECIFIED" },
    }];
  });
}

type ListToken = { chainId: number; address: string; symbol: string; name: string; decimals: number; logoURI?: string };

/** The Uniswap default token list, cached for a day. */
export async function getUniswapList(): Promise<ListToken[]> {
  const r = await fetch(UNISWAP_LIST, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`Uniswap token list ${r.status}`);
  return ((await r.json()).tokens ?? []) as ListToken[];
}

export async function getTokenRegistry(chainId: SupportedChainId) {
  const core = coreTokens(chainId);
  const errors: string[] = [];
  const extra: Token[] = [];

  if (chainId === 4663) {
    try {
      extra.push(...(await fetchStockTokens(chainId)));
    } catch (e) {
      errors.push(`Stock Token registry unavailable: ${(e as Error).message}`);
    }
  } else if (chainId !== 46630) {
    try {
      const seen = new Set(core.map((t) => t.address.toLowerCase()));
      for (const t of await getUniswapList()) {
        if (t.chainId !== chainId || !isAddress(t.address) || seen.has(t.address.toLowerCase())) continue;
        seen.add(t.address.toLowerCase());
        extra.push({ chainId, address: getAddress(t.address), symbol: t.symbol, name: t.name, decimals: t.decimals, logoURI: ipfsToHttps(t.logoURI), source: "list" });
      }
    } catch (e) {
      errors.push(`Token list unavailable: ${(e as Error).message}`);
    }
  }

  // Confirm core ERC-20 decimals on-chain rather than trusting constants.
  if (chainId !== 46630) {
    try {
      const erc = core.slice(1).map((t) => t.address);
      const meta = await readErc20Meta(chainId, erc);
      for (const t of core) {
        const m = meta.get(t.address);
        if (m) t.decimals = m.decimals;
      }
    } catch (e) {
      errors.push(`Core token validation failed: ${(e as Error).message}`);
    }
  }
  return { tokens: [...core, ...extra], errors };
}
