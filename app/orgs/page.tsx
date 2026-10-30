"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
import { AppSidebar } from "@/components/AppSidebar"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth/use-session"
import type { CommunityOrg } from "@/lib/community-orgs/types"

type SortOrder = "newest" | "oldest" | "popular"

export default function Home() {
  const router = useRouter()
  const { account } = useSession()
  const accountId = account?.id ?? null
  const [search, setSearch] = useState("")
  const [orgs, setOrgs] = useState<CommunityOrg[]>([])
  const [orgTab, setOrgTab] = useState<"all" | "yours" | "create">("all")
  const [orgSortOrder, setOrgSortOrder] = useState<SortOrder>("newest")
  const [showOrgSort, setShowOrgSort] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [orgDetailsHoverId, setOrgDetailsHoverId] = useState<string | null>(null)
  const [orgDetailsPinnedId, setOrgDetailsPinnedId] = useState<string | null>(null)

  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch("/api/community-orgs", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setOrgs(Array.isArray(data?.orgs) ? data.orgs : [])
      })
      .catch((e) => {
        console.error("Failed to fetch organizations", e)
        if (!cancelled) setOrgs([])
      })
    return () => {
      cancelled = true
    }
  }, [accountId, reloadTick])

  useEffect(() => {
    const onFocus = () => setReloadTick((t) => t + 1)
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])

  const handleJoin = async (org: CommunityOrg) => {
    setJoinError(null)
    if (org.membershipMode === "Manual") {
      router.push(`/orgs/${encodeURIComponent(org.id)}/apply`)
      return
    }
    if (!accountId) {
      setJoinError("Sign in to join.")
      return
    }
    try {
      const res = await fetch(`/api/community-orgs/${encodeURIComponent(org.id)}/members`, {
        method: "POST",
        credentials: "include",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setJoinError(typeof err?.error === "string" ? err.error : "Join failed.")
        return
      }
      router.push(`/orgs/${encodeURIComponent(org.id)}`)
    } catch (e: unknown) {
      console.error(e)
      setJoinError("Join failed.")
    }
  }

  const filteredOrgs: CommunityOrg[] = useMemo(() => {
    let result = [...orgs]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (org) =>
          (org.title || "").toLowerCase().includes(q) || (org.description || "").toLowerCase().includes(q)
      )
    }
    if (orgSortOrder === "newest") {
      result.sort((a, b) => b.createdAt - a.createdAt)
    } else if (orgSortOrder === "oldest") {
      result.sort((a, b) => a.createdAt - b.createdAt)
    } else {
      result.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
    }
    return result
  }, [orgs, search, orgSortOrder])

  const yourOrgs = useMemo(
    () => filteredOrgs.filter((org) => org.viewerStatus === "creator" || org.viewerStatus === "member"),
    [filteredOrgs]
  )

  const renderCard = (org: CommunityOrg, mode: "all" | "yours") => {
    const isCreator = org.viewerStatus === "creator"
    const isMember = isCreator || org.viewerStatus === "member"
    const hasPending = org.viewerStatus === "pending"
    const detailsOpen = orgDetailsPinnedId === org.id || orgDetailsHoverId === org.id

    return (
      <div key={org.id} className="relative mb-6 p-6 border border-zinc-200 rounded bg-zinc-50 text-zinc-900">
        <div
          className="absolute top-2 right-2 z-10 flex flex-col items-end"
          onMouseEnter={() => setOrgDetailsHoverId(org.id)}
          onMouseLeave={() => setOrgDetailsHoverId(null)}
        >
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200/90 hover:text-zinc-900"
            aria-label="Organization details"
            aria-expanded={detailsOpen}
            onClick={(e) => {
              e.stopPropagation()
              setOrgDetailsPinnedId((cur) => (cur === org.id ? null : org.id))
            }}
          >
            <span className="text-xl leading-none" aria-hidden>
              ⋯
            </span>
          </button>
          {detailsOpen && (
            <div
              className="mt-1 w-[min(18rem,calc(100vw-3rem))] rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-xs leading-snug text-zinc-600 shadow-md"
              role="region"
              aria-label="Organization details"
            >
              <p>{org.kind === "governance" ? "Governance organization" : "Community organization"}</p>
              <p className="mt-1">
                Membership: {org.membershipMode === "Manual" ? "Manual approval" : org.membershipMode}
              </p>
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-2">{org.title || "Untitled Organization"}</h3>
          <p className="text-gray-400 mb-4 line-clamp-3">{org.description || "No description provided"}</p>
          <div className="text-sm text-gray-500">
            {`Members: ${org.memberCount || 1}`}
            {isCreator && " • You are the creator"}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          {isMember || mode === "yours" ? (
            <button
              type="button"
              onClick={() => {
                window.location.href = `/orgs/${encodeURIComponent(org.id)}`
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Enter
            </button>
          ) : hasPending ? (
            <button type="button" disabled className="px-6 py-2 bg-gray-600 text-white rounded cursor-not-allowed">
              Request Sent
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleJoin(org)}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Join
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <AppSidebar active="orgs" />

      <div className="ml-48 flex-1 p-6">
        <h1 className="text-2xl font-bold mb-2 text-center w-full">Organizations</h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          Join an organization to take part in its votes and polls.
        </p>

        <div className="mb-6 flex justify-center">
          <div className="flex w-2/3 items-center gap-2 relative">
            <input
              type="text"
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
            />

            <div className="relative">
              <button
                onClick={() => setShowOrgSort(!showOrgSort)}
                className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
              >
                Sort
              </button>

              {showOrgSort && (
                <div className="absolute right-0 mt-2 bg-white border border-zinc-200 rounded shadow-lg z-10">
                  {(
                    [
                      ["newest", "Newest"],
                      ["oldest", "Oldest"],
                      ["popular", "Most Popular"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setOrgSortOrder(key)
                        setShowOrgSort(false)
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-100 text-zinc-900"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-4 justify-center">
          {(
            [
              ["all", "All"],
              ["yours", "Yours"],
              ["create", "Create"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setOrgTab(key)}
              className={`px-4 py-2 rounded ${
                orgTab === key
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {joinError && <p className="mb-4 text-center text-sm text-red-700">{joinError}</p>}

        {orgTab === "create" && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-400 mb-8 text-center max-w-md">Set your custom membership rules</p>
            <button
              onClick={() => (window.location.href = "/orgs/new")}
              className="px-10 py-4 bg-blue-600 text-white text-lg font-medium rounded hover:bg-blue-700 transition-colors"
            >
              Create New Organization
            </button>
          </div>
        )}

        {orgTab === "all" && filteredOrgs.map((org) => renderCard(org, "all"))}

        {orgTab === "yours" &&
          (!accountId ? (
            <p className="text-center text-sm text-zinc-500">Sign in to see your organizations.</p>
          ) : yourOrgs.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">You have not joined an organization yet.</p>
          ) : (
            yourOrgs.map((org) => renderCard(org, "yours"))
          ))}
      </div>
    </div>
  )
}
