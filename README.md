# MORROW: a multi-chain DEX interface, Robinhood Chain first

*Trade at your own pace.*

MORROW is an independent, non-custodial trading interface for **Robinhood Chain** (chain ID `4663`, default, with Stock Tokens), **Ethereum** (`1`), **Base** (`8453`), **Arbitrum** (`42161`) and **BNB Chain** (`56`).
It is not affiliated with or endorsed by Robinhood, and it has not been audited.

## Quick start

```bash
cp .env.example .env.local   # fill in what you have (see below)
npm install
npm run dev                  # http://localhost:3000
npm run typecheck && npm run build
```

Needs Node 20 or newer. Works with no keys at all: Uniswap v3 routing, wallet, balances, positions, explorer data and market data all run keyless. Keys turn on extra liquidity sources.

| Variable | Scope | Enables |
|---|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | public | Privy app id (default `cmwmfm0ic00la0hjhtqmtgv47`). Wallet login, WalletConnect and email embedded wallets |
| `NEXT_PUBLIC_RH_RPC_URL` / `RH_RPC_URL` | public / server | Private RPC (e.g. Alchemy). The public RPC is rate-limited |
| `NEXT_PUBLIC_RH_WS_URL` | public | WebSocket RPC (e.g. `wss://robinhood-mainnet.g.alchemy.com/v2/KEY`) for push-based realtime updates |
| `ZEROEX_API_KEY` | server | 0x Swap API v2 routing (includes RFQ liquidity for Stock Tokens) |
| `ONEINCH_API_KEY` | server | 1inch Swap API v6 routing (covers Uniswap v2/v3/v4 and Rialto) |
| `DEXPAPRIKA_API_KEY` | server | Higher market-data quota |
| `RIALTO_API_URL`, `RIALTO_API_KEY` | server | Reserved for the direct Rialto adapter (see below) |

API keys are only read in `src/config/server-env.ts`, which is marked `server-only`, so they never reach the browser bundle.

## Networks
- Chains live in `src/config/chains.ts`. Contracts (Uniswap v3, wrapped native, route bases) live in `src/config/contracts.ts`, sourced from Uniswap's per-chain deployment pages.
- Token lists: core assets per chain; Robinhood Chain adds the Stock Token registry, and other chains add the Uniswap default token list (with official logos).
- Market data (DexPaprika) and history (Blockscout) are per chain. BNB Chain has no Blockscout, so the portfolio there shows on-chain balances only.
- Optional per-chain RPCs: `NEXT_PUBLIC_RPC_URL_<id>` / `NEXT_PUBLIC_WS_URL_<id>` (client) and `RPC_URL_<id>` (server).
- To add a chain: add it to `SUPPORTED_CHAINS` and `CHAIN_META`, add contracts, core tokens and a public RPC, then add a transport in `src/lib/wagmi.ts`.

## Solana
- Select **Solana** in the network selector. Swaps go through Jupiter Ultra: Jupiter quotes and builds the transaction, the user's Privy Solana wallet (Phantom, Solflare, Backpack or embedded) signs it, and Jupiter lands it.
- Token list and logos come from Jupiter's verified tokens. Balances come from the Solana RPC (`SOLANA_RPC_URL`; the public RPC is rate-limited, so use Helius or Alchemy). Explore and Pools use DexPaprika's `solana` network.
- Optional: `JUPITER_API_KEY` gives higher limits on api.jup.ag.

## Bridge
- Swap and bridge are one card. Pick tokens from any network: same network → MORROW router (EVM) or Jupiter (Solana); different networks → one cross-network swap via the LI.FI API (Relay, Across, Stargate, the canonical bridge, DEXs). `/bridge` opens the same card on a cross-network pair.
- Flow: exact-amount approval, simulate, sign on the source chain, then track `/v1/status` until DONE or FAILED. Solana-source transfers are signed by the Privy Solana wallet and sent via `NEXT_PUBLIC_SOLANA_RPC_URL`.
- Optional: `LIFI_API_KEY`.

## Wallets (Privy)
Connecting goes through Privy (`PrivyProvider` → `QueryClientProvider` → `WagmiProvider` from `@privy-io/wagmi`). All app code keeps using normal wagmi hooks.
- Login: an external wallet (MetaMask, Rabby, Coinbase Wallet, WalletConnect for mobile wallets including Robinhood Wallet) or email, which creates a self-custodial Privy embedded wallet.
- In the Privy dashboard: enable **Solana** (external Solana wallets plus embedded Solana wallets), add your domains (e.g. `*.vercel.app` and your custom domain) under **Allowed origins**, enable Email and External wallets, and set a WalletConnect project id if you want mobile wallets.

## Architecture

