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
  useBlockNumber,
} from "wagmi"
import { abi as referendumAbi } from "@/abis/Referendum.json"
import { safeAddress, shortAddress } from "@/lib/address"
import { waitForTransactionReceipt } from "wagmi/actions"
import { config } from "@/lib/web3"
import VoteBar from "@/components/VoteBar"
import type { Perspective } from "@/lib/education/types"

export default function ReferendumPage() {
  const params = useParams()
  const paramAddress = Array.isArray(params?.address)
    ? params.address[0]
    : params?.address
  const contractAddress = safeAddress(paramAddress)
  const { address } = useAccount()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const [mounted, setMounted] = React.useState(false)
  const [isVoting, setIsVoting] = React.useState(false)
  const [votingOpen, setVotingOpen] = React.useState(false)
  const [detailsHover, setDetailsHover] = React.useState(false)
  const [detailsPinned, setDetailsPinned] = React.useState(false)
  const [perspectivesOpen, setPerspectivesOpen] = React.useState(false)
  const [perspectives, setPerspectives] = React.useState<Perspective[]>([])
  const [perspectivesLoading, setPerspectivesLoading] = React.useState(false)
  const [ackPending, setAckPending] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!contractAddress) return
    let cancelled = false
    ;(async () => {
      setPerspectivesLoading(true)
      try {
        const res = await fetch(`/api/education/${encodeURIComponent(contractAddress)}`)
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok && Array.isArray(data?.education?.perspectives)) {
          setPerspectives(data.education.perspectives)
        }
      } finally {
        if (!cancelled) setPerspectivesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [contractAddress])

  const { data: totalVotes } = useReadContract({
    address: contractAddress,
    abi: referendumAbi,
    functionName: "totalVotes",
    query: { enabled: !!contractAddress },
    blockNumber,
  })

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

  const { data: hasAcked } = useReadContract({
    address: contractAddress,
    abi: referendumAbi,
    functionName: "hasAcknowledgedEducation",
    args: address ? [address] : undefined,
    query: { enabled: !!contractAddress && !!address },
    blockNumber,
  })

  let readableStatus = "Loading..."
  if (status === 0) readableStatus = "Not Started"
  if (status === 1) readableStatus = "Active"
  if (status === 2) readableStatus = "Ended"
  const statusTone =
    readableStatus === "Active"
      ? "text-green-600"
      : readableStatus === "Ended"
        ? "text-zinc-600"
        : "text-yellow-600"

  const { connect, connectors } = useConnect()
  const { writeContractAsync } = useWriteContract()

  const detailTuple = details as readonly [string, string, string[]] | undefined
  const title = detailTuple?.[0]
  const description = detailTuple?.[1]
  const options = detailTuple?.[2]

  const handleVote = async (i: number) => {
    if (!contractAddress || !options) return
    if (!hasAcked) {
      setPerspectivesOpen(true)
      return
    }
    setIsVoting(true)
    try {
      const ranking = options.map((_: string, index: number) => (index === i ? 0 : 1))
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: referendumAbi,
        functionName: "vote",
        args: [ranking],
      })
      await waitForTransactionReceipt(config, { hash })
    } finally {
      setIsVoting(false)
    }
  }

  const handleAcknowledge = async () => {
    if (!contractAddress) return
    setAckPending(true)
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: referendumAbi,
        functionName: "acknowledgeEducation",
      })
      await waitForTransactionReceipt(config, { hash })
      setPerspectivesOpen(false)
    } finally {
      setAckPending(false)
    }
  }

  const currentVote =
    ballot !== undefined && options ? options[Number(ballot)] : null

  const { data: optionVoteReads } = useReadContracts({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts: (options?.map((_: string, i: number) => ({
      address: contractAddress!,
      abi: referendumAbi,
      functionName: "optionVotes" as const,
      args: [i] as const,
    })) ?? []) as any,
    query: { enabled: !!contractAddress && !!options?.length },
  })

  const voteCounts = optionVoteReads?.map((r) => Number(r.result ?? 0)) ?? []
  const totalVotesCount = voteCounts.reduce((a, b) => a + b, 0)

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-white text-zinc-900 p-6">
      <h1 className="text-2xl font-bold">Referendum</h1>
      <div className="relative mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-zinc-900">
        <div
          className="absolute top-2 right-2 z-10 flex flex-col items-end"
          onMouseEnter={() => setDetailsHover(true)}
          onMouseLeave={() => setDetailsHover(false)}
        >
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200/90 hover:text-zinc-900"
            aria-label="Referendum details"
            aria-expanded={detailsPinned || detailsHover}
            onClick={(e) => {
              e.stopPropagation()
              setDetailsPinned((prev) => !prev)
            }}
          >
            <span className="text-xl leading-none" aria-hidden>
              ⋯
            </span>
          </button>
          {(detailsPinned || detailsHover) && (
            <div
              className="mt-1 w-[min(18rem,calc(100vw-3rem))] rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-xs leading-snug text-zinc-600 shadow-md"
              role="region"
              aria-label="Referendum details"
            >
              <p>Status: {readableStatus}</p>
              <p>Id: {contractAddress ? shortAddress(contractAddress) : "—"}</p>
              <p>You: {address ? shortAddress(address) : "Not connected"}</p>
            </div>
          )}
        </div>

        <h2 className="text-xl font-semibold pr-10">{title}</h2>
        <p className="mt-2">{description}</p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className={`font-semibold ${statusTone}`}>{readableStatus}</div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPerspectivesOpen(true)}
              className="rounded bg-amber-500 px-4 py-2 text-white hover:bg-amber-600"
            >
              {hasAcked ? "Perspectives" : "Read perspectives"}
            </button>
            {!address && (
              <button
                type="button"
                onClick={() => connect({ connector: connectors[0] })}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Connect
              </button>
            )}
            {readableStatus === "Active" && address && (
              <button
                type="button"
                onClick={() => {
                  if (!hasAcked) {
                    setPerspectivesOpen(true)
                    return
                  }
                  setVotingOpen(!votingOpen)
                }}
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                {currentVote ? "Change vote" : "Vote"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-16">
          <div>
            <h3 className="font-semibold">Results</h3>
            <div className="mt-4 flex items-end gap-6">
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
            {Boolean(votingOpen && readableStatus === "Active" && address && hasAcked) && (
              <div className="mt-4 space-y-2">
                {options?.map((option: string, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => void handleVote(i)}
                    disabled={isVoting}
                    className={`block rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 ${
                      currentVote === option ? "opacity-50" : ""
                    } ${isVoting ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {currentVote && <div className="mt-2 font-semibold">Your vote: {currentVote}</div>}

        <div className="mt-1 text-sm text-zinc-600">
          Ballots: {totalVotes !== undefined ? Number(totalVotes) : "…"}
        </div>

        {isVoting && <div className="mt-2 text-sm text-zinc-600">Submitting…</div>}
      </div>

      {perspectivesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-zinc-900">Perspectives</h2>
            <div className="mt-4 space-y-4">
              {perspectivesLoading ? (
                <p className="text-sm text-zinc-500">Loading…</p>
              ) : perspectives.length === 0 ? (
                <p className="text-sm text-zinc-500">No perspectives published.</p>
              ) : (
                perspectives.map((p) => (
                  <section key={p.id}>
                    <h3 className="font-medium text-zinc-900">{p.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{p.body}</p>
                  </section>
                ))
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPerspectivesOpen(false)}
                className="rounded bg-zinc-200 px-4 py-2 text-zinc-900 hover:bg-zinc-300"
              >
                Close
              </button>
              {address && !hasAcked && (
                <button
                  type="button"
                  disabled={ackPending || perspectivesLoading}
                  onClick={() => void handleAcknowledge()}
                  className="rounded bg-amber-500 px-4 py-2 text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {ackPending ? "Confirming…" : "I have read these"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
