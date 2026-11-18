import { Prose } from "@/components/layout/Prose";
import { CONTRACTS } from "@/config/contracts";
import { robinhoodChain, robinhoodTestnet } from "@/config/chains";

export const metadata = { title: "Docs" };

const c = CONTRACTS[4663];

export default function DocsPage() {
  const rows: [string, string][] = [
    ["WETH", c.weth!],
    ["USDG", c.usdg!],
    ["Uniswap v3 Factory", c.uniswapV3!.factory],
    ["Uniswap v3 QuoterV2", c.uniswapV3!.quoterV2],
    ["Uniswap SwapRouter02", c.uniswapV3!.swapRouter02],
    ["Uniswap v3 Position Manager", c.uniswapV3!.positionManager],
  ];
  return (
    <Prose title="How MORROW works" lead="A non-custodial interface for trading on Robinhood Chain. Your wallet signs every transaction; MORROW never holds funds or keys.">
      <section>
        <h2>Routing</h2>
        <p>For every quote, MORROW asks each available liquidity source in parallel and shows the route with the highest output.</p>
        <ul>
          <li><strong>Uniswap v3</strong> — quoted directly on-chain through QuoterV2, across all fee tiers and via WETH or USDG for two-hop routes. Executed through SwapRouter02 with a deadline and a minimum output.</li>
          <li><strong>0x Swap API</strong> — includes RFQ liquidity for Stock Tokens. Enabled when the operator configures an API key.</li>
          <li><strong>1inch Swap API</strong> — aggregates Uniswap v2/v3/v4 and Rialto on Robinhood Chain. Enabled when the operator configures an API key.</li>
          <li><strong>Rialto</strong> — direct integration requires partner API access; until then its liquidity is reachable through 1inch.</li>
          <li><strong>ETH ⇄ WETH</strong> — wrapped and unwrapped 1:1 through the WETH contract.</li>
        </ul>
      </section>
      <section>
        <h2>Before you sign</h2>
        <ul>
          <li>Approvals are for the exact amount by default; unlimited approvals are opt-in.</li>
          <li>After approval, MORROW fetches a fresh quote and stops if it falls below your minimum.</li>
          <li>Every transaction is simulated against the chain before your wallet is asked to sign.</li>
          <li>Success is only shown after an on-chain receipt confirms it.</li>
          <li>MORROW never switches your wallet&apos;s network without your click.</li>
        </ul>
      </section>
      <section>
        <h2>Data sources</h2>
        <ul>
          <li>Balances, allowances, quotes and pool state: Robinhood Chain RPC.</li>
          <li>Token list: Robinhood Chain core assets and Robinhood&apos;s official Stock Token API, validated on-chain.</li>
          <li>Prices, volume, liquidity: DexPaprika, indexed from Robinhood Chain swaps.</li>
          <li>Wallet history: Robinhood Chain Blockscout.</li>
        </ul>
      </section>
      <section>
        <h2>Networks</h2>
        <ul>
          <li>{robinhoodChain.name} — chain ID <code>{robinhoodChain.id}</code>, RPC <code>{robinhoodChain.rpcUrls.default.http[0]}</code></li>
          <li>{robinhoodTestnet.name} — chain ID <code>{robinhoodTestnet.id}</code>, RPC <code>{robinhoodTestnet.rpcUrls.default.http[0]}</code>. No swap contracts are published for testnet.</li>
        </ul>
      </section>
      <section>
        <h2>Contracts</h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 text-muted">{k}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[12px]">
                    <a href={`${robinhoodChain.blockExplorers.default.url}/address/${v}`} target="_blank" rel="noreferrer" className="hover:underline">{v}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] text-muted">Sources: docs.robinhood.com/chain/contracts and Uniswap&apos;s Robinhood Chain deployment page.</p>
      </section>
      <section>
        <h2>Security</h2>
        <p>MORROW has not been audited. It uses third-party smart contracts (Uniswap, aggregator routers) that MORROW does not control. Only trade amounts you can afford to lose.</p>
      </section>
    </Prose>
  );
}
