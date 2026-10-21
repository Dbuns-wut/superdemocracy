"use client";

import { createConfig } from "wagmi";
import { http } from "viem";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import { inAppProvider } from "@/lib/in-app-account";

export const anvil = defineChain({
  id: 31338,
  name: "Anvil",
  network: "anvil",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8546"] },
  },
});

export const config = createConfig({
  chains: [anvil],
  connectors: [
    injected({
      target: {
        id: "superdemocracy",
        name: "SuperDemocracy",
        provider: inAppProvider,
      },
    }),
    injected(),
  ],
  transports: {
    [anvil.id]: http(),
  },
});
