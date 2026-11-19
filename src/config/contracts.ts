import type { Address } from "viem";
import type { SupportedChainId } from "./chains";

/**
 * Contract registry. Every address comes from an official source:
 *  - Robinhood Chain tokens: https://docs.robinhood.com/chain/contracts
 *  - Uniswap v3: https://developers.uniswap.org/docs/protocols/v3/deployments (per-chain pages)
 *  - Wrapped native tokens: Uniswap deployment pages (WETH9 / WBNB)
 * Integrators must not assume addresses are identical across chains.
 */
export type ChainContracts = {
  /** Wrapped native token (WETH / WBNB). */
  wrappedNative?: Address;
  /** Intermediate tokens used for two-hop Uniswap routes. */
  routeBases?: Address[];
  uniswapV3?: { factory: Address; quoterV2: Address; swapRouter02: Address; positionManager: Address };
  permit2?: Address;
  multicall3?: Address;
  /** Robinhood Chain only. */
  weth?: Address;
  usdg?: Address;
};

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

// Ethereum, Arbitrum (and Polygon/Optimism) share the original v3 deployment addresses.
const UNI_CANONICAL = {
  factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  swapRouter02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  positionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
} as const;

export const CONTRACTS: Record<SupportedChainId, ChainContracts> = {
  4663: {
    weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
    usdg: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    wrappedNative: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
    routeBases: ["0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73", "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168"],
    uniswapV3: {
      factory: "0x1f7d7550b1b028f7571e69a784071f0205fd2efa",
      quoterV2: "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7",
      swapRouter02: "0xcaf681a66d020601342297493863e78c959e5cb2",
      positionManager: "0x73991a25c818bf1f1128deaab1492d45638de0d3",
    },
    permit2: PERMIT2,
    multicall3: MULTICALL3,
  },
  1: {
    wrappedNative: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    routeBases: ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0xdAC17F958D2ee523a2206206994597C13D831ec7"],
    uniswapV3: UNI_CANONICAL,
    permit2: PERMIT2,
    multicall3: MULTICALL3,
  },
  8453: {
    wrappedNative: "0x4200000000000000000000000000000000000006",
    routeBases: ["0x4200000000000000000000000000000000000006", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"],
    uniswapV3: {
      factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
      quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
      swapRouter02: "0x2626664c2603336E57B271c5C0b26F421741e481",
      positionManager: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
    },
    permit2: PERMIT2,
    multicall3: MULTICALL3,
  },
  42161: {
    wrappedNative: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    routeBases: ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"],
    uniswapV3: UNI_CANONICAL,
    permit2: PERMIT2,
    multicall3: MULTICALL3,
  },
  56: {
    wrappedNative: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    routeBases: ["0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "0x55d398326f99059fF775485246999027B3197955", "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"],
    uniswapV3: {
      factory: "0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7",
      quoterV2: "0x78D78E420Da98ad378D7799bE8f4AF69033EB077",
      swapRouter02: "0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2",
      positionManager: "0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613",
    },
    permit2: PERMIT2,
    multicall3: MULTICALL3,
  },
  // No official token or DEX deployments are published for Robinhood Chain Testnet.
  46630: {},
};

/** Placeholder address aggregators use for the native gas token. */
export const NATIVE_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const satisfies Address;

/** Uniswap SwapRouter02 recipient sentinel meaning "the router itself". */
export const ROUTER_ADDRESS_THIS = "0x0000000000000000000000000000000000000002" as const satisfies Address;

export const UNISWAP_V3_FEE_TIERS = [100, 500, 3000, 10000] as const;

/** Chains with aggregator API coverage (0x v2, 1inch v6). */
export const AGGREGATOR_CHAINS = new Set<number>([4663, 1, 8453, 42161, 56]);
