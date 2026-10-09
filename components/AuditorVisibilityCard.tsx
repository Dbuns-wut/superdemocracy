"use client"

import { useState } from "react"
import { isAddress } from "viem"
import { useReadContract, useWriteContract } from "wagmi"
import { signOffchainAction } from "@/lib/sign-offchain-action"
import type { CommunityOrg } from "@/lib/community-orgs/types"

const ballotPolicyAbi = [
  {
    type: "function",
    name: "auditorVisibleBallots",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "ballotAuditor",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "setAuditorVisibleBallots",
    stateMutability: "nonpayable",
    inputs: [{ name: "enabled", type: "bool" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setBallotAuditor",
    stateMutability: "nonpayable",
    inputs: [{ name: "auditor", type: "address" }],
    outputs: [],
  },
] as const

const choiceButton =
  "rounded px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"

type Props = {
  isAdmin: boolean
  orgAddress?: `0x${string}`
  offchainId?: string
  offchainOrg?: CommunityOrg | null
  userAddress?: string
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>
  onCommunityOrg: (org: CommunityOrg) => void
}

export function AuditorVisibilityCard({
  isAdmin,
  orgAddress,
  offchainId,
  offchainOrg,
  userAddress,
  signMessageAsync,
  onCommunityOrg,
}: Props) {
  const isChain = Boolean(orgAddress)
  const { data: chainVisible, refetch: refetchVisible } = useReadContract({
    address: orgAddress,
    abi: ballotPolicyAbi,
    functionName: "auditorVisibleBallots",
    query: { enabled: Boolean(orgAddress) },
  })
  const { data: chainCounter, refetch: refetchCounter } = useReadContract({
    address: orgAddress,
    abi: ballotPolicyAbi,
    functionName: "ballotAuditor",
    query: { enabled: Boolean(orgAddress) },
  })
  const { writeContractAsync } = useWriteContract()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [counterInput, setCounterInput] = useState("")

  if (!isAdmin) return null

  const visible = isChain ? chainVisible !== false : offchainOrg?.auditorVisibleBallots !== false
  const counter =
    isChain && chainCounter && chainCounter !== "0x0000000000000000000000000000000000000000"
      ? chainCounter
      : offchainOrg?.auditorAddress

  async function setVisible(enabled: boolean) {
    setError("")
    setBusy(true)
    try {
      if (isChain && orgAddress) {
        await writeContractAsync({
          address: orgAddress,
          abi: ballotPolicyAbi,
          functionName: "setAuditorVisibleBallots",
          args: [enabled],
        })
        await refetchVisible()
        return
      }
      if (!offchainId || !userAddress) {
        setError("Connect the admin wallet.")
        return
      }
      const signed = await signOffchainAction({
        action: "community.orgs.setAuditorVisibility",
        resourceId: offchainId,
        voterId: userAddress,
        payload: { auditorVisibleBallots: enabled },
        signMessageAsync,
      })
      const res = await fetch(
        `/api/community-orgs/${encodeURIComponent(offchainId)}/auditor-visibility`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            auditorVisibleBallots: enabled,
            voterId: userAddress,
            ...signed,
          }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save this setting.")
        return
      }
      if (data.org) onCommunityOrg(data.org as CommunityOrg)
    } catch {
      setError("Could not save this setting.")
    } finally {
      setBusy(false)
    }
  }

  async function saveCounter() {
    if (!isChain || !orgAddress) return
    setError("")
    if (!isAddress(counterInput.trim())) {
      setError("Enter the counter's wallet address.")
      return
    }
    setBusy(true)
    try {
      await writeContractAsync({
        address: orgAddress,
        abi: ballotPolicyAbi,
        functionName: "setBallotAuditor",
        args: [counterInput.trim() as `0x${string}`],
      })
      setCounterInput("")
      await refetchCounter()
    } catch {
      setError("Could not appoint the counter.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded border border-zinc-200 bg-zinc-50 p-6">
      <h3 className="mb-2 text-lg text-zinc-900">Ballot visibility</h3>
      <p className="text-sm text-zinc-600">
        Organization setting. It is not shown on a ballot.
      </p>
      <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <p>
          Auditor-visible ballots are the strongest way to check an online vote. The people
          appointed to count can see who voted and how they voted, in the same way a bank can
          trace a payment. Everyone else sees only the result.
        </p>
        <p className="mt-2">
          A secret count keeps each person&apos;s choice untraceable. The result is still
          published, and a disputed count cannot be checked person by person.
        </p>
        <p className="mt-2">
          If auditor visibility stays on, leaking or selling how someone voted should be
          punished. Pair this setting with a real penalty for sharing that information with
          the public.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || visible}
          onClick={() => void setVisible(true)}
          className={`${choiceButton} ${
            visible ? "bg-zinc-800 text-white" : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
          }`}
        >
          Auditor-visible
        </button>
        <button
          type="button"
          disabled={busy || !visible}
          onClick={() => void setVisible(false)}
          className={`${choiceButton} ${
            !visible ? "bg-zinc-800 text-white" : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
          }`}
        >
          Secret count
        </button>
      </div>
      <p className="mt-3 text-sm text-zinc-600">
        Applies to votes started after you save. A vote already open keeps the rule it started
        with. Appoint the counter the same way this organization would appoint someone to count
        paper ballots, and do that before launching a vote.
      </p>
      {!isChain && (
        <p className="mt-2 text-sm text-zinc-600">Appoint that counter under Members.</p>
      )}
      {isChain && (
        <div className="mt-4">
          <p className="text-sm font-medium text-zinc-900">Appointed counter</p>
          <p className="mt-1 text-sm text-zinc-600 break-all">
            {counter ? counter : "None appointed"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={counterInput}
              onChange={(e) => setCounterInput(e.target.value)}
              placeholder="Counter address"
              className="w-72 max-w-full rounded border border-zinc-200 bg-white p-2 text-sm text-zinc-900"
            />
            <button
              type="button"
              disabled={busy || !counterInput.trim()}
              onClick={() => void saveCounter()}
              className="rounded bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-900 disabled:opacity-50"
            >
              Save counter
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  )
}
