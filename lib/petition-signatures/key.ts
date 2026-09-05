import { getAddress, isAddress } from "viem"

/** Checksummed org contract address, or null. */
export function normalizeOrganizationAddress(
  addr: string
): `0x${string}` | null {
  const t = typeof addr === "string" ? addr.trim() : ""
  if (!t || !isAddress(t)) return null
  try {
    return getAddress(t as `0x${string}`)
  } catch {
    return null
  }
}

/** On-chain petition index as a decimal string (e.g. `"0"`, `"12"`). */
export function normalizePetitionIndex(raw: string): string | null {
  const t = typeof raw === "string" ? raw.trim() : ""
  if (!t || !/^\d+$/.test(t)) return null
  try {
    const n = BigInt(t)
    if (n < 0n) return null
    return n.toString()
  } catch {
    return null
  }
}

/**
 * Stable bucket key for one petition in one org contract.
 * Format: `{checksummedOrg}:{petitionIndex}` (e.g. `0xabc...:3`).
 */
export function petitionStorageKey(
  organizationAddress: string,
  petitionId: string
): string | null {
  const org = normalizeOrganizationAddress(organizationAddress)
  const pid = normalizePetitionIndex(petitionId)
  if (!org || !pid) return null
  return `${org}:${pid}`
}
