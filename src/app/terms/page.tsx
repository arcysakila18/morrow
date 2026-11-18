import { Prose } from "@/components/layout/Prose";
import { SITE } from "@/config/site";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <Prose title="Terms of use" lead="Template terms. The operator of this deployment must review and adapt them with qualified counsel before launch.">
      <section>
        <h2>The interface</h2>
        <p>MORROW is a software interface that helps you build transactions for third-party smart contracts on Robinhood Chain. MORROW does not custody assets, execute trades on your behalf, or act as a broker, exchange, or adviser.</p>
        <p>{SITE.disclaimer}</p>
      </section>
      <section>
        <h2>Your responsibilities</h2>
        <ul>
          <li>You control your wallet and are responsible for every transaction you sign.</li>
          <li>You are responsible for complying with the laws that apply to you, including any eligibility restrictions on Stock Tokens.</li>
          <li>You will verify token contracts before trading. Anyone can create a token.</li>
        </ul>
      </section>
      <section>
        <h2>Risks</h2>
        <p>Digital assets are volatile. Smart contracts can contain bugs. Quotes are estimates, and on-chain execution may differ within your slippage tolerance. Market data from third parties may be delayed or inaccurate.</p>
      </section>
      <section>
        <h2>No warranty</h2>
        <p>The interface is provided “as is”, without warranties of any kind, to the fullest extent permitted by law.</p>
      </section>
    </Prose>
  );
}
