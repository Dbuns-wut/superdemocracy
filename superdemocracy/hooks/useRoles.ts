import { useReadContract, useAccount } from "wagmi"
import { abi as organizationAbi } from "@/abis/Organization.json"

const organizationAddress =
  process.env.NEXT_PUBLIC_ORG_ADDRESS as `0x${string}`

export function useRoles() {
  const { address } = useAccount()

  const { data: isMember } = useReadContract({
    address: organizationAddress,
    abi: organizationAbi,
    functionName: "members",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  const { data: isAdmin } = useReadContract({
    address: organizationAddress,
    abi: organizationAbi,
    functionName: "admins",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  return {
    isMember: isMember === true,
    isAdmin: isAdmin === true,
  }
}

