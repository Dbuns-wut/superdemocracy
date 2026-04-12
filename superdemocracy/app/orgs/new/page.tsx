"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import { useState } from "react"
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi"
import { abi as registryAbi } from "@/abis/GroupRegistry.json"
import { useRouter } from "next/navigation"

const registryAddress = process.env.NEXT_PUBLIC_GROUP_REGISTRY as `0x${string}`

export default function CreateOrganization() {
  const router = useRouter()
  const { address } = useAccount()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const [orgTitle, setOrgTitle] = useState("")
  const [orgDescription, setOrgDescription] = useState("")
  const [orgMode, setOrgMode] = useState<"Open" | "Manual" | "Automatic">("Open")

  const handleCreate = async () => {
    console.log("=== Create Organization Clicked ===")
    console.log("Registry Address:", registryAddress)
    console.log("Title:", orgTitle)
    console.log("Description:", orgDescription)
    console.log("Mode:", orgMode)
    console.log("Wallet Address:", address)

    if (!registryAddress) {
      alert("Registry address not found in .env")
      return
    }
    if (!orgTitle.trim() || !orgDescription.trim()) {
      alert("Title and description are required")
      return
    }
    if (!address) {
      alert("Please connect your wallet")
      return
    }

    const modeValue = orgMode === "Manual" ? 1 : 0

    console.log("Sending transaction with mode:", modeValue)

    try {
      const tx = await writeContract({
        address: registryAddress,
        abi: registryAbi,
        functionName: "createGroup",
        args: [
          process.env.NEXT_PUBLIC_IDENTITY_ADDRESS as `0x${string}`,
          orgTitle.trim(),
          orgDescription.trim(),
          modeValue
        ],
      })

      console.log("=== CREATED GROUP TX HASH ===", hash);

    } catch (error: any) {
      console.error("Create failed:", error)
      alert("Create failed: " + (error?.message || "Unknown error"))
    }
  }

  if (isSuccess) {
    setTimeout(() => router.push("/"), 1800)
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push("/")}
          className="mb-10 text-gray-400 hover:text-white flex items-center gap-2"
        >
          ← Back to Organizations
        </button>

        <h1 className="text-4xl font-bold mb-10 text-center">Create New Organization</h1>

        <div className="border border-white rounded-xl p-10 bg-zinc-950">
          <div className="space-y-8">
            {/* Title */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Organization Title</label>
              <input
                type="text"
                value={orgTitle}
                onChange={(e) => setOrgTitle(e.target.value)}
                className="w-full p-4 border border-white rounded-lg bg-black text-white placeholder:text-gray-500 focus:outline-none"
                placeholder="e.g. Calgary Civic League"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Description</label>
              <textarea
                value={orgDescription}
                onChange={(e) => setOrgDescription(e.target.value)}
                className="w-full p-4 border border-white rounded-lg bg-black text-white placeholder:text-gray-500 h-32 focus:outline-none"
                placeholder="What is this organization for?"
              />
            </div>

            {/* Membership Mode */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Membership Rules</label>
              <select
                value={orgMode}
                onChange={(e) => setOrgMode(e.target.value as "Open" | "Manual" | "Automatic")}
                className="w-full p-4 border border-white rounded-lg bg-black text-white focus:outline-none"
              >
                <option value="Open">Open — Anyone who is verified can join</option>
                <option value="Manual">Manual — New members must be approved by admins</option>
                <option value="Automatic">Automatic — New members automatically vetted based on ID database cross-referencing</option>
              </select>
              <p className="text-xs text-gray-500 mt-3">
                "Automatic" mode is a placeholder for now. It will use your Identity system once connected.
              </p>
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreate}
              disabled={isPending || isConfirming || !orgTitle.trim() || !orgDescription.trim()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium text-lg rounded-lg transition-colors"
            >
              {isPending || isConfirming ? "Creating on-chain..." : "Create Organization"}
            </button>

            {isSuccess && (
              <p className="text-green-400 text-center font-medium">
                Organization created successfully! Returning to homepage...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

