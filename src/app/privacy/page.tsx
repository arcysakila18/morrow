import { Prose } from "@/components/layout/Prose";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <Prose title="Privacy" lead="Template policy. The operator must review it against their actual hosting and analytics setup.">
      <section>
        <h2>What MORROW stores</h2>
        <ul>
          <li>In your browser only: swap settings, imported tokens, and transactions you submitted from this device.</li>
          <li>MORROW never asks for, receives, or stores seed phrases or private keys.</li>
        </ul>
      </section>
      <section>
        <h2>What leaves your browser</h2>
        <ul>
          <li>Your public wallet address and trade parameters are sent to MORROW&apos;s server to request quotes from 0x and 1inch, and to read balances and history from Robinhood Chain&apos;s Blockscout explorer.</li>
          <li>Reads and transactions go to the Robinhood Chain RPC endpoint.</li>
          <li>Blockchain transactions are public and permanent.</li>
        </ul>
      </section>
      <section>
        <h2>Analytics</h2>
        <p>This build includes no analytics or tracking scripts.</p>
      </section>
    </Prose>
  );
}
