import type { Address } from "viem";
import type { SupportedChainId } from "./chains";

/**
 * Contract registry.
 *
 * Every address here comes from an official source and is cited. Before a production
 * launch, confirm each one on the explorer (bytecode + verified source). Integrators
 * must not assume addresses are identical across chains.
 *
 *  - Tokens:  https://docs.robinhood.com/chain/contracts
 *  - Uniswap: https://developers.uniswap.org/docs/protocols/v3/deployments/v3-robinhood-chain-deployments
 */
export type ChainContracts = {
  weth?: Address;
  usdg?: Address;
  uniswapV3?: {
    factory: Address;
    quoterV2: Address;
    swapRouter02: Address;
    positionManager: Address;
  };
  permit2?: Address;
  multicall3?: Address;
};

export const CONTRACTS: Record<SupportedChainId, ChainContracts> = {
  4663: {
    weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73",
    usdg: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    uniswapV3: {
      factory: "0x1f7d7550b1b028f7571e69a784071f0205fd2efa",
      quoterV2: "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7",
      swapRouter02: "0xcaf681a66d020601342297493863e78c959e5cb2",
      positionManager: "0x73991a25c818bf1f1128deaab1492d45638de0d3",
    },
    permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
    // Canonical Multicall3. Presence is checked at runtime (getCode) before use.
    multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
  },
  // No official token or DEX deployments are published for testnet yet.
  46630: {},
};

/** Placeholder address aggregators use for the native gas token. */
export const NATIVE_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const satisfies Address;

/** Uniswap SwapRouter02 recipient sentinel meaning "the router itself". */
export const ROUTER_ADDRESS_THIS = "0x0000000000000000000000000000000000000002" as const satisfies Address;

export const UNISWAP_V3_FEE_TIERS = [100, 500, 3000, 10000] as const;
