"use client"

import { useState } from "react"
import { SettingWarningModal, type SettingWarning } from "@/components/SettingWarningModal"
import type { CommunityOrg } from "@/lib/community-orgs/types"

const choiceButton =
  "rounded px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"

const SECRET_COUNT_WARNING: SettingWarning = {
  title: "Switch to a secret count?",
  affects:
    "Votes started after this change will not keep a link between a person and their choice. The appointed counter will not be able to check a disputed result person by person.",
  pros: [
    "Each person's choice is untraceable, even to the counter.",
    "Nothing to leak about how an individual voted.",
  ],
  cons: [
    "A disputed count cannot be checked person by person.",
    "A member cannot later be shown what was recorded for them beyond that they took part.",
  ],
  confirmLabel: "Use a secret count",
}

const AUDITOR_VISIBLE_WARNING: SettingWarning = {
  title: "Switch to auditor-visible ballots?",
  affects:
    "Votes started after this change will keep a link between each person and their choice. Only the appointed counter can open it, and only during a verification window.",
  pros: [
    "A disputed result can be checked person by person, like a bank tracing a payment.",
    "Each member can review their own recorded choice.",
  ],
  cons: [
    "How someone voted exists as a record. Leaking or selling it must be punished by the organization.",
    "The counter must be someone members trust, and not the admin.",
  ],
  confirmLabel: "Use auditor-visible ballots",
}

type Props = {
  isAdmin: boolean
  org: CommunityOrg | null
  onCommunityOrg: (org: CommunityOrg) => void
}

export function AuditorVisibilityCard({ isAdmin, org, onCommunityOrg }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [pending, setPending] = useState<{ enabled: boolean; warning: SettingWarning } | null>(null)

  if (!isAdmin || !org) return null

  const visible = org.auditorVisibleBallots !== false

  async function setVisible(enabled: boolean) {
    if (!org) return
    setError("")
    setBusy(true)
    try {
      const res = await fetch(`/api/community-orgs/${encodeURIComponent(org.id)}/auditor-visibility`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ auditorVisibleBallots: enabled }),
      })
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
      setPending(null)
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
          onClick={() => setPending({ enabled: true, warning: AUDITOR_VISIBLE_WARNING })}
          className={`${choiceButton} ${
            visible ? "bg-zinc-800 text-white" : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
          }`}
        >
          Auditor-visible
        </button>
        <button
          type="button"
          disabled={busy || !visible}
          onClick={() => setPending({ enabled: false, warning: SECRET_COUNT_WARNING })}
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
      <p className="mt-2 text-sm text-zinc-600">Appoint that counter under Members.</p>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <SettingWarningModal
        warning={pending?.warning ?? null}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void setVisible(pending.enabled)
        }}
      />
    </div>
  )
}
