import { Prose } from "@/components/layout/Prose";
import { CONTRACTS } from "@/config/contracts";
import { CHAIN_META, SUPPORTED_CHAINS, robinhoodChain } from "@/config/chains";

export const metadata = { title: "Docs" };

export default function DocsPage() {
  const chains = SUPPORTED_CHAINS.filter((c) => CONTRACTS[c.id].uniswapV3);
  return (
    <Prose title="How Morrow works" lead="A non-custodial interface for trading on Robinhood Chain, Ethereum, Base, Arbitrum, BNB Chain and Solana, including swaps across networks. Your wallet signs every transaction; Morrow never holds funds or keys.">
      <section>
        <h2>Networks</h2>
        <ul>
          {SUPPORTED_CHAINS.map((c) => (
            <li key={c.id}>
              {c.name}: chain ID <code>{c.id}</code>
              {CHAIN_META[c.id].testnet ? ". No swap contracts are published for this network." : ""}
            </li>
          ))}
          <li>Solana: swaps through Jupiter Ultra</li>
        </ul>
        <p>Robinhood Chain is the default network and the only one with Stock Tokens. Morrow never switches your wallet&apos;s network without your click.</p>
      </section>
      <section>
        <h2>Routing</h2>
        <p>For every quote, Morrow asks each available liquidity source in parallel and shows the route with the highest output.</p>
        <ul>
          <li><strong>Uniswap v3</strong>: quoted directly on-chain through QuoterV2, across all fee tiers and two-hop routes through each network&apos;s main tokens. Executed through SwapRouter02 with a deadline and a minimum output.</li>
          <li><strong>0x Swap API</strong>: available on all five mainnets when the operator configures an API key. Includes RFQ liquidity for Stock Tokens on Robinhood Chain.</li>
          <li><strong>1inch Swap API</strong>: available on all five mainnets when the operator configures an API key.</li>
          <li><strong>Rialto</strong> (Robinhood Chain): a direct integration needs partner API access. Until then its liquidity is reachable through 1inch.</li>
          <li><strong>Jupiter Ultra</strong> (Solana): Jupiter quotes and builds the transaction, your wallet signs it, Jupiter lands it.</li>
          <li><strong>Cross-network</strong>: when the pay and receive tokens are on different networks, the swap is routed by LI.FI (bridges such as Relay, Across, Stargate and the canonical Arbitrum bridge, plus DEXs). You approve the exact amount, sign once on the source network, and Morrow tracks it until it lands.</li>
          <li><strong>Native ⇄ wrapped</strong>: ETH/WETH and BNB/WBNB are converted 1:1 through the canonical wrapper contracts.</li>
        </ul>
      </section>
      <section>
        <h2>Before you sign</h2>
        <ul>
          <li>Approvals are for the exact amount by default. Unlimited approvals are opt-in.</li>
          <li>After approval, Morrow fetches a fresh quote and stops if it falls below your minimum.</li>
          <li>Every transaction is simulated against the chain before your wallet is asked to sign.</li>
          <li>Success is only shown after an on-chain receipt confirms it.</li>
        </ul>
      </section>
      <section>
        <h2>Data sources</h2>
        <ul>
          <li>Balances, allowances, quotes and pool state: each network&apos;s RPC.</li>
          <li>Token lists: built-in core assets, Robinhood&apos;s official Stock Token API, and the Uniswap default token list.</li>
          <li>Token logos: each token&apos;s own official artwork (token lists, CoinGecko, company logos for Stock Tokens). Never invented.</li>
          <li>Prices, volume, liquidity: DexPaprika, indexed from on-chain swaps.</li>
          <li>Wallet history: Blockscout.</li>
        </ul>
      </section>
      <section>
        <h2>Uniswap v3 contracts</h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Network</th>
                <th className="px-4 py-2.5 text-left font-medium">SwapRouter02</th>
                <th className="px-4 py-2.5 text-left font-medium">QuoterV2</th>
              </tr>
            </thead>
            <tbody>
              {chains.map((c) => {
                const u = CONTRACTS[c.id].uniswapV3!;
                return (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 text-muted">{c.name}</td>
                    {[u.swapRouter02, u.quoterV2].map((a) => (
                      <td key={a} className="px-4 py-2.5 font-mono text-[12px]">
                        <a href={`${c.blockExplorers.default.url}/address/${a}`} target="_blank" rel="noreferrer" className="hover:underline">
                          {a.slice(0, 10)}…{a.slice(-6)}
                        </a>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Sources: Uniswap&apos;s per-chain v3 deployment pages, and docs.robinhood.com/chain/contracts for {robinhoodChain.name} tokens.
        </p>
      </section>
      <section>
        <h2>Security</h2>
        <p>Morrow has not been audited. It uses third-party smart contracts (Uniswap, aggregator routers) that Morrow does not control. Only trade amounts you can afford to lose.</p>
      </section>
    </Prose>
  );
}
