import type { Address } from "viem";

export type TokenSource = "core" | "stock" | "custom";

export type Token = {
  chainId: number;
  /** ERC-20 address, or NATIVE_ADDRESS for ETH. Always checksummed. */
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  source: TokenSource;
  /** Stock Token metadata from Robinhood's Stock Token API, when applicable. */
  stock?: { underlying: string; halted: boolean; status: string };
};
