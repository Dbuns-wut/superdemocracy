import { createPublicClient, http } from "viem"
import { abi as organizationAbi } from "@/abis/Organization.json"
import { getCommunityOrgById } from "@/lib/community-orgs/store"
import { isOffchainOrgId, normalizeOrgId } from "@/lib/org-id"
import { normalizeCreator } from "@/lib/community-orgs/store"
import { anvil } from "@/lib/web3-server"

export async function isOrgSettingsAdmin(
  orgIdRaw: string,
  signerRaw: string
): Promise<boolean> {
  const orgId = normalizeOrgId(orgIdRaw)
  const signer = normalizeCreator(signerRaw)
  if (!orgId || !signer) return false

  if (isOffchainOrgId(orgId)) {
    const org = await getCommunityOrgById(orgId)
    if (!org) return false
    return org.creatorAddress.toLowerCase() === signer.toLowerCase()
  }

  try {
    const client = createPublicClient({
      chain: anvil,
      transport: http("http://127.0.0.1:8546"),
    })
    const result = await client.readContract({
      address: orgId as `0x${string}`,
      abi: organizationAbi,
      functionName: "isAdmin",
      args: [signer],
    })
    return result === true
  } catch {
    return false
  }
}
