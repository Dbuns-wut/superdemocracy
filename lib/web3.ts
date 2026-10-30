"use client";

import { createConfig } from "wagmi";
import { http } from "viem";
import { injected } from "wagmi/connectors";
import { anvil } from "@/lib/chain";
import { inAppProvider } from "@/lib/in-app-account";

export { anvil };

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
  ],
  transports: {
    [anvil.id]: http(),
  },
});
