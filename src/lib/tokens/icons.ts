import "server-only";
import { getAddress, isAddress } from "viem";
import { BLOCKSCOUT_API, CHAIN_META, type SupportedChainId } from "@/config/chains";
import { CONTRACTS } from "@/config/contracts";
import { COMPANY_DOMAINS, LOGO_OVERRIDES } from "@/config/token-logos";
import { serverEnv } from "@/config/server-env";
import { getUniswapList, ipfsToHttps } from "./server-registry";

/**
 * Official token logos, per chain. Each token gets its own real artwork, never a shared or
 * invented image. Resolution order:
 *  1. Manual overrides (src/config/token-logos.ts)
 *  2. Native gas token / wrapped native / USDG: CoinGecko coin images
 *  3. Stock Tokens (Robinhood Chain): the company's logo by ticker, then by official domain
 *  4. Uniswap default token list logoURI
 *  5. CoinGecko by contract address
 *  6. Blockscout token metadata (icon_url)
 *  7. DexScreener token profile (project-submitted imageUrl)
 *  8. Robinhood's generic Stock Token mark (stocks only, last resort)
 * Returns null when nothing is found; the UI then shows a monogram.
 */

const STOCK_API = "https://api.robinhood.com/rhj/assets";
const LOGO_DEV_TOKEN = process.env.LOGO_DEV_TOKEN || "";
const DAY = 86_400;

const isHttpUrl = (v: unknown): v is string => typeof v === "string" && /^https:\/\/\S+$/i.test(v);
const geckoHeaders = (): HeadersInit => (serverEnv.coingeckoApiKey ? { "x-cg-demo-api-key": serverEnv.coingeckoApiKey } : {});

/** Confirms a URL actually serves an image (not a 404 page or an empty placeholder). */
async function imageExists(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { next: { revalidate: DAY }, signal: AbortSignal.timeout(5000), headers: { accept: "image/*" } });
    if (!r.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) return false;
    return (await r.arrayBuffer()).byteLength > 300;
  } catch {
    return false;
  }
}

function findImageField(obj: Record<string, unknown>): string | null {
  for (const [k, v] of Object.entries(obj)) {
    if (/logo|icon|image/i.test(k) && isHttpUrl(v)) return v;
    if (v && typeof v === "object" && !Array.isArray(v) && /logo|icon|image|media|brand/i.test(k)) {
      const inner = findImageField(v as Record<string, unknown>);
      if (inner) return inner;
    }
  }
  return null;
}

function findDomain(obj: Record<string, unknown>): string | null {
  for (const [k, v] of Object.entries(obj)) {
    if (/website|homepage|domain|url/i.test(k) && typeof v === "string" && /^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}/i.test(v) && !/robinhood/i.test(v))
      return v.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  }
  return null;
}

type StockInfo = { ticker: string; rhImage: string | null; domain: string | null };
let stockCache: { at: number; map: Map<string, StockInfo> } | null = null;

/** Stock Token metadata by contract address, from Robinhood's official Stock Token API. */
export async function getStockInfoMap(): Promise<Map<string, StockInfo>> {
  if (stockCache && Date.now() - stockCache.at < 3_600_000) return stockCache.map;
  const map = new Map<string, StockInfo>();
  try {
    const r = await fetch(STOCK_API, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const j = await r.json();
      const assets: Record<string, unknown>[] = Array.isArray(j) ? j : j.assets ?? j.results ?? j.data ?? [];
      for (const a of assets) {
        const ticker = String(a.tokenSymbol ?? a.symbol ?? "").toUpperCase().replace(/[^A-Z0-9.]/g, "");
        const deps = (a.deployments as Array<{ contractAddress?: string; chainId?: number | string }> | undefined) ?? [];
        for (const d of deps)
          if (Number(d.chainId) === 4663 && d.contractAddress && isAddress(d.contractAddress))
            map.set(d.contractAddress.toLowerCase(), { ticker, rhImage: findImageField(a), domain: findDomain(a) });
      }
    }
  } catch {}
  stockCache = { at: Date.now(), map };
  return map;
}

