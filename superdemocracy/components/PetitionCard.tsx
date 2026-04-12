"use client"

import { useRoles } from "@/hooks/useRoles"
import { usePetition, useReferendumAddress } from "@/hooks/usePetitions"
import { useWriteContract } from "wagmi"
import { abi as organizationAbi } from "@/abis/Organization.json"

const organizationAddress =
  process.env.NEXT_PUBLIC_ORG_ADDRESS as `0x${string}`

export function PetitionCard({ id }: { id: bigint }) {
  const { isMember, isAdmin } = useRoles()
  const { data, refetch } = usePetition(id)
  const { data: referendumAddress } = useReferendumAddress(id)
  const { writeContractAsync } = useWriteContract()

  if (!data) return <div>Loading petition...</div>

  const {
    0: title,
    1: description,
    2: threshold,
    3: verifiedCount,
    4: approved,
    5: rejected,
    6: referendumLaunched,
  } = data as any

  async function handleSign() {
    await writeContractAsync({
      address: organizationAddress,
      abi: organizationAbi,
      functionName: "signPetition",
      args: [id],
    })
    await refetch()
  }

  async function handleApprove() {
    await writeContractAsync({
      address: organizationAddress,
      abi: organizationAbi,
      functionName: "approvePetition",
      args: [id],
    })
    await refetch()
  }

  async function handleReject() {
    await writeContractAsync({
      address: organizationAddress,
      abi: organizationAbi,
      functionName: "rejectPetition",
      args: [id],
    })
    await refetch()
  }

  async function handleLaunch() {
    const now = Math.floor(Date.now() / 1000)

    await writeContractAsync({
      address: organizationAddress,
      abi: organizationAbi,
      functionName: "launchReferendum",
      args: [
        id,
        ["Yes", "No"],
        BigInt(now),
        BigInt(now + 86400),
      ],
    })

    await refetch()
  }

  const thresholdMet = verifiedCount >= threshold

  return (
    <div className="border p-4 mb-4 rounded">
      <h2 className="text-xl font-bold">{title}</h2>
      <p>{description}</p>

      <p>
        Signatures: {verifiedCount.toString()} / {threshold.toString()}
      </p>

      <p>Approved: {approved ? "Yes" : "No"}</p>
      <p>Rejected: {rejected ? "Yes" : "No"}</p>
      <p>Referendum Launched: {referendumLaunched ? "Yes" : "No"}</p>

      <div className="mt-2 font-semibold">
        {rejected && <span className="text-red-600">Rejected</span>}
        {!rejected && !approved && <span className="text-yellow-600">Pending Approval</span>}
        {approved && !referendumLaunched && <span className="text-blue-600">Approved</span>}
        {referendumLaunched && <span className="text-green-600">Referendum Active</span>}
      </div>

      {referendumLaunched && referendumAddress && (
        <>
          <p className="mt-2 text-sm text-purple-600">
            Referendum Address: {String(referendumAddress)}
          </p>

          <a
            href={`/referendum/${referendumAddress}`}
            className="mt-1 inline-block text-purple-700 underline"
          >
            View Referendum
          </a>
        </>
      )}

      {isMember && !rejected && (
        <button
          onClick={handleSign}
          className="mt-4 mr-2 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Sign
        </button>
      )}

      {isAdmin && !approved && !rejected && (
        <>
          <button
            onClick={handleApprove}
            className="mt-4 mr-2 px-4 py-2 bg-green-600 text-white rounded"
          >
            Approve
          </button>

          <button
            onClick={handleReject}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
          >
            Reject
          </button>
        </>
      )}

      {isAdmin && approved && thresholdMet && !referendumLaunched && (
        <button
          onClick={handleLaunch}
          className="mt-4 ml-2 px-4 py-2 bg-purple-600 text-white rounded"
        >
          Launch Referendum
        </button>
      )}
    </div>
  )
}

