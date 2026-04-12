// src/lib/address.ts
import { getAddress, isAddress } from "viem";

export function safeAddress(addr?: string): `0x${string}` | undefined {
  if (!addr || typeof addr !== "string") {
    console.warn("safeAddress received invalid input:", addr);
    return undefined;
  }

  if (!isAddress(addr)) {
    console.warn("safeAddress received non-address:", addr);
    return undefined;
  }

  try {
    return getAddress(addr as `0x${string}`);
  } catch (err) {
    console.error("safeAddress failed to normalize:", addr, err);
    return undefined;
  }
}
