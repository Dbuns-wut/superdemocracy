"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import { useState } from "react"
import { useAccount, useSignMessage } from "wagmi"
import { usePublicClient } from "wagmi"
import { abi as registryAbi } from "@/abis/GroupRegistry.json"
import { useRouter } from "next/navigation"
import { decodeEventLog } from "viem"
import { safeAddress } from "@/lib/address"
import { signOffchainAction } from "@/lib/sign-offchain-action"
import { GovernanceWalletControl } from "@/components/GovernanceWalletControl"
import { useGovernanceWallet } from "@/hooks/useGovernanceWallet"
import {
  governanceSnapshot,
  governanceWalletMessage,
  signGovernanceMessage,
} from "@/lib/governance-wallet"

const registryAddress = process.env.NEXT_PUBLIC_GROUP_REGISTRY as `0x${string}`

export default function CreateOrganization() {
  const router = useRouter()
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const governance = useGovernanceWallet()
  const publicClient = usePublicClient()

  const [orgTitle, setOrgTitle] = useState("")
  const [orgDescription, setOrgDescription] = useState("")
  const [orgMode, setOrgMode] = useState<"Open" | "Manual" | "Automatic">("Open")
  const [orgType, setOrgType] = useState<"ON_CHAIN" | "OFF_CHAIN">("OFF_CHAIN")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const handleCreate = async () => {
    if (!orgTitle.trim() || !orgDescription.trim()) {
      alert("Title and description are required")
      return
    }

    if (orgType === "ON_CHAIN") {
      setCreateError("")
      if (!registryAddress) {
        setCreateError("Governance setup is missing from this environment.")
        return
      }
      const identity = process.env.NEXT_PUBLIC_IDENTITY_ADDRESS
      if (!identity) {
        setCreateError("Governance setup is missing from this environment.")
        return
      }
      if (!publicClient) {
        setCreateError("The organization was not created.")
        return
      }
      setCreating(true)
      try {
        const modeValue = orgMode === "Manual" ? 1 : 0
        const hash = await governance.writeContract({
          address: registryAddress,
          abi: registryAbi,
          functionName: "createGroup",
          args: [identity as `0x${string}`, orgTitle.trim(), orgDescription.trim(), modeValue],
        })
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.status !== "success") {
          setCreateError("The organization was not created.")
          return
        }
        let group: `0x${string}` | undefined
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: registryAbi,
              data: log.data,
              topics: log.topics,
            })
            if (decoded.eventName !== "GroupCreated" || !decoded.args) continue
            group = safeAddress((decoded.args as unknown as { group?: string }).group)
            if (group) break
          } catch {
            // ignore unrelated logs
          }
        }
        const walletAddress = governanceSnapshot().address
        if (group && walletAddress) {
          try {
            const signed = await signOffchainAction({
              action: "org-types.set",
              resourceId: group,
              voterId: walletAddress,
              payload: { type: "ON_CHAIN" },
              signMessageAsync: ({ message }) => signGovernanceMessage(message),
            })
            await fetch("/api/org-types/set", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orgId: group,
                type: "ON_CHAIN",
                voterId: walletAddress,
                ...signed,
              }),
            })
          } catch {
            // The registry already created the organization. Unknown orgs are treated as governance.
          }
        }
        if (group) {
          router.push(`/orgs/${group}`)
          return
        }
        setCreateError("The organization was created, but this page could not open it.")
      } catch (error: unknown) {
        console.error("Create governance org failed:", error)
        setCreateError(governanceWalletMessage(error))
      } finally {
        setCreating(false)
      }
      return
    }

    if (!address) {
      alert("Sign in before creating an organization.")
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
  }

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
                <option value="OFF_CHAIN">Community</option>
                <option value="ON_CHAIN">Governance</option>
              </select>
              {orgType === "ON_CHAIN" && (
                <div className="mt-3">
                  <GovernanceWalletControl wallet={governance} />
                </div>
              )}
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

            {createError && orgType === "ON_CHAIN" ? (
              <p className="text-sm text-red-700">{createError}</p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
