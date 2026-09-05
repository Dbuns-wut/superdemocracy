import { defineChain } from "viem"

/** Same chain as `lib/web3.ts` — server-only import (no "use client"). */
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
})
