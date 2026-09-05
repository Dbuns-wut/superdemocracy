"use client"

import { useRoles } from "@/hooks/useRoles"
import { usePetition, useReferendumAddress } from "@/hooks/usePetitions"
import { generateMerkleRoot } from "@/lib/petition-signatures/merkle"
import type { PetitionSignature } from "@/lib/petition-signatures/types"
import { useEffect, useMemo, useState } from "react"
import { useAccount, useWriteContract } from "wagmi"
import { getAddress } from "viem"
import { abi as organizationAbi } from "@/abis/Organization.json"
import { useOptionalOrganizationAddress } from "@/contexts/OrganizationAddressContext"
import { OrgItemShareButton } from "@/components/OrgItemShareButton"

export function PetitionCard({
  id,
  organizationAddress,
  petitionCreator,
  showOrgLink,
  organizationTitle,
  orgSharePathSegment,
  onPinToOrgHome,
}: {
  id: bigint
  organizationAddress?: string
  petitionCreator?: string
  showOrgLink?: boolean
  organizationTitle?: string
  /** Route segment for `/orgs/[address]` (share links). Defaults to org contract address. */
  orgSharePathSegment?: string
  onPinToOrgHome?: (note: string) => void
}) {
  const fromContext = useOptionalOrganizationAddress()
  const resolvedRaw = organizationAddress ?? fromContext

  let org: `0x${string}` | undefined
  try {
    org = resolvedRaw ? getAddress(resolvedRaw as `0x${string}`) : undefined
  } catch {
    org = undefined
  }

  const { isMember, isAdmin } = useRoles(org)
  const { data, refetch } = usePetition(id, org)
  const { data: referendumAddress } = useReferendumAddress(id, org)
  const { address: walletAddress } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const [offchainSignatures, setOffchainSignatures] = useState<PetitionSignature[]>([])
  const [offchainCount, setOffchainCount] = useState(0)
  const [isLoadingSignatures, setIsLoadingSignatures] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)
  const [anchorStatus, setAnchorStatus] = useState<string | null>(null)
  const [submittedToAdmins, setSubmittedToAdmins] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null)
  const [detailsHover, setDetailsHover] = useState(false)
  const [detailsPinned, setDetailsPinned] = useState(false)

  const petitionId = useMemo(() => id.toString(), [id])

  async function loadSignatures(): Promise<PetitionSignature[]> {
    if (!org) return []
    setIsLoadingSignatures(true)
    try {
      const res = await fetch(
        `/api/petitions/${encodeURIComponent(org)}/${encodeURIComponent(petitionId)}/signatures`
      )
      const payload = (await res.json()) as {
        signatures?: PetitionSignature[]
        count?: number
      }
      const signatures = Array.isArray(payload.signatures) ? payload.signatures : []
      setOffchainSignatures(signatures)
      setOffchainCount(typeof payload.count === "number" ? payload.count : signatures.length)
      return signatures
    } catch {
      setOffchainSignatures([])
      setOffchainCount(0)
      return []
    } finally {
      setIsLoadingSignatures(false)
    }
  }

  async function loadSubmission() {
    if (!org) return
    try {
      const res = await fetch(
        `/api/petitions/${encodeURIComponent(org)}/${encodeURIComponent(petitionId)}/submission`
      )
      const payload = (await res.json()) as { submitted?: boolean }
      setSubmittedToAdmins(payload.submitted === true)
    } catch {
      setSubmittedToAdmins(false)
    }
  }

  useEffect(() => {
    void loadSignatures()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, petitionId])

  useEffect(() => {
    void loadSubmission()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, petitionId])

  if (!org) {
    return <p className="text-gray-600">Invalid organization address.</p>
  }

  if (!data) return <div>Loading petition...</div>

  const {
    0: title,
    1: description,
    2: threshold,
    4: approved,
    5: rejected,
    6: referendumLaunched,
  } = data as any

  async function handleSign() {
    if (!walletAddress) {
      setSignError("Connect wallet first.")
      return
    }
    setSignError(null)

    const res = await fetch("/api/petitions/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationAddress: org,
        petitionId,
        signer: walletAddress,
      }),
    })

    const payload = (await res.json()) as { error?: string }
    if (!res.ok) {
      setSignError(payload.error || "Failed to sign petition.")
      return
    }

    await loadSignatures()
  }

  async function handleApprove() {
    if (!org) return
    setAnchorStatus("Approving petition…")
    const signatures = await loadSignatures()
    const merkleRoot = generateMerkleRoot(signatures)
    const claimedCount = BigInt(signatures.length)

    await writeContractAsync({
      address: org,
      abi: organizationAbi,
      functionName: "anchorPetition",
      args: [id, merkleRoot, claimedCount],
    })
    await writeContractAsync({
      address: org,
      abi: organizationAbi,
      functionName: "approvePetition",
      args: [id],
    })
    await refetch()
    setAnchorStatus("Petition approved.")
  }

  async function handleReject() {
    if (!org) return
    await writeContractAsync({
      address: org,
      abi: organizationAbi,
      functionName: "rejectPetition",
      args: [id],
    })
    await refetch()
  }

  async function handleLaunch() {
    if (!org) return
    const now = Math.floor(Date.now() / 1000)

    await writeContractAsync({
      address: org,
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

  const thresholdMet = BigInt(offchainCount) >= threshold
  const isCreator =
    !!walletAddress &&
    !!petitionCreator &&
    walletAddress.toLowerCase() === petitionCreator.toLowerCase()
  const hasSigned =
    !!walletAddress &&
    offchainSignatures.some(
      (s) => s.signer.toLowerCase() === walletAddress.toLowerCase()
    )

  async function handleSubmitToAdmins() {
    if (!walletAddress || !org) {
      setSubmissionStatus("Connect wallet first.")
      return
    }
    if (!window.confirm("Submit this petition to admins for review?")) return
    const res = await fetch("/api/petitions/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationAddress: org,
        petitionId,
        submittedBy: walletAddress,
      }),
    })
    const payload = (await res.json()) as { error?: string }
    if (!res.ok) {
      setSubmissionStatus(payload.error || "Failed to submit petition.")
      return
    }
    setSubmissionStatus("Petition submitted to admins.")
    setSubmittedToAdmins(true)
  }

  return (
    <div className="relative border border-zinc-200 bg-zinc-50 p-4 mb-4 rounded-lg text-zinc-900">
      <div
        className="absolute top-2 right-2 z-10 flex flex-col items-end"
        onMouseEnter={() => setDetailsHover(true)}
        onMouseLeave={() => setDetailsHover(false)}
      >
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200/90 hover:text-zinc-900"
          aria-label="Petition details"
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
            aria-label="Petition details"
          >
            <p>Approved: {approved ? "Yes" : "No"}</p>
            <p>Rejected: {rejected ? "Yes" : "No"}</p>
            <p>Referendum launched: {referendumLaunched ? "Yes" : "No"}</p>
          </div>
        )}
      </div>
      {showOrgLink && (
        <p className="text-xs text-gray-500 mb-2">
          <a href={`/orgs/${org}`} className="underline hover:text-zinc-800">
            {organizationTitle?.trim()
              ? organizationTitle.trim()
              : `Organization ${org.slice(0, 6)}…${org.slice(-4)}`}
          </a>
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-2 pr-10">
        <h2 className="text-xl font-bold min-w-0 flex-1">{title}</h2>
        <OrgItemShareButton
          orgPathSegment={orgSharePathSegment ?? org}
          kind="petition"
          resourceId={petitionId}
          title={String(title)}
          description={String(description)}
          isAdmin={isAdmin}
          onPinToHomepage={onPinToOrgHome}
          className="shrink-0"
        />
      </div>
      <p>{description}</p>

      <p>
        Signatures: {isLoadingSignatures ? "..." : offchainCount.toString()} / {threshold.toString()}
      </p>
      {signError && <p className="text-sm text-red-600">{signError}</p>}
      {anchorStatus && <p className="text-sm text-zinc-700">{anchorStatus}</p>}
      {submissionStatus && <p className="text-sm text-zinc-700">{submissionStatus}</p>}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="font-semibold">
          {rejected && <span className="text-red-600">Rejected</span>}
          {!rejected && !approved && <span className="text-yellow-600">Pending Approval</span>}
          {approved && !referendumLaunched && <span className="text-blue-600">Approved</span>}
          {referendumLaunched && <span className="text-green-600">Referendum Active</span>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isMember && !rejected && !hasSigned && (
            <button
              onClick={handleSign}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Sign
            </button>
          )}

          {isMember && !rejected && hasSigned && (
            <button
              disabled
              className="px-4 py-2 bg-zinc-300 text-zinc-700 rounded cursor-not-allowed"
            >
              Signed
            </button>
          )}
          {isCreator && thresholdMet && !submittedToAdmins && !approved && !rejected && (
            <button
              onClick={handleSubmitToAdmins}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Submit
            </button>
          )}

          {isAdmin && submittedToAdmins && !approved && !rejected && (
            <>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-400"
              >
                Approve
              </button>

              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Reject
              </button>
            </>
          )}

          {isAdmin && approved && thresholdMet && !referendumLaunched && (
            <button
              onClick={handleLaunch}
              className="px-4 py-2 bg-purple-600 text-white rounded"
            >
              Launch Referendum
            </button>
          )}
        </div>
      </div>

      {referendumLaunched && referendumAddress && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-sm text-purple-600">
            Referendum: <span className="font-mono text-xs">{String(referendumAddress)}</span>
          </p>
          <a
            href={`/referendum/${referendumAddress}`}
            className="text-purple-700 underline"
          >
            View Referendum
          </a>
          <OrgItemShareButton
            orgPathSegment={orgSharePathSegment ?? org}
            kind="referendum"
            resourceId={String(referendumAddress)}
            title={`Referendum: ${String(title)}`}
            description={String(description)}
            isAdmin={isAdmin}
            onPinToHomepage={onPinToOrgHome}
            overrideSharePath={`/referendum/${referendumAddress}`}
          />
        </div>
      )}

      {submittedToAdmins && !approved && !rejected && !referendumLaunched && (
        <p className="mt-2 text-sm text-zinc-600">Submitted to admins for review.</p>
      )}
    </div>
  )
}
