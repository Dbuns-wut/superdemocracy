"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import { useEffect, useState } from "react"
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useSignMessage,
} from "wagmi"
import { usePublicClient } from "wagmi"
import { abi as registryAbi } from "@/abis/GroupRegistry.json"
import { useRouter } from "next/navigation"
import { decodeEventLog } from "viem"
import { safeAddress } from "@/lib/address"
import { signOffchainAction } from "@/lib/sign-offchain-action"

const registryAddress = process.env.NEXT_PUBLIC_GROUP_REGISTRY as `0x${string}`

export default function CreateOrganization() {
  const router = useRouter()
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  const publicClient = usePublicClient()

  const [orgTitle, setOrgTitle] = useState("")
  const [orgDescription, setOrgDescription] = useState("")
  const [orgMode, setOrgMode] = useState<"Open" | "Manual" | "Automatic">("Open")
  const [orgType, setOrgType] = useState<"ON_CHAIN" | "OFF_CHAIN">("ON_CHAIN")

  const handleCreate = async () => {
    if (!orgTitle.trim() || !orgDescription.trim()) {
      alert("Title and description are required")
      return
    }
    if (!address) {
      alert("Please connect your wallet so we can record the creator of this org.")
      return
    }

    if (orgType === "OFF_CHAIN") {
      try {
        const payload = {
          title: orgTitle.trim(),
          description: orgDescription.trim(),
          membershipMode: orgMode,
        }
        const signed = await signOffchainAction({
          action: "community.orgs.create",
          resourceId: "new",
          voterId: address,
          payload,
          signMessageAsync,
        })
        const res = await fetch("/api/community-orgs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            creatorAddress: address,
            voterId: address,
            ...signed,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          alert(data?.error || "Failed to create community org")
          return
        }
        if (data?.org?.id) {
          router.push(`/orgs/${data.org.id}`)
        } else {
          alert("Create succeeded but no org id returned")
        }
      } catch (e: unknown) {
        const err = e as { message?: string }
        console.error("Create community org failed:", e)
        alert("Create failed: " + (err?.message || "Unknown error"))
      }
      return
    }

    if (!registryAddress) {
      alert("Registry address not found in .env")
      return
    }

    const modeValue = orgMode === "Manual" ? 1 : 0

    try {
      await writeContract({
        address: registryAddress,
        abi: registryAbi,
        functionName: "createGroup",
        args: [
          process.env.NEXT_PUBLIC_IDENTITY_ADDRESS as `0x${string}`,
          orgTitle.trim(),
          orgDescription.trim(),
          modeValue,
        ],
      })
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error("Create failed:", error)
      alert("Create failed: " + (err?.message || "Unknown error"))
    }
  }

  if (isSuccess) {
    setTimeout(() => router.push("/"), 1800)
  }
  const isSubmittingOnChain = (isPending || isConfirming) && orgType === "ON_CHAIN"

  useEffect(() => {
    if (!hash || !publicClient || !address) return
    ;(async () => {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: registryAbi,
              data: log.data,
              topics: log.topics,
            })
            if (decoded.eventName !== "GroupCreated" || !decoded.args) continue
            const group = safeAddress(
              (decoded.args as unknown as { group?: string }).group
            )
            if (!group) continue
            const signed = await signOffchainAction({
              action: "org-types.set",
              resourceId: group,
              voterId: address,
              payload: { type: orgType },
              signMessageAsync,
            })
            await fetch("/api/org-types/set", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orgId: group, type: orgType, voterId: address, ...signed }),
            })
            break
          } catch {
            // ignore unrelated logs
          }
        }
      } catch {
        // ignore org type persistence failures; chain tx already succeeded
      }
    })()
  }, [hash, publicClient, orgType, address, signMessageAsync])

  return (
    <div className="min-h-screen bg-white text-zinc-900 p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push("/")}
          className="mb-10 text-gray-600 hover:text-zinc-900 flex items-center gap-2"
        >
          ← Back to Organizations
        </button>

        <h1 className="text-4xl font-bold mb-10 text-center">Create New Organization</h1>

        <div className="border border-zinc-200 rounded-xl p-10 bg-zinc-50">
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Title</label>
              <input
                type="text"
                value={orgTitle}
                onChange={(e) => setOrgTitle(e.target.value)}
                className="w-full p-3 border border-zinc-200 rounded bg-white text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Description</label>
              <textarea
                value={orgDescription}
                onChange={(e) => setOrgDescription(e.target.value)}
                className="w-full h-32 p-3 border border-zinc-200 rounded bg-white text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Organization type</label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value as "ON_CHAIN" | "OFF_CHAIN")}
                className="w-full p-3 border border-zinc-200 rounded bg-white text-zinc-900"
              >
                <option value="ON_CHAIN">On-chain</option>
                <option value="OFF_CHAIN">Community</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Membership</label>
              <select
                value={orgMode}
                onChange={(e) => setOrgMode(e.target.value as "Open" | "Manual" | "Automatic")}
                className="w-full p-3 border border-zinc-200 rounded bg-white text-zinc-900"
              >
                <option value="Open">Open</option>
                <option value="Manual">Manual approval</option>
                <option value="Automatic">Automatic</option>
              </select>
              {orgMode === "Automatic" && (
                <p className="mt-2 text-sm text-zinc-500">
                  Automatic membership rules arrive with the identity system.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={isSubmittingOnChain}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmittingOnChain ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
