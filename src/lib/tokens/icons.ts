import "server-only";
import { getAddress, isAddress } from "viem";
import { BLOCKSCOUT_API } from "@/config/chains";

/**
 * Official token logos only. Sources, in order:
 *  1. Robinhood Stock Token API asset metadata (logo/icon/image fields, if present)
 *  2. Robinhood Chain Blockscout token metadata (`icon_url`)
 * Returns null when no source has a logo — the UI then shows a monogram, never a guessed image.
 */
const STOCK_API = "https://api.robinhood.com/rhj/assets";

const isHttpUrl = (v: unknown): v is string => typeof v === "string" && /^https:\/\/\S+$/i.test(v);

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

let stockLogos: { at: number; map: Map<string, string> } | null = null;

export async function getStockLogoMap(chainId = 4663): Promise<Map<string, string>> {
  if (stockLogos && Date.now() - stockLogos.at < 3_600_000) return stockLogos.map;
  const map = new Map<string, string>();
  try {
    const r = await fetch(STOCK_API, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const j = await r.json();
      const assets: Record<string, unknown>[] = Array.isArray(j) ? j : j.assets ?? j.results ?? j.data ?? [];
      for (const a of assets) {
        const logo = findImageField(a);
        if (!logo) continue;
        const deps = (a.deployments as Array<{ contractAddress?: string; chainId?: number | string }> | undefined) ?? [];
        for (const d of deps) if (Number(d.chainId) === chainId && d.contractAddress && isAddress(d.contractAddress)) map.set(d.contractAddress.toLowerCase(), logo);
      }
    }
  } catch {}
  stockLogos = { at: Date.now(), map };
  return map;
}

export async function getTokenIcon(address: string): Promise<string | null> {
  if (!isAddress(address)) return null;
  const a = getAddress(address);
  const stock = (await getStockLogoMap()).get(a.toLowerCase());
  if (stock) return stock;
  try {
    const r = await fetch(`${BLOCKSCOUT_API[4663]}/tokens/${a}`, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const j = await r.json();
      if (isHttpUrl(j.icon_url)) return j.icon_url;
    }
  } catch {}
  return null;
}
