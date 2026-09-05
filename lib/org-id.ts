import { getAddress, isAddress } from "viem"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Resolves a checksummed contract address, or a lowercase off-chain org UUID. */
export function normalizeOrgId(input: string): string | null {
  const t = typeof input === "string" ? input.trim() : ""
  if (!t) return null
  if (isAddress(t)) {
    try {
      return getAddress(t as `0x${string}`)
    } catch {
      return null
    }
  }
  if (UUID_RE.test(t)) {
    return t.toLowerCase()
  }
  return null
}

export function isOffchainOrgId(id: string | null | undefined): boolean {
  if (!id || typeof id !== "string") return false
  const t = id.trim()
  if (isAddress(t)) return false
  return UUID_RE.test(t)
}
