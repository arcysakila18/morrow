"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { PRIVY_APP_ID, wagmiConfig } from "@/lib/wagmi";
import { SUPPORTED_CHAINS, robinhoodChain } from "@/config/chains";
import { WalletModal } from "@/components/wallet/WalletModal";
import { Toaster } from "@/components/layout/Toaster";
import { useLiveSync } from "@/hooks/useLive";

function LiveSync() {
  useLiveSync();
  return null;
}

/** Provider order required by Privy: PrivyProvider → QueryClientProvider → WagmiProvider (from @privy-io/wagmi). */
export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 10_000 } } }));
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        defaultChain: robinhoodChain,
        supportedChains: [...SUPPORTED_CHAINS],
        loginMethods: ["wallet", "email"],
        appearance: {
          theme: "dark",
          accentColor: "#D9F36A",
          logo: "/logo-mark.png",
          landingHeader: "Connect to Morrow",
          loginMessage: "Trade at your own pace.",
          showWalletLoginFirst: true,
        },
        // Email users get a self-custodial Privy EVM wallet; users with their own wallet keep using it.
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
      }}
    >
      <QueryClientProvider client={qc}>
        <WagmiProvider config={wagmiConfig}>
          {children}
          <WalletModal />
          <Toaster />
          <LiveSync />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
