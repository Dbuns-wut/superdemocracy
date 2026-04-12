import { useReadContract } from "wagmi"
import { abi as organizationAbi } from "@/abis/Organization.json"

const organizationAddress =
  process.env.NEXT_PUBLIC_ORG_ADDRESS as `0x${string}`
  console.log("ORG ADDRESS:", organizationAddress)

export function useTotalPetitions() {
  return useReadContract({
    address: organizationAddress,
    abi: organizationAbi,
    functionName: "totalPetitions",
  })
}

export function usePetition(id: bigint) {
  return useReadContract({
    address: organizationAddress,
    abi: organizationAbi,
    functionName: "getPetition",
    args: [id],
  })
}

export function useReferendumAddress(id: bigint) {
  return useReadContract({
    address: organizationAddress,
    abi: organizationAbi,
    functionName: "referendumOf",
    args: [id],
  })
}


