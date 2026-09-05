import { useReadContract, useAccount } from "wagmi"
import { getAddress } from "viem"
import { abi as organizationAbi } from "@/abis/Organization.json"
import { useOptionalOrganizationAddress } from "@/contexts/OrganizationAddressContext"

function normalizeOrg(addr: string | undefined): `0x${string}` | undefined {
  if (!addr) return undefined
  try {
    return getAddress(addr as `0x${string}`)
  } catch {
    return undefined
  }
}

export function useRoles(organizationAddress?: string | undefined) {
  const { address } = useAccount()
  const fromContext = useOptionalOrganizationAddress()
  const org = normalizeOrg(organizationAddress ?? fromContext)

  const { data: isMember } = useReadContract({
    address: org,
    abi: organizationAbi,
    functionName: "members",
    args: address ? [address] : undefined,
    query: { enabled: !!org && !!address },
  })

  const { data: isAdmin } = useReadContract({
    address: org,
    abi: organizationAbi,
    functionName: "admins",
    args: address ? [address] : undefined,
    query: { enabled: !!org && !!address },
  })

  return {
    isMember: isMember === true,
    isAdmin: isAdmin === true,
  }
}
