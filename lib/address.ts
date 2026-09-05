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

/** Compact display for member-facing UI (e.g. 0x1234…abcd). */
export function shortAddress(addr?: string, edgeChars = 4): string {
  const normalized = safeAddress(addr);
  if (!normalized) return addr?.trim() || "";
  if (normalized.length <= 2 + edgeChars * 2 + 1) return normalized;
  return `${normalized.slice(0, 2 + edgeChars)}…${normalized.slice(-edgeChars)}`;
}
