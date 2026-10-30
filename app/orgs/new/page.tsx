"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth/use-session"
import type { OrgKind } from "@/lib/community-orgs/types"

export default function CreateOrganization() {
  const router = useRouter()
  const { account } = useSession()

  const [orgTitle, setOrgTitle] = useState("")
  const [orgDescription, setOrgDescription] = useState("")
  const [orgMode, setOrgMode] = useState<"Open" | "Manual" | "Automatic">("Open")
  const [orgKind, setOrgKind] = useState<OrgKind>("community")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const handleCreate = async () => {
    setCreateError("")
    if (!orgTitle.trim() || !orgDescription.trim()) {
      setCreateError("Title and description are required.")
      return
    }
    if (!account) {
      setCreateError("Sign in before creating an organization.")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/community-orgs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: orgTitle.trim(),
          description: orgDescription.trim(),
          membershipMode: orgMode,
          kind: orgKind,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCreateError(typeof data?.error === "string" ? data.error : "The organization was not created.")
        return
      }
      if (data?.org?.id) {
        router.push(`/orgs/${data.org.id}`)
        return
      }
      setCreateError("The organization was created, but this page could not open it.")
    } catch {
      setCreateError("The organization was not created.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push("/orgs")}
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
                value={orgKind}
                onChange={(e) => setOrgKind(e.target.value === "governance" ? "governance" : "community")}
                className="w-full p-3 border border-zinc-200 rounded bg-white text-zinc-900"
              >
                <option value="community">Community</option>
                <option value="governance">Governance</option>
              </select>
              <p className="mt-2 text-sm text-zinc-500">
                {orgKind === "governance"
                  ? "Governance: the stricter rules stay on. Members must read Perspectives before a ballot is accepted, and that cannot be turned off."
                  : "Community: polls, discussion, and votes with rules this organization chooses."}
              </p>
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

            {createError ? <p className="text-sm text-red-700">{createError}</p> : null}

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
