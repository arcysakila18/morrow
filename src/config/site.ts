export const SITE = {
  name: "Morrow",
  tagline: "Trade at your own pace.",
  url: "https://morrowswap.trade",
  description: "Swap stock tokens and crypto across Robinhood Chain, Ethereum, Base, Arbitrum and BNB Chain. Non-custodial, no added fee.",
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
