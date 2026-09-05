import { getAddress, isAddress } from "viem"
import { getCommunityOrgById } from "@/lib/community-orgs/store"
import { isOffchainOrgId } from "@/lib/org-id"

function normalizeEthAddress(input: string): string | null {
  const t = typeof input === "string" ? input.trim() : ""
  if (!t || !isAddress(t)) return null
  try {
    return getAddress(t as `0x${string}`)
  } catch {
    return null
  }
}

export async function isVoteOrgAdmin(orgId: string, address: string): Promise<boolean> {
  const normalized = normalizeEthAddress(address)
  if (!normalized) return false
  if (!isOffchainOrgId(orgId)) return false
  const org = await getCommunityOrgById(orgId)
  if (!org) return false
  return org.creatorAddress.toLowerCase() === normalized.toLowerCase()
}

/** External auditor only — never implied by admin. */
export async function isVoteOrgAuditor(orgId: string, address: string): Promise<boolean> {
  const normalized = normalizeEthAddress(address)
  if (!normalized) return false
  if (!isOffchainOrgId(orgId)) return false
  const org = await getCommunityOrgById(orgId)
  if (!org?.auditorAddress) return false
  if (org.creatorAddress.toLowerCase() === normalized.toLowerCase()) return false
  return org.auditorAddress.toLowerCase() === normalized.toLowerCase()
}

export async function isVoteOrgMember(orgId: string, address: string): Promise<boolean> {
  const normalized = normalizeEthAddress(address)
  if (!normalized) return false
  const { getCommunityOrgMembersList } = await import("@/lib/community-orgs/store")
  const members = await getCommunityOrgMembersList(orgId)
  if (!members) return false
  return members.some((m) => m.toLowerCase() === normalized.toLowerCase())
}