let geckoCoins: { at: number; map: Record<string, string> } | null = null;
async function geckoCoinImages(): Promise<Record<string, string>> {
  if (geckoCoins && Date.now() - geckoCoins.at < DAY * 1000) return geckoCoins.map;
  const map: Record<string, string> = {};
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum,weth,global-dollar,binancecoin,wbnb", {
      headers: geckoHeaders(),
      next: { revalidate: DAY },
      signal: AbortSignal.timeout(6000),
    });
    if (r.ok) for (const c of (await r.json()) as Array<{ id: string; image?: string }>) if (isHttpUrl(c.image)) map[c.id] = c.image;
  } catch {}
  if (Object.keys(map).length) geckoCoins = { at: Date.now(), map };
  return map;
}

async function geckoByContract(platform: string, address: string): Promise<string | null> {
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/coins/${platform}/contract/${address}`, {
      headers: geckoHeaders(),
      next: { revalidate: DAY },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const img = j?.image?.large ?? j?.image?.small;
    return isHttpUrl(img) ? img : null;
  } catch {
    return null;
  }
}

async function stockLogo(info: StockInfo): Promise<string | null> {
  const t = info.ticker;
  const candidates: string[] = [];
  if (t) {
    if (LOGO_DEV_TOKEN) candidates.push(`https://img.logo.dev/ticker/${encodeURIComponent(t)}?token=${LOGO_DEV_TOKEN}&size=128&format=png&fallback=404`);
    candidates.push(`https://financialmodelingprep.com/image-stock/${encodeURIComponent(t)}.png`);
  }
  const domain = COMPANY_DOMAINS[t] ?? info.domain;
  if (domain) {
    if (LOGO_DEV_TOKEN) candidates.push(`https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png&fallback=404`);
    candidates.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`);
  }
  for (const url of candidates) if (await imageExists(url)) return url;
  return null;
}

async function uniswapListLogo(chainId: number, address: string): Promise<string | null> {
  try {
    const hit = (await getUniswapList()).find((t) => t.chainId === chainId && t.address.toLowerCase() === address);
    const url = ipfsToHttps(hit?.logoURI);
    return isHttpUrl(url) ? url : null;
  } catch {
    return null;
  }
}

async function blockscoutIcon(chainId: SupportedChainId, address: string): Promise<string | null> {
  const base = BLOCKSCOUT_API[chainId];
  if (!base) return null;
  try {
    const r = await fetch(`${base}/tokens/${address}`, { next: { revalidate: DAY }, signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const j = await r.json();
      if (isHttpUrl(j.icon_url)) return j.icon_url;
    }
  } catch {}
  return null;
}

async function dexscreenerIcon(chain: string, address: string): Promise<string | null> {
  try {
    const r = await fetch(`https://api.dexscreener.com/tokens/v1/${chain}/${address}`, { next: { revalidate: DAY }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const pairs = (await r.json()) as Array<{ baseToken?: { address?: string }; info?: { imageUrl?: string } }>;
    const own = Array.isArray(pairs) ? pairs.find((p) => p.baseToken?.address?.toLowerCase() === address && isHttpUrl(p.info?.imageUrl)) : undefined;
    return own?.info?.imageUrl ?? null;
  } catch {
    return null;
  }
}

/** `address` may be "native" for the chain's gas token. */
export async function getTokenIcon(chainId: SupportedChainId, address: string): Promise<string | null> {
  const meta = CHAIN_META[chainId];
  const c = CONTRACTS[chainId];
  if (address === "native") return (await geckoCoinImages())[meta.nativeCoingecko] ?? null;
  if (!isAddress(address)) return null;
  const a = getAddress(address).toLowerCase();

  if (LOGO_OVERRIDES[a]) return LOGO_OVERRIDES[a];

  if (a === c.wrappedNative?.toLowerCase()) {
    const g = await geckoCoinImages();
    const img = meta.nativeCoingecko === "binancecoin" ? g.wbnb ?? g.binancecoin : g.weth ?? g.ethereum;
    if (img) return img;
  }
  if (chainId === 4663 && a === c.usdg?.toLowerCase()) {
    const g = await geckoCoinImages();
    if (g["global-dollar"]) return g["global-dollar"];
  }

  const stock = chainId === 4663 ? (await getStockInfoMap()).get(a) : undefined;
  if (stock) {
    const logo = await stockLogo(stock);
    if (logo) return logo;
  }

  return (
    (await uniswapListLogo(chainId, a)) ??
    (meta.coingecko ? await geckoByContract(meta.coingecko, a) : null) ??
    (await blockscoutIcon(chainId, a)) ??
    (meta.dexscreener ? await dexscreenerIcon(meta.dexscreener, a) : null) ??
    stock?.rhImage ??
    null
  );
}
