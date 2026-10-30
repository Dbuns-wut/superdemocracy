import { defineChain } from "viem"

/** Local chain. Same network the app already uses for governance actions. */
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
