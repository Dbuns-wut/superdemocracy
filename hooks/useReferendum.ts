import { useReadContract } from "wagmi"
import { abi as referendumAbi } from "@/abis/Referendum.json"

export function useReferendum(address?: `0x${string}`) {
  return useReadContract({
    address,
    abi: referendumAbi,
    functionName: "getDetails",
    query: {
      enabled: !!address,
    },
  })
}
