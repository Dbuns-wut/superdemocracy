"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePeople } from "@/lib/people/use-people"
import type { PetitionView } from "@/lib/petitions/types"

const STATUS_LABEL: Record<PetitionView["status"], string> = {
  open: "Collecting support",
  approved: "Approved — ready to launch",
  rejected: "Rejected",
  launched: "Referendum launched",
}

export function OrgPetitionsPanel({
  orgId,
  isAdmin,
  isMember,
  signedIn,
}: {
  orgId: string
  isAdmin: boolean
  isMember: boolean
  signedIn: boolean
}) {
  const [petitions, setPetitions] = useState<PetitionView[]>([])
  const [threshold, setThreshold] = useState(1)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [launchFor, setLaunchFor] = useState<string | null>(null)
  const [launchStart, setLaunchStart] = useState("")
  const [launchEnd, setLaunchEnd] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  const peopleIds = useMemo(() => {
    const ids = new Set<string>()
    for (const petition of petitions) {
      ids.add(petition.creatorId)
      for (const signer of petition.signers ?? []) ids.add(signer.accountId)
      for (const removed of petition.removed ?? []) ids.add(removed.accountId)
    }
    return [...ids]
  }, [petitions])
  const { nameOf } = usePeople(peopleIds)

  const load = useCallback(async () => {
    setError("")
    try {
      const res = await fetch(`/api/petitions?orgId=${encodeURIComponent(orgId)}`, {
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not load petitions.")
        setLoading(false)
        return
      }
      setPetitions(Array.isArray(data.petitions) ? data.petitions : [])
      setThreshold(typeof data.threshold === "number" ? data.threshold : 1)
      setEnabled(Boolean(data.enabled))
    } catch {
      setError("Could not load petitions. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    void load()
  }, [load])

  function replacePetition(next: PetitionView) {
    setPetitions((prev) => {
      const idx = prev.findIndex((row) => row.id === next.id)
      if (idx < 0) return [next, ...prev]
      const copy = [...prev]
      copy[idx] = next
      return copy
    })
  }

  async function create() {
    setNotice("")
    setError("")
    const cleaned = options.map((option) => option.trim()).filter(Boolean)
    if (!title.trim() || !description.trim() || cleaned.length < 2) {
      setError("Title, description, and at least two options are required.")
      return
    }
    setBusyId("create")
    try {
      const res = await fetch("/api/petitions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, title: title.trim(), description: description.trim(), options: cleaned }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.petition) {
        setError(typeof data.error === "string" ? data.error : "Could not start the petition.")
        return
      }
      replacePetition(data.petition as PetitionView)
      setTitle("")
      setDescription("")
      setOptions(["", ""])
      setShowForm(false)
      setNotice("Petition started. Your name is the first one on it.")
    } catch {
      setError("Could not start the petition. Check your connection and try again.")
    } finally {
      setBusyId(null)
    }
  }

  async function post(petitionId: string, path: string, body?: unknown) {
    setNotice("")
    setError("")
    setBusyId(petitionId)
    try {
      const res = await fetch(`/api/petitions/${encodeURIComponent(petitionId)}/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.petition) {
        setError(typeof data.error === "string" ? data.error : "That did not go through.")
        return false
      }
      replacePetition(data.petition as PetitionView)
      return true
    } catch {
      setError("Could not reach the server. Check your connection and try again.")
      return false
    } finally {
      setBusyId(null)
    }
  }

  if (!signedIn) {
    return <p className="text-sm text-zinc-600">Sign in to see petitions.</p>
  }
  if (!isMember) {
    return <p className="text-sm text-zinc-600">Join this organization to see petitions.</p>
  }
  if (loading) return <p className="text-sm text-zinc-500">Loading petitions…</p>

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl">Petitions</h2>
        <p className="mt-1 text-sm text-zinc-600">
          A member starts a petition. When {threshold} current {threshold === 1 ? "member has" : "members have"} signed,
          the administrator can approve it and launch a referendum. You can see your own name on a petition. The
          appointed counter can see who else signed. Other members see the count.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-zinc-700">{notice}</p>}
      {!enabled && (
        <p className="text-sm text-zinc-600">
          Petitions are off for this organization. An administrator can turn them on in Settings.
        </p>
      )}
      {enabled && isMember && !showForm && (
        <button
          type="button"
          onClick={() => {
            setShowForm(true)
            setError("")
          }}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        >
          Start a petition
        </button>
      )}
      {showForm && (
        <div className="rounded border border-zinc-200 p-6">
          <h3 className="mb-3 text-lg">Start a petition</h3>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What should the organization vote on?"
            className="mb-2 w-full rounded border border-zinc-200 bg-white p-2 text-zinc-900 placeholder:text-zinc-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Why this question, in a few sentences."
            className="mb-2 w-full rounded border border-zinc-200 bg-white p-2 text-zinc-900 placeholder:text-zinc-500"
          />
          {options.map((option, index) => (
            <input
              key={index}
              value={option}
              onChange={(e) =>
                setOptions((prev) => prev.map((row, i) => (i === index ? e.target.value : row)))
              }
              placeholder={`Option ${index + 1}`}
              className="mb-2 w-full rounded border border-zinc-200 bg-white p-2 text-zinc-900 placeholder:text-zinc-500"
            />
          ))}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOptions((prev) => [...prev, ""])}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
            >
              Add option
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setError("")
              }}
              className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busyId === "create"}
              onClick={() => void create()}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busyId === "create" ? "Starting…" : "Start petition"}
            </button>
          </div>
        </div>
      )}
      {enabled && petitions.length === 0 && <p className="text-sm text-zinc-500">No petitions yet.</p>}
      {petitions.map((petition) => (
        <div key={petition.id} className="rounded border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500">{new Date(petition.createdAt).toLocaleString()}</p>
          <p className="mt-1 font-medium text-zinc-900">{petition.title}</p>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{petition.description}</p>
          <p className="mt-2 text-sm text-zinc-600">Started by {nameOf(petition.creatorId)}</p>
          <p className="mt-1 text-sm text-zinc-800">
            {petition.support} of {petition.threshold} signed · {STATUS_LABEL[petition.status]}
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-zinc-700">
            {petition.options.map((option) => (
              <li key={option}>{option}</li>
            ))}
          </ul>
          {petition.signedAt && (
            <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              You signed this · {new Date(petition.signedAt).toLocaleString()}
            </p>
          )}
          {petition.signers && (
            <div className="mt-3 text-sm text-zinc-700">
              <p className="font-medium">Counter review — who signed</p>
              <ul className="mt-1 list-disc pl-5">
                {petition.signers.map((signer) => (
                  <li key={signer.accountId}>
                    {nameOf(signer.accountId)} · {new Date(signer.signedAt).toLocaleString()}
                  </li>
                ))}
              </ul>
              {petition.removed && petition.removed.length > 0 && (
                <>
                  <p className="mt-2 font-medium">Removed from the count</p>
                  <ul className="mt-1 list-disc pl-5">
                    {petition.removed.map((row) => (
                      <li key={`${row.accountId}-${row.removedAt}`}>
                        {nameOf(row.accountId)} · no longer a member · {new Date(row.removedAt).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {enabled && petition.status === "open" && !petition.signedAt && (
              <button
                type="button"
                disabled={busyId === petition.id}
                onClick={() => void post(petition.id, "sign").then((ok) => ok && setNotice("You signed this petition."))}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Sign
              </button>
            )}
            {isAdmin && petition.status === "open" && (
              <>
                <button
                  type="button"
                  disabled={busyId === petition.id}
                  onClick={() =>
                    void post(petition.id, "decision", { action: "approve" }).then(
                      (ok) => ok && setNotice("Petition approved. You can launch the referendum.")
                    )
                  }
                  className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-900 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === petition.id}
                  onClick={() =>
                    void post(petition.id, "decision", { action: "reject" }).then(
                      (ok) => ok && setNotice("Petition rejected. The record is kept.")
                    )
                  }
                  className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            {isAdmin && petition.status === "approved" && launchFor !== petition.id && (
              <button
                type="button"
                onClick={() => setLaunchFor(petition.id)}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                Launch referendum
              </button>
            )}
          </div>
          {isAdmin && petition.status === "approved" && launchFor === petition.id && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-sm text-zinc-700">
                <span className="mb-1 block">Opens</span>
                <input
                  type="datetime-local"
                  value={launchStart}
                  onChange={(e) => setLaunchStart(e.target.value)}
                  className="rounded border border-zinc-200 bg-white p-2 text-zinc-900"
                />
              </label>
              <label className="text-sm text-zinc-700">
                <span className="mb-1 block">Closes</span>
                <input
                  type="datetime-local"
                  value={launchEnd}
                  onChange={(e) => setLaunchEnd(e.target.value)}
                  className="rounded border border-zinc-200 bg-white p-2 text-zinc-900"
                />
              </label>
              <button
                type="button"
                disabled={busyId === petition.id}
                onClick={() => {
                  const startTime = new Date(launchStart).getTime()
                  const endTime = new Date(launchEnd).getTime()
                  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
                    setError("Enter an open and close time, with close after open.")
                    return
                  }
                  void post(petition.id, "launch", { startTime, endTime, allowVoteChange: false }).then((ok) => {
                    if (!ok) return
                    setLaunchFor(null)
                    setNotice("Referendum launched.")
                  })
                }}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Launch
              </button>
              <button
                type="button"
                onClick={() => setLaunchFor(null)}
                className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
