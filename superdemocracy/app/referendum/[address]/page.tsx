"use client"
export const dynamic = "force-dynamic"

import React from "react"
import { useParams } from "next/navigation"

import {
  useReadContracts, 
  useReadContract, 
  useAccount, 
  useConnect, 
  useWriteContract, 
  useBlockNumber 
} from "wagmi"

import { abi as referendumAbi } from "@/abis/Referendum.json"
import type { Abi } from "viem"
import { safeAddress } from "@/lib/address"
import { waitForTransactionReceipt } from "wagmi/actions"
import { config } from "@/lib/web3"
import VoteBar from "@/components/VoteBar"

export default function ReferendumPage() {
  const params = useParams()

  const addressParam = Array.isArray(params?.address)
    ? params?.address[0]
    : params?.address
  const contractAddress = safeAddress(addressParam)

  const { address } = useAccount()

  const { data: blockNumber } = useBlockNumber({ watch: true })

  const [mounted, setMounted] = React.useState(false)
  const [isVoting, setIsVoting] = React.useState(false)
  
  const [votingOpen, setVotingOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const { data: totalVotes } = useReadContract({
    address: contractAddress,
    abi: referendumAbi,
    functionName: "totalVotes",
    query: { enabled: !!contractAddress },
    blockNumber,
  })

  console.log("totalVotes hook value:", totalVotes)
  
  const { data: status } = useReadContract({
    address: contractAddress,
    abi: referendumAbi,
    functionName: "getStatus",
    query: { enabled: !!contractAddress },
    blockNumber,
  })

  const { data: ballot } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: referendumAbi,
    functionName: "ballots",
    args: [address, 0],
    query: { enabled: !!contractAddress && !!address },
    blockNumber,
  })

    const { data: details } = useReadContract({
    address: contractAddress,
    abi: referendumAbi,
    functionName: "getDetails",
    query: { enabled: !!contractAddress },
    blockNumber,
  })

  const statusValue = status as number | undefined

  let readableStatus = "Loading..."

  if (statusValue === 0) readableStatus = "Not Started"
  if (statusValue === 1) readableStatus = "Active"
  if (statusValue === 2) readableStatus = "Ended"

  const { connect, connectors } = useConnect()
  const { writeContract, writeContractAsync } = useWriteContract()

  const handleVote = async (i: number) => {
    if (!contractAddress || !options) return

    setIsVoting(true)

    try {
      const ranking = options.map((_: string, index: number) =>
        index === i ? 0 : 1
      )

      const hash = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        abi: referendumAbi,
        functionName: "vote",
        args: [ranking],
      })

      await waitForTransactionReceipt(config, { hash })

    } finally {
      setIsVoting(false)
    }
  }

  const detailsValue = details as
    | readonly [string, string, readonly string[], bigint, bigint]
    | undefined
  const title = detailsValue?.[0]
  const description = detailsValue?.[1]
  const options = detailsValue?.[2]

  const currentVote =
   ballot !== undefined && options
     ? options[Number(ballot)]
     : null

  const { data: optionVoteReads } = useReadContracts({
    contracts: options?.map((_: string, i: number) => ({
      address: contractAddress,
      abi: referendumAbi as Abi,
      functionName: "optionVotes",
      args: [i],
    })) ?? [],
    query: { enabled: !!contractAddress },
  }) 
  
  const voteCounts =
    optionVoteReads?.map((r) => Number(r.result ?? 0)) ?? []

  const totalVotesCount = voteCounts.reduce((a, b) => a + b, 0) 

  if (!mounted) return null

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Referendum</h1>
      
      <h2 className="text-xl font-semibold mt-4">{title}</h2>
      <p className="mt-2">{description}</p>

      <div className="mt-4">
          
        <div className="mt-4 flex gap-16 items-start">
          <div>
            <h3 className="font-semibold">Current Results</h3>

            <div className="flex gap-6 items-end mt-4">
             {options?.map((option: string, i: number) => (
               <VoteBar
                 key={i}
                 label={option}
                 value={voteCounts[i] ?? 0}
                 max={totalVotesCount}
                 color={i === 0 ? "bg-green-400" : "bg-red-400"}
               />
             ))}
           </div>
         </div>

         <div className="flex flex-col">

           <button
             onClick={() =>
               writeContract({
                 address: contractAddress as `0x${string}`,
                 abi: referendumAbi,
                 functionName: "acknowledgeEducation",
               })
             }
             className="mt-10 px-4 py-2 bg-yellow-500 text-white rounded"
           >
             View Perspectives
           </button>

           {readableStatus === "Active" && address && (
             <button
               onClick={() => setVotingOpen(!votingOpen)}
               className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
             >
               {currentVote ? "Change Vote" : "Vote"}
             </button>
           )}
     
           {votingOpen && readableStatus === "Active" && address && (
             <div className="mt-4 space-y-2">
               {options?.map((option: string, i: number) => (
                 <button
                   key={i}
                   onClick={() => handleVote(i)}
                   disabled={isVoting}
                   className={`block px-4 py-2 bg-green-600 text-white rounded ${
                     currentVote === option ? "opacity-50" : ""
                   } ${isVoting ? "opacity-40 cursor-not-allowed" : ""}`}
                 >
                   {option}
                 </button>
               ))}
             </div>
           )}

          </div>
        </div>
      
        {currentVote && (
          <div className="mt-2 font-semibold">
            Your Vote: {currentVote}
          </div>
        )}
    
        <div>
          Total Votes Cast: {totalVotes !== undefined ? Number(totalVotes) : "Loading..."}
        </div>  

        <div>
          Status: {readableStatus}
        </div>

        <div>
          Contract Address: {contractAddress}
        </div>
        
        <div>
         Wallet: {address ?? "Not Connected"}
        </div>

         <div className="flex flex-col">
            
         {isVoting && (
           <div className="mt-2 text-sm text-gray-600">
             Transaction Pending...
           </div>
         )}

       <div className="flex flex-col">

        {!address && (   
          <button
            onClick={() => connect({ connector: connectors[0] })}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Connect Wallet
          </button>
        )}  
      </div>
      </div>
      </div>
    </div>
  )
}
