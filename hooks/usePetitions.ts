import { useReadContract } from "wagmi"
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

export function useTotalPetitions(organizationAddress?: string | undefined) {
  const fromContext = useOptionalOrganizationAddress()
  const addr = normalizeOrg(organizationAddress ?? fromContext)
  return useReadContract({
    address: addr,
    abi: organizationAbi,
    functionName: "totalPetitions",
    query: { enabled: !!addr },
  })
}

export function usePetition(id: bigint, organizationAddress: string | undefined) {
  const addr = normalizeOrg(organizationAddress)
  return useReadContract({
    address: addr,
    abi: organizationAbi,
    functionName: "getPetition",
    args: [id],
    query: { enabled: !!addr },
  })
}

export function useReferendumAddress(
  id: bigint,
  organizationAddress?: string | undefined
) {
  const fromContext = useOptionalOrganizationAddress()
  const addr = normalizeOrg(organizationAddress ?? fromContext)
  return useReadContract({
    address: addr,
    abi: organizationAbi,
    functionName: "referendumOf",
    args: [id],
    query: { enabled: !!addr },
  })
}
