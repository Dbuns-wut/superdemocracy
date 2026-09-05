"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import { AppSidebar } from "@/components/AppSidebar"
import { PetitionCard } from "@/components/PetitionCard"
import { useAccount, usePublicClient } from "wagmi"
import { decodeEventLog } from "viem"
import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { abi as organizationAbi } from "@/abis/Organization.json"
import { abi as registryAbi } from "@/abis/GroupRegistry.json"
import { safeAddress } from "@/lib/address"
import { normalizeOrgId } from "@/lib/org-id"
import { getOrgProfileLogoUrl } from "@/lib/org-home-local"
import { useOrgShortcutIcons } from "@/hooks/useOrgShortcutIcons"

const registryAddress = process.env.NEXT_PUBLIC_GROUP_REGISTRY as `0x${string}`

type PetitionFeedItem = {
  orgAddress: `0x${string}`
  petitionId: number
  title: string
  creator: string
  blockNumber: bigint
}

function PetitionsMain() {
  const searchParams = useSearchParams()
  const orgQ = searchParams.get("org") ?? ""
  const orgAddrFromQuery = safeAddress(orgQ)
  const offchainIdFromQuery =
    !orgAddrFromQuery && orgQ.trim() ? normalizeOrgId(orgQ) : null
  const orgKeyForBranding = orgAddrFromQuery ?? offchainIdFromQuery
  const [brandLogo, setBrandLogo] = useState<string | null>(null)
  const [brandingMounted, setBrandingMounted] = useState(false)

  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [orgs, setOrgs] = useState<any[]>([])
  const [petitionFeed, setPetitionFeed] = useState<PetitionFeedItem[]>([])
  const [signedPetitionKeys, setSignedPetitionKeys] = useState<Set<string>>(
    new Set()
  )
  const [petitionPollTick, setPetitionPollTick] = useState(0)
  const [search, setSearch] = useState("")
  const [sortOrder, setSortOrder] = useState("newest")
  const [showSort, setShowSort] = useState(false)
  const [tab, setTab] = useState("all")

  useEffect(() => {
    setBrandingMounted(true)
  }, [])

  useEffect(() => {
    if (!orgKeyForBranding) {
      setBrandLogo(null)
      return
    }
    const logo = getOrgProfileLogoUrl(orgKeyForBranding)
    setBrandLogo(logo ? logo : null)
  }, [orgKeyForBranding])

  useOrgShortcutIcons(
    brandLogo,
    brandingMounted && !!orgKeyForBranding && !!brandLogo?.trim()
  )

  useEffect(() => {
    const onFocus = () => setPetitionPollTick((t) => t + 1)
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])

  useEffect(() => {
    if (!publicClient || !registryAddress) return

    const fetchOrgs = async () => {
      try {
        const logs = await publicClient.getLogs({
          address: registryAddress,
          fromBlock: 0n,
          toBlock: "latest",
        })

        const foundOrgs: any[] = []

        for (const log of logs) {
          try {
            const decoded = decodeEventLog({
              abi: registryAbi,
              data: log.data,
              topics: log.topics,
            })

            if (decoded.eventName === "GroupCreated" && decoded.args) {
              const args = decoded.args as unknown as {
                group?: string
                creator?: string
                title?: string
                description?: string
              }
              const rawGroupAddr = args.group
              const normalizedAddr = safeAddress(rawGroupAddr)

              if (!normalizedAddr) {
                console.warn("Skipping group with invalid address:", rawGroupAddr)
                continue
              }

              foundOrgs.push({
                address: normalizedAddr,
                creator: args.creator,
                title: args.title || "Untitled Organization",
                description: args.description || "No description provided",
                memberCount: 1,
              })
            }
          } catch (err) {
            console.error("Failed to decode GroupCreated log", err)
          }
        }

        setOrgs(foundOrgs)
      } catch (err) {
        console.error("Failed to fetch orgs", err)
      }
    }

    fetchOrgs()
  }, [publicClient])

  useEffect(() => {
    if (!publicClient) return
    const list = orgs as { address: string }[]
    if (!list.length) {
      setPetitionFeed([])
      setSignedPetitionKeys(new Set())
      return
    }
    let cancelled = false
    ;(async () => {
      const items: PetitionFeedItem[] = []
      const signed = new Set<string>()
      const user = address?.toLowerCase()
      for (const org of list) {
        const addr = safeAddress(org.address)
        if (!addr) continue
        try {
          const logs = await publicClient.getLogs({
            address: addr,
            fromBlock: 0n,
            toBlock: "latest",
          })
          for (const log of logs) {
            try {
              const decoded = decodeEventLog({
                abi: organizationAbi,
                data: log.data,
                topics: log.topics,
              })
              if (decoded.eventName === "PetitionCreated" && decoded.args) {
                const args = decoded.args as unknown as {
                  petitionId: bigint
                  creator: string
                  title: string
                }
                items.push({
                  orgAddress: addr,
                  petitionId: Number(args.petitionId),
                  title: args.title,
                  creator: args.creator,
                  blockNumber: log.blockNumber,
                })
              } else if (decoded.eventName === "PetitionSigned" && user && decoded.args) {
                const args = decoded.args as unknown as {
                  petitionId: bigint
                  signer: string
                }
                if (args.signer?.toLowerCase() === user) {
                  signed.add(`${addr.toLowerCase()}:${Number(args.petitionId)}`)
                }
              }
            } catch {
              /* ignore unknown logs */
            }
          }
        } catch (e) {
          console.error("Failed to load petition logs for org", addr, e)
        }
      }
      if (cancelled) return
      items.sort((a, b) =>
        a.blockNumber === b.blockNumber
          ? 0
          : a.blockNumber > b.blockNumber
            ? -1
            : 1
      )
      setPetitionFeed(items)
      setSignedPetitionKeys(signed)
    })()
    return () => {
      cancelled = true
    }
  }, [publicClient, orgs, address, petitionPollTick])

  const orgTitleByAddress = useMemo(() => {
    const m = new Map<string, string>()
    for (const o of orgs) {
      const a = safeAddress(o.address)
      if (!a) continue
      const t =
        (o.title && String(o.title).trim()) || "Untitled Organization"
      m.set(a.toLowerCase(), t)
    }
    return m
  }, [orgs])

  const filteredPetitions = useMemo(() => {
    return petitionFeed
      .filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortOrder === "newest")
          return a.blockNumber > b.blockNumber ? -1 : 1
        if (sortOrder === "oldest")
          return a.blockNumber < b.blockNumber ? -1 : 1
        if (sortOrder === "popular")
          return a.blockNumber > b.blockNumber ? -1 : 1
        return 0
      })
  }, [petitionFeed, search, sortOrder])

  const yourPetitions = useMemo(
    () =>
      filteredPetitions.filter(
        (e) => e.creator.toLowerCase() === address?.toLowerCase()
      ),
    [filteredPetitions, address]
  )

  const signedPetitions = useMemo(
    () =>
      filteredPetitions.filter((e) =>
        signedPetitionKeys.has(
          `${e.orgAddress.toLowerCase()}:${e.petitionId}`
        )
      ),
    [filteredPetitions, signedPetitionKeys]
  )

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <AppSidebar active="petitions" brandLogoSrc={brandLogo} />

      <div className="ml-48 flex-1 p-6">
        <h1 className="text-2xl font-bold mb-2 text-center w-full">
          All petitions
        </h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          Create a new petition from an organization&apos;s{" "}
          <span className="font-medium text-zinc-700">Petitions → Create</span>{" "}
          tab.
        </p>

        <div className="mb-6 flex justify-center">
          <div className="flex w-2/3 items-center gap-2 relative">
            <input
              type="text"
              placeholder="Search petitions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 p-2 border border-zinc-200 rounded bg-white text-zinc-900 placeholder:text-zinc-500"
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSort(!showSort)}
                className="px-3 py-2 bg-zinc-200 text-zinc-900 rounded hover:bg-zinc-300"
              >
                Sort
              </button>

              {showSort && (
                <div className="absolute right-0 mt-2 bg-white border border-zinc-200 rounded shadow-lg z-10">
                  <button
                    type="button"
                    onClick={() => {
                      setSortOrder("newest")
                      setShowSort(false)
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-zinc-100 text-zinc-900"
                  >
                    Newest
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortOrder("oldest")
                      setShowSort(false)
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-zinc-100 text-zinc-900"
                  >
                    Oldest
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSortOrder("popular")
                      setShowSort(false)
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-zinc-100 text-zinc-900"
                  >
                    Most Popular
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-4 justify-center">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`px-4 py-2 rounded ${
              tab === "all"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setTab("signed")}
            className={`px-4 py-2 rounded ${
              tab === "signed"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
            }`}
          >
            Signed
          </button>

          <button
            type="button"
            onClick={() => setTab("yours")}
            className={`px-4 py-2 rounded ${
              tab === "yours"
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-zinc-200 text-zinc-900 hover:bg-zinc-300"
            }`}
          >
            Yours
          </button>
        </div>

        {tab === "signed" &&
          signedPetitions.map((e) => (
            <PetitionCard
              key={`${e.orgAddress}-${e.petitionId}`}
              id={BigInt(e.petitionId)}
              organizationAddress={e.orgAddress}
              petitionCreator={e.creator}
              organizationTitle={orgTitleByAddress.get(
                e.orgAddress.toLowerCase()
              )}
              showOrgLink
            />
          ))}

        {tab === "yours" &&
          yourPetitions.map((e) => (
            <PetitionCard
              key={`${e.orgAddress}-${e.petitionId}`}
              id={BigInt(e.petitionId)}
              organizationAddress={e.orgAddress}
              petitionCreator={e.creator}
              organizationTitle={orgTitleByAddress.get(
                e.orgAddress.toLowerCase()
              )}
              showOrgLink
            />
          ))}

        {tab === "all" &&
          filteredPetitions.map((e) => (
            <PetitionCard
              key={`${e.orgAddress}-${e.petitionId}`}
              id={BigInt(e.petitionId)}
              organizationAddress={e.orgAddress}
              petitionCreator={e.creator}
              organizationTitle={orgTitleByAddress.get(
                e.orgAddress.toLowerCase()
              )}
              showOrgLink
            />
          ))}
      </div>
    </div>
  )
}

export default function PetitionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-zinc-600">
          Loading petitions…
        </div>
      }
    >
      <PetitionsMain />
    </Suspense>
  )
}