```
src/
  config/        chains.ts (4663 / 46630), contracts.ts (cited addresses), site.ts, server-env.ts
  lib/
    wagmi.ts     wagmi config via @privy-io/wagmi (Privy supplies the connectors)
    abis.ts      ERC-20, WETH, QuoterV2, SwapRouter02, v3 Factory/Pool, PositionManager
    tokens/      Token model, core tokens, server registry (Robinhood Stock Token API + on-chain validation)
    swap/
      types.ts   Quote / ProviderStatus, JSON wire format
      providers/ uniswapV3 (client, on-chain) · wrap (WETH) · zeroEx · oneInch · rialto (server)
    market/      DexPaprika client (server)
    uniswap/     v3 liquidity math
    tx/          local transaction log (status always comes from receipts)
  hooks/         useQuote (aggregator), useSwapExecution, useTxRunner, useBalances, usePrices,
                 useTokenList, usePositions, usePoolState, useAppChain
  app/api/       quote · tokens · market/* · explorer/[...path] (allowlisted Blockscout proxy)
  app/           / (swap) · explore · explore/[address] · pools · pools/[address] · portfolio · docs · terms · privacy
  components/    ui · brand · layout · wallet · swap · explore · pools
```

### How a swap runs
1. **Quote.** `useQuote` runs every source in parallel: Uniswap v3 in the browser (factory pool discovery, then QuoterV2 across all fee tiers and two-hop routes through WETH or USDG), plus `/api/quote` on the server (0x, 1inch, Rialto). Once a wallet is connected, only *firm* quotes (ones that come with executable calldata) compete. The best output wins. Quotes refresh every 15 seconds.
2. **Approve.** The exact amount by default. Unlimited approval is opt-in. The spender must match the transaction target: for both aggregators, the server rejects quotes where it doesn't.
3. **Re-quote.** After approval the app fetches a fresh quote, preferring the same venue. It stops if output falls below the minimum the user accepted, or if the spender changed.
4. **Simulate.** `eth_call` plus `estimateGas` run before the wallet is asked to sign.
5. **Sign, then confirm.** Success is shown only after a receipt with `status: success`. A revert, a rejection or a timeout is shown as such, with a link to the explorer.

Uniswap transactions go through `SwapRouter02.multicall(deadline, …)` with a 20-minute deadline and `amountOutMinimum`. ETH input is sent as `msg.value`. ETH output uses `unwrapWETH9`.

### Realtime
- `useLiveSync` watches new blocks: push via `eth_subscribe` with `NEXT_PUBLIC_RH_WS_URL`, otherwise a 1s head poll. Robinhood Chain makes ~10 blocks/s, so refreshes are throttled: balances and allowances every 2.5s, quotes, LP positions and pool state every 6s.
- Token pages stream prices over SSE from DexPaprika (`/api/market/stream`) and fall back to 20s polling. Explore and Pools refresh every 30s, USD prices every 15s.
- The **Live** badge only lights up while blocks are actually arriving.
- Mind the quotas: aggregator APIs and DexPaprika's free tier will not cope with heavy traffic at these intervals. Set API keys before launch.

### Network handling
Reads follow the wallet's chain when it is a supported chain. Otherwise they follow the network the user picked while disconnected. An unsupported wallet chain shows **Wrong network**. Switching only ever happens when the user clicks.

## Data honesty
- Prices, volume, TVL and liquidity come from DexPaprika (indexed from Robinhood Chain swaps). If it's unavailable, the UI shows an empty or error state, never placeholder numbers.
- Fee APR is only shown when the fee tier can be read unambiguously. It is a backward-looking 24h estimate.
- Wallet history comes from Blockscout, and balances come from the RPC and Blockscout.
- The token list is ETH, WETH, USDG and the official Stock Token registry (`api.robinhood.com/rhj/assets`). Every contract's symbol and decimals are confirmed on-chain. Users can import other tokens by address after an on-chain check and a risk acknowledgement.

### Token logos
Each token shows its own official artwork, resolved server-side in `src/lib/tokens/icons.ts` and cached for a day:
1. Manual overrides in `src/config/token-logos.ts`
2. ETH, WETH and USDG from CoinGecko
3. Stock Tokens: the underlying company's logo by ticker (logo.dev when `LOGO_DEV_TOKEN` is set, otherwise Financial Modeling Prep), then the company's official domain (e.g. `SPCX → spacex.com`)
4. Blockscout `icon_url`, then DexScreener profile `imageUrl`
5. Otherwise a monogram. Images are never invented.

## Dependencies and gaps (please read)
| Item | Status |
|---|---|
| Uniswap v3 (Factory, QuoterV2, SwapRouter02, PositionManager) | **Live, keyless.** Addresses from Uniswap's Robinhood Chain deployment page |
| 0x / 1inch | **Implemented**, need API keys |
| **Rialto direct** | **Missing dependency.** Its swap API is partner-gated with no public schema. `providers/rialto.ts` is the slot for it. Rialto liquidity is already reachable through 1inch |
| Uniswap v2 / v4 direct, UniswapX | Not implemented directly. Reached through aggregators. The Uniswap Trading API would add them |
| Liquidity management | Uniswap v3 only (mint full / ±50% / ±10% ranges, remove, collect). Other DEX pools show metrics only |
| Testnet | No official DEX or token deployments are published, so swaps are disabled there with a notice |
| Multicall3 | Used on the server only if bytecode exists at the canonical address |
| Legal | `/terms` and `/privacy` are templates. Have counsel review them |

## Before production
- Confirm every address in `src/config/contracts.ts` on https://robinhoodchain.blockscout.com.
- Use a private RPC, set a WalletConnect project id, and add rate limiting to `/api/*`.
- Get an independent security review. Do not claim an audit you don't have.
- Replace the placeholder X and Discord links in `src/config/site.ts`.
