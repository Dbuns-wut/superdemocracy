"use client";

import { WagmiProvider } from "wagmi";
import { config } from "@/lib/web3";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { NotificationBell } from "@/components/NotificationBell";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <NotificationBell />
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  );
}
