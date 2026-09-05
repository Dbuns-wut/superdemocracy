"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
import Link from "next/link"
import { AppSidebar } from "@/components/AppSidebar"
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContracts } from "wagmi"
import { usePublicClient } from "wagmi"
import { decodeEventLog } from "viem"
import { useState, useEffect, useMemo, useCallback } from "react"
import { abi as registryAbi } from "@/abis/GroupRegistry.json"
import { safeAddress } from "@/lib/address";
import type { CommunityOrg } from "@/lib/community-orgs/types"

const registryAddress = process.env.NEXT_PUBLIC_GROUP_REGISTRY as `0x${string}`

type HomeOrg = {
  isCommunity: boolean
  address: string
  title: string
  description: string
  memberCount: number
  creator?: `0x${string}` | string
  createdAt: number
  communityMembershipMode?: CommunityOrg["membershipMode"]
  viewerStatus?: CommunityOrg["viewerStatus"]
}

export default function Home() {
  // Main write hook for createGroup
  const { writeContract, data: hash } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  // Join contract hook
  const { writeContract: writeJoin, data: joinHash } = useWriteContract()
  const { isSuccess: joinSuccess } = useWaitForTransactionReceipt({ 
    hash: joinHash 
  })

  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [search, setSearch] = useState("")
  const [chainOrgs, setChainOrgs] = useState<any[]>([])
  const [communityOrgs, setCommunityOrgs] = useState<CommunityOrg[]>([])
  const [orgTab, setOrgTab] = useState('all')
  const [orgTitle, setOrgTitle] = useState("")
  const [orgDescription, setOrgDescription] = useState("")
  const [orgMode, setOrgMode] = useState<"Open" | "ApprovalRequired">("Open")
  const [orgSortOrder, setOrgSortOrder] = useState<"newest" | "oldest" | "popular">("newest")
  const [showOrgSort, setShowOrgSort] = useState(false)
  const [updatingOrgs, setUpdatingOrgs] = useState<Set<string>>(new Set());
  const [applications, setApplications] = useState<any[]>([]);
  const [orgDetailsHoverId, setOrgDetailsHoverId] = useState<string | null>(null);
  const [orgDetailsPinnedId, setOrgDetailsPinnedId] = useState<string | null>(null);

  const getApplicationKey = (user: string, org: string) => {
    return `application:${user.toLowerCase()}:${org.toLowerCase()}`
  }
  
  const getApplication = (user: string, org: string) => {
    const key = getApplicationKey(user, org)
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  }

  const handleCreateOrg = () => {
    if (!registryAddress) {
      alert("Registry address not found")
      return
    }

    if (!orgTitle || !orgDescription) {
      alert("Title and description are required")
      return
    }

    const modeValue = orgMode === "Open" ? 0 : 1   // 0 = Open, 1 = ApprovalRequired

    writeContract({
      address: registryAddress,
      abi: registryAbi,
      functionName: "createGroup",
      args: [
        process.env.NEXT_PUBLIC_IDENTITY_ADDRESS as `0x${string}`,
        orgTitle,
        orgDescription,
        modeValue   // NEW: pass the mode
      ],
    })
  }

  const handleJoin = async (
    orgAddressInput: string | `0x${string}`,
    membershipMode: number,
    options?: { isCommunity?: boolean }
  ) => {
    if (options?.isCommunity) {
      if (membershipMode === 1) {
        window.location.href = `/orgs/${encodeURIComponent(String(orgAddressInput))}/apply`;
        return;
      }
      const userAddr = safeAddress(address);
      if (!userAddr) {
        alert("Connect your wallet to join.");
        return;
      }
      try {
        const res = await fetch(
          `/api/community-orgs/${encodeURIComponent(String(orgAddressInput))}/members`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: userAddr }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(typeof err?.error === "string" ? err.error : "Join failed.");
          return;
        }
        window.location.href = `/orgs/${encodeURIComponent(String(orgAddressInput))}`;
      } catch (e: unknown) {
        console.error(e);
        alert("Join failed.");
      }
      return;
    }

    const orgAddress = safeAddress(orgAddressInput);
    if (!orgAddress) {
      alert("Invalid organization address");
      return;
    }

    if (membershipMode === 1) {
      window.location.href = `/orgs/${orgAddress}/apply`;
      return;
    }

    try {
      await writeJoin({
        address: orgAddress,
        abi: [
          {
            name: "join",
            type: "function",
            inputs: [],
            outputs: [],
            stateMutability: "nonpayable",
          },
        ],
        functionName: "join",
      });
    } catch (error: any) {
      console.error("Join failed:", error);
      alert("Join failed: " + (error?.message || "Unknown error"));
    }
  };

  // Fetch organizations from GroupRegistry logs
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

              let createdAt = Date.now()
              try {
                if (log.blockNumber !== null && log.blockNumber !== undefined) {
                  const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
                  createdAt = Number(block.timestamp) * 1000
                }
              } catch (timestampErr) {
                console.warn("Failed to fetch block timestamp for org creation", timestampErr)
              }

              foundOrgs.push({
                address: normalizedAddr,
                creator: args.creator,
                title: args.title || "Untitled Organization",
                description: args.description || "No description provided",
                memberCount: 1,
                createdAt,
              })
            }
          } catch (err) {
            console.error("Failed to decode GroupCreated log", err)
          }
        }

        setChainOrgs(foundOrgs)
      } catch (err) {
        console.error("Failed to fetch orgs", err)
      }
    }

    fetchOrgs()
  }, [publicClient, registryAddress])

  const loadCommunityOrgs = useCallback(async () => {
    try {
      const viewer = safeAddress(address)
      const q = viewer ? `?viewer=${encodeURIComponent(viewer)}` : ""
      const res = await fetch(`/api/community-orgs${q}`)
      const data = await res.json()
      setCommunityOrgs(Array.isArray(data?.orgs) ? data.orgs : [])
    } catch (e) {
      console.error("Failed to fetch community orgs", e)
      setCommunityOrgs([])
    }
  }, [address])

  useEffect(() => {
    void loadCommunityOrgs()
  }, [loadCommunityOrgs])

  useEffect(() => {
    const onFocus = () => {
      void loadCommunityOrgs()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [loadCommunityOrgs])

  // Refresh orgs list after successful creation
  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        window.location.reload(); 
      }, 1500);
    }
  }, [isSuccess]);

  const combinedOrgs: HomeOrg[] = useMemo(() => {
    const fromCommunity: HomeOrg[] = communityOrgs.map((o) => ({
      isCommunity: true,
      address: o.id,
      title: o.title,
      description: o.description,
      memberCount: o.memberCount ?? 1,
      creator: o.creatorAddress,
      createdAt: o.createdAt,
      communityMembershipMode: o.membershipMode,
      viewerStatus: o.viewerStatus,
    }))
    const fromChain: HomeOrg[] = chainOrgs.map((o, i) => {
      const sortBase = 1_000_000_000
      return {
        isCommunity: false,
        address: o.address,
        title: o.title,
        description: o.description,
        memberCount: o.memberCount ?? 1,
        creator: o.creator,
        createdAt: typeof o.createdAt === "number" ? o.createdAt : sortBase + i * 1000,
      }
    })
    return [...fromCommunity, ...fromChain]
  }, [communityOrgs, chainOrgs])

  // Filtered and sorted organizations
  const filteredOrgs: HomeOrg[] = useMemo(() => {
    let result = [...combinedOrgs]

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
    } else if (orgSortOrder === "popular") {
      result.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
    }

    return result
  }, [combinedOrgs, search, orgSortOrder])

  const chainOrgsInFilter = useMemo(
    () => filteredOrgs.filter((o) => !o.isCommunity),
    [filteredOrgs]
  )

  const { data: isMemberData, refetch: refetchIsMember } = useReadContracts({
    contracts: chainOrgsInFilter
      .map((org) => {
        const safeOrgAddr = safeAddress(org.address)
        const user = safeAddress(address)
        if (!safeOrgAddr || !user) return null
        return {
          address: safeOrgAddr,
          abi: [
            {
              name: "isMember",
              type: "function" as const,
              inputs: [{ name: "user", type: "address" as const }],
              outputs: [{ type: "bool" as const }],
              stateMutability: "view" as const,
            },
          ],
          functionName: "isMember" as const,
          args: [user] as const,
        }
      })
      .filter((contract): contract is NonNullable<typeof contract> => contract !== null),
    allowFailure: false,
  })

  const { data: totalMembersData, refetch: refetchTotalMembers } = useReadContracts({
    contracts: chainOrgsInFilter
      .map((org) => {
        const safeOrgAddr = safeAddress(org.address)
        if (!safeOrgAddr) return null
        return {
          address: safeOrgAddr,
          abi: [
            {
              name: "totalMembers",
              type: "function" as const,
              inputs: [] as const,
              outputs: [{ type: "uint256" as const }],
              stateMutability: "view" as const,
            },
          ],
          functionName: "totalMembers" as const,
        }
      })
      .filter((contract): contract is NonNullable<typeof contract> => contract !== null),
    allowFailure: false,
  })

  const { data: pendingRequestData, refetch: refetchPendingRequests } = useReadContracts({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts: chainOrgsInFilter
      .map((org) => {
        const safeOrgAddr = safeAddress(org.address)
        const user = safeAddress(address)
        if (!safeOrgAddr || !user) return null
        return {
          address: safeOrgAddr,
          abi: [
            {
              name: "pendingRequests",
              type: "function" as const,
              inputs: [{ name: "user", type: "address" as const }],
              outputs: [{ type: "bool" as const }],
              stateMutability: "view" as const,
            },
          ],
          functionName: "pendingRequests" as const,
          args: [user] as const,
        }
      })
      .filter((contract): contract is NonNullable<typeof contract> => contract !== null) as any,
    allowFailure: false,
  })

  const { data: membershipModeData } = useReadContracts({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts: chainOrgsInFilter
      .map((org) => {
        const safeOrgAddr = safeAddress(org.address)
        if (!safeOrgAddr) return null
        return {
          address: safeOrgAddr,
          abi: [
            {
              name: "membershipMode",
              type: "function" as const,
              inputs: [] as const,
              outputs: [{ type: "uint8" as const }],
              stateMutability: "view" as const,
            },
          ],
          functionName: "membershipMode" as const,
        }
      })
      .filter((contract): contract is NonNullable<typeof contract> => contract !== null) as any,
    allowFailure: false,
  })
  
  useEffect(() => {
    if (joinSuccess) {
      refetchIsMember();
      refetchTotalMembers();
      refetchPendingRequests();
    }
  }, [joinSuccess, refetchIsMember, refetchTotalMembers, refetchPendingRequests]);

  const isMemberMap = useMemo(() => {
    const modeMap: Record<string, number> = {};
    const memberMap: Record<string, boolean> = {};
    const countMap: Record<string, number> = {};
    const pendingMap: Record<string, boolean> = {};

    if (isMemberData && Array.isArray(isMemberData)) {
      chainOrgsInFilter.forEach((org, index) => {
        const safeAddr = safeAddress(org.address);
        if (!safeAddr) return;

        const isMemberResult = isMemberData[index];
        memberMap[safeAddr] = Boolean(isMemberResult);
      });
    }

    if (totalMembersData && Array.isArray(totalMembersData)) {
      chainOrgsInFilter.forEach((org, index) => {
        const safeAddr = safeAddress(org.address);
        if (!safeAddr) return;

        const countResult = totalMembersData[index] as bigint | undefined;
        countMap[safeAddr] = Number(countResult ?? 1n);
      });
    }

    if (pendingRequestData && Array.isArray(pendingRequestData)) {
      chainOrgsInFilter.forEach((org, index) => {
        const safeAddr = safeAddress(org.address);
        if (!safeAddr) return;

        const pendingResult = pendingRequestData[index] as boolean | undefined;
        pendingMap[safeAddr] = Boolean(pendingResult);
      });
    }

    if (membershipModeData && Array.isArray(membershipModeData)) {
      chainOrgsInFilter.forEach((org, index) => {
        const safeAddr = safeAddress(org.address);
        if (!safeAddr) return;

        const modeResult = membershipModeData[index] as bigint | undefined;
        modeMap[safeAddr] = Number(modeResult ?? 0n);
      });
    }

    return { memberMap, countMap, pendingMap, modeMap };
  }, [isMemberData, totalMembersData, pendingRequestData, membershipModeData, chainOrgsInFilter]);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await fetch("http://localhost:3001/applications/all");
        const data = await res.json();
        setApplications(data);
      } catch (err) {
        console.error("Failed to fetch applications", err);
      }
    };

    fetchApps();
  }, []);

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <AppSidebar active="orgs" />

      <div className="ml-48 flex-1 p-6">
        <>
          <h1 className="text-2xl font-bold mb-2 text-center w-full">Organizations</h1>
          <p className="text-center text-sm text-gray-500 mb-6">
            Create petitions inside each org (Petitions → Create).{" "}
            <Link
              href="/petitions"
              className="underline text-zinc-700 hover:text-zinc-900"
            >
              Browse all petitions
            </Link>
            .
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
                    <button
                      onClick={() => { 
                        setOrgSortOrder("newest"); 
                        setShowOrgSort(false) 
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-100 text-zinc-900"
                    >
                      Newest
                    </button>
                    <button
                      onClick={() => { 
                        setOrgSortOrder("oldest"); 
                        setShowOrgSort(false) 
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-100 text-zinc-900"
                    >
                      Oldest
                    </button>
                    <button
                      onClick={() => { 
                        setOrgSortOrder("popular"); 
                        setShowOrgSort(false) 
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
              onClick={() => setOrgTab('all')}
              className={`px-4 py-2 rounded ${orgTab === 'all' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'}`}
            >
              All
            </button>
            <button
              onClick={() => setOrgTab('yours')}
              className={`px-4 py-2 rounded ${orgTab === 'yours' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'}`}
            >
              Yours
            </button>
            <button
              onClick={() => setOrgTab('create')}
              className={`px-4 py-2 rounded ${orgTab === 'create' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'}`}
            >
              Create
            </button>
          </div>

          {orgTab === 'create' && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-400 mb-8 text-center max-w-md">
                Set your custom membership rules
              </p>

              <button
                onClick={() => window.location.href = "/orgs/new"}
                className="px-10 py-4 bg-blue-600 text-white text-lg font-medium rounded hover:bg-blue-700 transition-colors"
              >
                Create New Organization
              </button>
            </div>
          )}

          {orgTab === 'all' && filteredOrgs.map((org) => {
            const isCreator =
              Boolean(address && org.creator && String(org.creator).toLowerCase() === address.toLowerCase());
            const safeOrgAddr = org.isCommunity ? undefined : safeAddress(org.address);
            const orgCardId = `${org.isCommunity ? "c" : "x"}-${org.address}`;
            const membershipMode = org.isCommunity
              ? org.communityMembershipMode === "Manual"
                ? 1
                : 0
              : safeOrgAddr
                ? Number(isMemberMap.modeMap[safeOrgAddr] ?? 0)
                : 0;
            const isMemberFromContract = safeOrgAddr
              ? Boolean(isMemberMap.memberMap[safeOrgAddr] ?? false)
              : false;
            const isMember = org.isCommunity
              ? org.viewerStatus === "creator" || org.viewerStatus === "member"
              : isCreator || isMemberFromContract;
            const hasPendingRequest =
              !org.isCommunity && !isMember && safeOrgAddr
                ? Boolean(isMemberMap.pendingMap[safeOrgAddr] ?? false)
                : false;
            const hasPendingCommunity =
              org.isCommunity && org.viewerStatus === "pending";
            const userAddr = safeAddress(address);
            const orgAddrForApp = safeAddress(org.address);
            const hasApplied = !org.isCommunity
              ? applications.find(
                  (a) => a.user === userAddr && a.org === orgAddrForApp && a.status === "pending"
                )
              : undefined;
            const detailsOpen = orgDetailsPinnedId === orgCardId || orgDetailsHoverId === orgCardId;

            return (
              <div key={orgCardId} className="relative mb-6 p-6 border border-zinc-200 rounded bg-zinc-50 text-zinc-900">
                <div
                  className="absolute top-2 right-2 z-10 flex flex-col items-end"
                  onMouseEnter={() => setOrgDetailsHoverId(orgCardId)}
                  onMouseLeave={() => setOrgDetailsHoverId(null)}
                >
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200/90 hover:text-zinc-900"
                    aria-label="Organization details"
                    aria-expanded={detailsOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOrgDetailsPinnedId((cur) => (cur === orgCardId ? null : orgCardId));
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
                      {org.isCommunity ? (
                        <>
                          <p>Community org (off-chain)</p>
                          <p className="font-mono break-all select-all mt-1">{org.address}</p>
                        </>
                      ) : (
                        <>
                          <p>On-chain organization contract</p>
                          {safeOrgAddr && <p className="font-mono break-all select-all mt-1">{safeOrgAddr}</p>}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{org.title || "Untitled Organization"}</h3>
                  <p className="text-gray-400 mb-4 line-clamp-3">{org.description || "No description provided"}</p>
                  <div className="text-sm text-gray-500">
                    {`Members: ${org.isCommunity ? (org.memberCount || 1) : safeOrgAddr ? (isMemberMap.countMap[safeOrgAddr] || 1) : 1}`}
                    {isCreator && " • You are the creator"}
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  {isMember ? (
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `/orgs/${org.address}`;
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Enter
                    </button>
                  ) : hasPendingRequest || hasPendingCommunity ? (
                    <button
                      type="button"
                      disabled
                      className="px-6 py-2 bg-gray-600 text-white rounded cursor-not-allowed"
                    >
                      Request Sent
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        handleJoin(org.address, membershipMode, {
                          isCommunity: org.isCommunity,
                        })
                      }
                      disabled={!!hasApplied}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {hasApplied ? "Request Pending" : "Join"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {orgTab === 'yours' && (filteredOrgs
              .filter((org) => {
                if (org.isCommunity) {
                  const isCr =
                    Boolean(address && org.creator) &&
                    String(org.creator).toLowerCase() === address!.toLowerCase()
                  const isMem = org.viewerStatus === "member"
                  return isCr || isMem
                }
                const safeOrgAddr = safeAddress(org.address);
                if (!safeOrgAddr) return false;
                const isCreator =
                  Boolean(address && org.creator) &&
                  String(org.creator).toLowerCase() === address!.toLowerCase()
                const isMember = Boolean(isMemberMap.memberMap[safeOrgAddr] ?? false)
                return isCreator || isMember
              })
              .map((org) => {
                const isCreator =
                  Boolean(address && org.creator) &&
                  String(org.creator).toLowerCase() === address!.toLowerCase()
                const safeOrgAddr = org.isCommunity ? undefined : safeAddress(org.address)
                const orgCardId = `${org.isCommunity ? "c" : "x"}-${org.address}`;
                const isMemberFromContract = safeOrgAddr
                  ? Boolean(isMemberMap.memberMap[safeOrgAddr] ?? false)
                  : false;
                const isMember = org.isCommunity
                  ? org.viewerStatus === "creator" || org.viewerStatus === "member"
                  : isCreator || isMemberFromContract;
                const detailsOpen = orgDetailsPinnedId === orgCardId || orgDetailsHoverId === orgCardId;

              return (
                <div key={orgCardId} className="relative mb-6 p-6 border border-zinc-200 rounded bg-zinc-50 text-zinc-900">
                  <div
                    className="absolute top-2 right-2 z-10 flex flex-col items-end"
                    onMouseEnter={() => setOrgDetailsHoverId(orgCardId)}
                    onMouseLeave={() => setOrgDetailsHoverId(null)}
                  >
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200/90 hover:text-zinc-900"
                      aria-label="Organization details"
                      aria-expanded={detailsOpen}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrgDetailsPinnedId((cur) => (cur === orgCardId ? null : orgCardId));
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
                        {org.isCommunity ? (
                          <>
                            <p>Community org (off-chain)</p>
                            <p className="font-mono break-all select-all mt-1">{org.address}</p>
                          </>
                        ) : (
                          <>
                            <p>On-chain organization contract</p>
                            {safeOrgAddr && <p className="font-mono break-all select-all mt-1">{safeOrgAddr}</p>}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{org.title || "Untitled Organization"}</h3>
                    <p className="text-gray-400 mb-4 line-clamp-3">{org.description || "No description provided"}</p>
                    <div className="text-sm text-gray-500">
                      {`Members: ${org.isCommunity ? (org.memberCount || 1) : safeOrgAddr ? (isMemberMap.countMap[safeOrgAddr] || 1) : 1}`}
                      {isCreator && " • You are the creator"}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `/orgs/${org.address}`;
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Enter
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </>
      </div>
    </div>
  )
}