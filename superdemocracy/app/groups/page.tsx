"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import { useState, useEffect } from "react"
import { useWriteContract, useAccount, usePublicClient } from "wagmi"
import { decodeEventLog } from "viem"
import { abi as registryAbi } from "@/abis/GroupRegistry.json"

const registryAddress = process.env.NEXT_PUBLIC_GROUP_REGISTRY as `0x${string}`

export default function GroupsPage() {

  console.log("GROUPS PAGE RENDERED")

  const { writeContract } = useWriteContract()
  const { address } = useAccount()
  const publicClient = usePublicClient()

  const [groups, setGroups] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState("all")
  const [sortOrder, setSortOrder] = useState("newest")
  const [showSort, setShowSort] = useState(false)

  const handleCreateGroup = () => {
    if (!registryAddress) return

    writeContract({
      address: registryAddress,
      abi: registryAbi,
      functionName: "createOrganization",
      args: [],
    })
  }

  useEffect(() => {
    if (!publicClient || !registryAddress) return

    const fetchGroups = async () => {
      const logs = await publicClient.getLogs({
        address: registryAddress,
        fromBlock: 0n,
        toBlock: "latest",
      })

      const found: any[] = []

      logs.forEach((log) => {
        try {
          const decodedLog = decodeEventLog({
            abi: registryAbi,
            data: log.data,
            topics: log.topics,
          })

          if (decodedLog.eventName === "GroupCreated") {
            found.push({
              group: decodedLog.args.group,
              creator: decodedLog.args.creator,
            })
          }
        } catch {}
      })

      setGroups(found)
    }

    fetchGroups()
  }, [publicClient, registryAddress])

  const filteredGroups = groups
    .filter(g => g.group.toLowerCase().includes(search.toLowerCase()))
    .filter(g => tab === "all" || g.creator === address)
    .sort((a, b) => sortOrder === "newest"
      ? 1
      : sortOrder === "oldest"
      ? -1
      : 0)

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-6 text-center w-full">
        Organizations
      </h1>

      <div className="mb-6 flex justify-center">
        <div className="flex w-2/3 items-center gap-2 relative">

          <input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 p-2 border border-white rounded bg-black text-white"
          />

          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="px-3 py-2 bg-zinc-900 text-white rounded"
            >
              Sort
            </button>

            {showSort && (
              <div className="absolute right-0 mt-2 bg-zinc-900 border border-white rounded">
                <button onClick={() => { setSortOrder("newest"); setShowSort(false) }} className="block px-4 py-2">Newest</button>
                <button onClick={() => { setSortOrder("oldest"); setShowSort(false) }} className="block px-4 py-2">Oldest</button>
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="flex justify-center gap-4 mb-6">
        <button onClick={() => setTab("all")}>All</button>
        <button onClick={() => setTab("yours")}>Yours</button>
      </div>

      <div className="mb-6 flex justify-center">
        <button onClick={handleCreateGroup}>
          Create Organization
        </button>
      </div>

      <div>
        {filteredGroups.map((g, i) => (
          <div key={i} className="p-4 border mb-2">
            <div className="text-sm break-all">{g.group}</div>
            <div className="text-xs text-gray-400">Creator: {g.creator}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
