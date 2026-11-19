import type { Address } from "viem";

/** core: built-in assets · stock: Robinhood Stock Token registry · list: Uniswap default token list · custom: user import */
export type TokenSource = "core" | "stock" | "list" | "custom";

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
