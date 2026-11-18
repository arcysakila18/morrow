import "server-only";
import { createPublicClient, getAddress, http, isAddress, type Address } from "viem";
import { erc20Abi } from "@/lib/abis";
import { robinhoodChain, type SupportedChainId } from "@/config/chains";
import { CONTRACTS } from "@/config/contracts";
import { serverEnv } from "@/config/server-env";
import { coreTokens } from "./core";
import type { Token } from "./types";
import { getStockLogoMap } from "./icons";

const STOCK_API = "https://api.robinhood.com/rhj/assets";

type RhAsset = {
  tokenSymbol?: string;
  name?: string;
  status?: string;
  isTradingHalt?: boolean;
  deployments?: Array<{ contractAddress?: string; chainId?: number | string }>;
};

export const serverClient = createPublicClient({ chain: robinhoodChain, transport: http(serverEnv.rpcUrl) });

/**
 * Fetches Stock Tokens from Robinhood's official Stock Token API and confirms each
 * contract's symbol + decimals on-chain. Tokens that fail on-chain validation are dropped.
 */
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

  const [meta, logos] = await Promise.all([readErc20Meta(candidates.map((c) => c.address)), getStockLogoMap(chainId)]);
  return candidates.flatMap(({ asset, address }) => {
    const m = meta.get(address);
    if (!m) return [];
    return [{
      chainId,
      address,
      symbol: m.symbol,
      name: asset.name || m.name,
      decimals: m.decimals,
      logoURI: logos.get(address.toLowerCase()),
      source: "stock" as const,
      stock: {
        underlying: asset.tokenSymbol ?? m.symbol,
        halted: !!asset.isTradingHalt,
        status: asset.status ?? "ASSET_STATUS_UNSPECIFIED",
      },
    }];
  });
}

export async function readErc20Meta(addresses: Address[]) {
  const out = new Map<Address, { symbol: string; name: string; decimals: number }>();
  const mc = CONTRACTS[4663].multicall3;
  const hasMulticall = mc ? !!(await serverClient.getCode({ address: mc }).catch(() => undefined)) : false;

  const calls = addresses.flatMap((address) => [
    { address, abi: erc20Abi, functionName: "symbol" as const },
    { address, abi: erc20Abi, functionName: "name" as const },
    { address, abi: erc20Abi, functionName: "decimals" as const },
  ]);

  let results: Array<{ status: "success" | "failure"; result?: unknown }>;
  if (hasMulticall) {
    results = await serverClient.multicall({ contracts: calls, allowFailure: true, multicallAddress: mc! });
  } else {
    results = await Promise.all(
      calls.map((c) =>
        serverClient
          .readContract(c as never)
          .then((result) => ({ status: "success" as const, result }))
          .catch(() => ({ status: "failure" as const })),
      ),
    );
  }
  addresses.forEach((address, i) => {
    const [s, n, d] = results.slice(i * 3, i * 3 + 3);
    if (s?.status === "success" && d?.status === "success") {
      out.set(address, {
        symbol: String(s.result),
        name: n?.status === "success" ? String(n.result) : String(s.result),
        decimals: Number(d.result),
      });
    }
  });
  return out;
}

export async function getTokenRegistry(chainId: SupportedChainId) {
  const core = coreTokens(chainId);
  const errors: string[] = [];
  let stock: Token[] = [];
  if (chainId === 4663) {
    try {
      stock = await fetchStockTokens(chainId);
    } catch (e) {
      errors.push(`Stock Token registry unavailable: ${(e as Error).message}`);
    }
    // Confirm core ERC-20 decimals on-chain rather than trusting constants.
    try {
      const erc = core.filter((t) => t.address !== core[0].address).map((t) => t.address);
      const meta = await readErc20Meta(erc);
      for (const t of core) {
        const m = meta.get(t.address);
        if (m) t.decimals = m.decimals;
      }
    } catch (e) {
      errors.push(`Core token validation failed: ${(e as Error).message}`);
    }
  }
  return { tokens: [...core, ...stock], errors };
}
