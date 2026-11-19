/**
 * Manual logo overrides. Use only official artwork from the project or company itself.
 *
 *  - Core assets (ETH, WETH, BNB, WBNB, USDC, USDT, WBTC, DAI) use the canonical artwork from the
 *    Trust Wallet assets repository, the same images wallets and Uniswap's token lists show.
 *  - LOGO_OVERRIDES: token address (lowercase) → image URL, for anything else. Highest priority.
 *  - COMPANY_DOMAINS: Stock Token ticker → the company's official website, used when no
 *    ticker logo exists (e.g. private companies). The logo is then taken from that domain.
 */
import { NATIVE_ADDRESS } from "./contracts";
import { SITE } from "./site";

/** Some indexers list the native gas token under the zero address. */
const ZERO = "0x0000000000000000000000000000000000000000";
export const isNativeLike = (a?: string) => !!a && [ZERO, NATIVE_ADDRESS.toLowerCase(), "native"].includes(a.toLowerCase());

const TW = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains";
/** Morrow's own copies (public/tokens) of the ETH, WETH and BNB artwork: fast and always available. */
export const ETH = "/tokens/eth.png";
export const BNB = "/tokens/bnb.png";
const tw = (address: string) => `${TW}/ethereum/assets/${address}/logo.png`;
const WETH = "/tokens/weth.png";
const USDC = tw("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
const USDT = tw("0xdAC17F958D2ee523a2206206994597C13D831ec7");
const WBTC = tw("0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599");
const DAI = tw("0x6B175474E89094C44Da98b954EedeAC495271d0F");
const WBNB = BNB;

/** chainId → (lowercase address → logo) for each network's core assets. */
const CORE_LOGOS: Record<number, Record<string, string>> = {
  4663: { "0x0bd7d308f8e1639fab988df18a8011f41eacad73": WETH },
  1: {
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": WETH,
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": USDC,
    "0xdac17f958d2ee523a2206206994597c13d831ec7": USDT,
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": WBTC,
    "0x6b175474e89094c44da98b954eedeac495271d0f": DAI,
  },
  8453: {
    "0x4200000000000000000000000000000000000006": WETH,
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": USDC,
  },
  42161: {
    "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": WETH,
    "0xaf88d065e77c8cc2239327c5edb3a432268e5831": USDC,
    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": USDT,
    "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f": WBTC,
  },
  56: {
    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": WBNB,
    "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": USDC,
    "0x55d398326f99059ff775485246999027b3197955": USDT,
  },
};

export const LOGO_OVERRIDES: Record<string, string> = {};

/** Canonical logo for a chain's native token or a core asset, when there is one. */
export function logoOverride(chainId: number, address?: string): string | undefined {
  if (!address) return undefined;
  const a = address.toLowerCase();
  if (a === "native" || a === NATIVE_ADDRESS.toLowerCase() || a === ZERO) return chainId === 56 ? BNB : chainId === 101 ? undefined : ETH;
  if (SITE.token.address && a === SITE.token.address.toLowerCase()) return "/logo-mark.png";
  return CORE_LOGOS[chainId]?.[a] ?? LOGO_OVERRIDES[a];
}

export const COMPANY_DOMAINS: Record<string, string> = {
  SPCX: "spacex.com",
};
