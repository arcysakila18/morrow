"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { WalletModal } from "@/components/wallet/WalletModal";
import { Toaster } from "@/components/layout/Toaster";
import { useLiveSync } from "@/hooks/useLive";

function LiveSync() {
  useLiveSync();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 10_000 } } }));
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        {children}
        <WalletModal />
        <Toaster />
        <LiveSync />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
