export const SITE = {
  name: "Morrow",
  tagline: "Trade at your own pace.",
  url: "https://morrowswap.trade",
  description: "Swap stock tokens and crypto across Robinhood Chain, Ethereum, Base, Arbitrum and BNB Chain. Non-custodial, no added fee.",
  /**
   * Official Morrow token. Leave `address` empty to show "Coming soon".
   * When it is set, the site shows the contract with a copy button and explorer link, and the token
   * is added to the verified list (swap picker, Explore, ticker) with the Morrow logo.
   * chainId: 4663 Robinhood Chain · 1 Ethereum · 8453 Base · 42161 Arbitrum · 56 BNB Chain
   */
  token: {
    address: "" as string,
    chainId: 4663 as number,
    symbol: "MORROW",
    name: "Morrow",
    decimals: 18,
    /** Where to buy while the token is still on the launchpad curve (e.g. its Pons page). Empty = hidden. */
    buyUrl: "" as string,
    buyLabel: "Buy on Pons",
  },
  links: {
    x: "https://x.com/morrowswap",
    /** Empty until a server exists; empty links are hidden. */
    discord: "" as string,
    explorer: "https://robinhoodchain.blockscout.com",
    chainDocs: "https://docs.robinhood.com/chain/",
  },
  disclaimer:
    "Morrow is an independent third-party interface. It is not affiliated with, sponsored by, or endorsed by Robinhood Markets, Inc. or any of its affiliates. Morrow has not been audited.",
} as const;
