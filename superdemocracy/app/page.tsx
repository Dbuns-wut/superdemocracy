"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
import { useTotalPetitions } from "@/hooks/usePetitions"
import { PetitionCard } from "@/components/PetitionCard"
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useReadContracts } from "wagmi"
import { getAddress } from "viem"
import { abi as organizationAbi } from "@/abis/Organization.json"
import { usePublicClient } from "wagmi"
import { decodeEventLog } from "viem"
import { useState, useEffect, useMemo } from "react"
import { abi as registryAbi } from "@/abis/GroupRegistry.json"
import { safeAddress } from "@/lib/address";

const organizationAddressRaw = process.env.NEXT_PUBLIC_ORG_ADDRESS
const organizationAddress = organizationAddressRaw 
  ? getAddress(organizationAddressRaw as `0x${string}`) 
  : undefined
const registryAddress = process.env.NEXT_PUBLIC_GROUP_REGISTRY as `0x${string}`

type Org = {
  address: `0x${string}`
  creator?: `0x${string}`
  title: string
  description: string
  memberCount: number
}

type PetitionEvent = {
  petitionId: number
  title: string
  signatures: number
  creator?: `0x${string}`
}

export default function Home() {
  const { data: total } = useTotalPetitions()

  // Main write hook for createPetition / createGroup
  const { writeContract, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Join contract hook
  const { writeContract: writeJoin, data: joinHash } = useWriteContract()
  const { isSuccess: joinSuccess } = useWaitForTransactionReceipt({ 
    hash: joinHash 
  })

  // For refreshing membership after join
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tab, setTab] = useState('all')
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const [events] = useState<PetitionEvent[]>([])
  const [search, setSearch] = useState("")
  const [signedPetitions, setSignedPetitions] = useState<number[]>([])
  const [sortOrder, setSortOrder] = useState("newest")
  const [showSort, setShowSort] = useState(false)
  // Remember last viewed tab between refreshes
  const [view, setView] = useState<"petitions" | "orgs">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("lastView") as "petitions" | "orgs") || "petitions";
    }
    return "petitions";
  });
  const [orgs, setOrgs] = useState<Org[]>([]) 
  const [orgTab, setOrgTab] = useState('all')
  const [orgTitle, setOrgTitle] = useState("")
  const [orgDescription, setOrgDescription] = useState("")
  const [orgMode, setOrgMode] = useState<"Open" | "ApprovalRequired">("Open")
  const [orgSortOrder, setOrgSortOrder] = useState<"newest" | "oldest" | "popular">("newest")
  const [showOrgSort, setShowOrgSort] = useState(false)
  const [updatingOrgs, setUpdatingOrgs] = useState<Set<string>>(new Set());

  const getApplicationKey = (user: string, org: string) => {
    return `application:${user.toLowerCase()}:${org.toLowerCase()}`
  }
  
  const getApplication = (user: string, org: string) => {
    const key = getApplicationKey(user, org)
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  }

  const handleCreate = () => {
    if (!organizationAddress || !title || !description) {
      alert("Title and description are required")
      return
    }
    writeContract({
      address: organizationAddress,
      abi: organizationAbi,
      functionName: "createPetition",
      args: [title, description, BigInt(1)],
    })
  }

  const handleCreateOrg = () => {
    console.log("=== handleCreateOrg called ===")
    console.log("registryAddress:", registryAddress)
    console.log("orgTitle:", orgTitle)
    console.log("orgDescription:", orgDescription)
    console.log("orgMode:", orgMode)

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
  membershipMode: number
) => {
  const orgAddress = safeAddress(orgAddressInput);
  if (!orgAddress) {
    alert("Invalid organization address");
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
      ] as const,
      functionName: "join",
    });
  } catch (error) {
    console.error("Join failed:", error);
    alert("Join failed: " + (error instanceof Error ? error.message : "Unknown error"));
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

        const foundOrgs: Org[] = []

        for (const log of logs) {
          try {
            const decoded = decodeEventLog({
              abi: registryAbi,
              data: log.data,
              topics: log.topics,
            }) as unknown as {
              eventName: string
              args: {
                group: string
                creator?: `0x${string}`
                title?: string
                description?: string
              }
            }

            if (decoded.eventName === "GroupCreated" && decoded.args) {
              const rawGroupAddr = decoded.args.group as string
              const normalizedAddr = safeAddress(rawGroupAddr)

              if (!normalizedAddr) {
                console.warn("Skipping group with invalid address:", rawGroupAddr)
                continue
              }

              foundOrgs.push({
                address: normalizedAddr,           // ← always checksummed now
                creator: decoded.args.creator,
                title: decoded.args.title || "Untitled Organization",
                description: decoded.args.description || "No description provided",
                memberCount: 1,
              })
            }
          } catch (err) {
            console.error("Failed to decode GroupCreated log", err)
          }
        }

        console.log(`Fetched ${foundOrgs.length} organizations with normalized addresses`)
        setOrgs(foundOrgs)
      } catch (err) {
        console.error("Failed to fetch orgs", err)
      }
    }

    fetchOrgs()
  }, [publicClient, registryAddress])

  // Refresh orgs list after successful creation
  useEffect(() => {
    if (isSuccess) {
      console.log("Organization created - refreshing org list")
      setTimeout(() => {
        window.location.reload(); 
      }, 1500);
    }
  }, [isSuccess]);

  // Calculations wrapped in useMemo to prevent render loop
  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortOrder === "newest") return b.petitionId - a.petitionId
        if (sortOrder === "oldest") return a.petitionId - b.petitionId
        if (sortOrder === "popular") return b.signatures - a.signatures
        return 0
      })
  }, [events, search, sortOrder])

  const ids = useMemo(() => filteredEvents.map((e) => e.petitionId), [filteredEvents])

  // Your own petitions (for the "Yours" tab)
  const yourPetitions = useMemo(() => 
    filteredEvents
      .filter((e) => e.creator === address)
      .map((e) => e.petitionId)
  , [filteredEvents, address]);

  // Filtered and sorted organizations
  const filteredOrgs = useMemo(() => {
    let result = [...orgs]

    // Search filter
    if (search) {
      result = result.filter((org) =>
        (org.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (org.description || "").toLowerCase().includes(search.toLowerCase())
      )
    }

    // Sort
    if (orgSortOrder === "newest") {
      result.reverse(); // newest first (reverse the log order)
    } else if (orgSortOrder === "oldest") {
      // do nothing - logs are already in oldest-first order
    } else if (orgSortOrder === "popular") {
      result.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))
    }

    return result
  }, [orgs, search, orgSortOrder])

  const { data: isMemberData, refetch: refetchIsMember } = useReadContracts({
    contracts: filteredOrgs.map((org) => {
      const safeOrgAddr = safeAddress(org.address);
      if (!safeOrgAddr) return null;

      return {
        address: safeOrgAddr,
        abi: [
          {
            name: "isMember",
            type: "function",
            inputs: [{ name: "user", type: "address" }],
            outputs: [{ type: "bool" }],
            stateMutability: "view",
          },
        ] as const,
        functionName: "isMember",
        args: [address],
      };
    }).filter((contract): contract is NonNullable<typeof contract> => contract !== null),
    allowFailure: false,
  });

  const { data: totalMembersData, refetch: refetchTotalMembers } = useReadContracts({
    contracts: filteredOrgs.map((org) => {
      const safeOrgAddr = safeAddress(org.address);
      if (!safeOrgAddr) return null;

      return {
        address: safeOrgAddr,
        abi: [
          {
            name: "totalMembers",
            type: "function",
            inputs: [], 
            outputs: [{ type: "uint256" }],
            stateMutability: "view",
          },
        ] as const,
        functionName: "totalMembers",
      };
    }).filter((contract): contract is NonNullable<typeof contract> => contract !== null),
    allowFailure: false,
  });

  const { data: pendingRequestData, refetch: refetchPendingRequests } = useReadContracts({
    contracts: filteredOrgs.map((org) => {
      const safeOrgAddr = safeAddress(org.address);
      if (!safeOrgAddr) return null;

      return {
        address: safeOrgAddr,
        abi: [
          {
            name: "pendingRequests",
            type: "function",
            inputs: [{ name: "user", type: "address" }],
            outputs: [{ type: "bool" }],
            stateMutability: "view",
          },
        ] as const,
        functionName: "pendingRequests",
        args: [address],
      };
    }).filter((contract): contract is NonNullable<typeof contract> => contract !== null),
    allowFailure: false,
  });

  const { data: membershipModeData } = useReadContracts({
    contracts: filteredOrgs.map((org) => {
      const safeOrgAddr = safeAddress(org.address);
      if (!safeOrgAddr) return null;

      return {
        address: safeOrgAddr,
        abi: [
          {
            name: "membershipMode",
            type: "function",
            inputs: [],
            outputs: [{ type: "uint8" }],
            stateMutability: "view",
          },
        ] as const,
        functionName: "membershipMode",
      };
    }).filter((contract): contract is NonNullable<typeof contract> => contract !== null),
    allowFailure: false,
  });
  
  useEffect(() => {
    if (joinSuccess) {
      console.log("Join confirmed - refetching membership data");

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
      filteredOrgs.forEach((org, index) => {
        const safeAddr = safeAddress(org.address);
        if (!safeAddr) return;

        const isMemberResult = isMemberData[index];
        memberMap[safeAddr] = Boolean(isMemberResult);
      });
    }

    if (totalMembersData && Array.isArray(totalMembersData)) {
      filteredOrgs.forEach((org, index) => {
        const safeAddr = safeAddress(org.address);
        if (!safeAddr) return;

        const countResult = totalMembersData[index] as bigint | undefined;
        countMap[safeAddr] = Number(countResult ?? 1n);
      });
    }

    if (pendingRequestData && Array.isArray(pendingRequestData)) {
      filteredOrgs.forEach((org, index) => {
        const safeAddr = safeAddress(org.address);
        if (!safeAddr) return;

        const pendingResult = pendingRequestData[index] as boolean | undefined;
        pendingMap[safeAddr] = Boolean(pendingResult);
      });
    }

    if (membershipModeData && Array.isArray(membershipModeData)) {
      filteredOrgs.forEach((org, index) => {
        const safeAddr = safeAddress(org.address);
        if (!safeAddr) return;

        const modeResult = membershipModeData[index] as number | undefined;
        modeMap[safeAddr] = Number(modeResult ?? 0);
      });
    }

    console.log("isMemberMap updated for address", address, "→ memberMap:", memberMap, "countMap:", countMap, "pendingMap:", pendingMap);
    console.log("pendingMap:", pendingMap);

    return { memberMap, countMap, pendingMap, modeMap };
  }, [isMemberData, totalMembersData, pendingRequestData, membershipModeData, filteredOrgs, address]);

  // Clean logs (only run when values actually change)
  useEffect(() => {
    console.log("HOME PAGE RENDERED")
    console.log('Current wallet address:', address)
    console.log('Signed Petitions IDs:', signedPetitions)
    console.log('Your Petitions:', yourPetitions)
  }, [address, signedPetitions, yourPetitions])

  if (total === undefined) return <div>Loading...</div>

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Slim Left Sidebar */}
      <div className="w-64 border-r border-white p-6 flex flex-col fixed h-screen">
        {/* Logo */}
        <img 
          src="/logo.png" 
          alt="SuperDemocracy" 
          className="mx-auto w-56 h-auto object-contain rounded-full mb-10 " 
        />

        {/* Profile */}
        <a href="#" className="flex items-center gap-3 mb-8 hover:bg-zinc-900 p-3 rounded">
          👤 <span className="font-medium">Manage My ID</span>
        </a>

        {/* Orgs */}
        <div
          onClick={() => {
            setView("orgs");
            localStorage.setItem("lastView", "orgs");
          }}
          className={`flex items-center gap-3 mb-8 p-3 rounded cursor-pointer ${
            view === "orgs" ? "bg-zinc-900 font-medium" : "hover:bg-zinc-900"
          }`}
        >
          👥 <span>Orgs</span>
        </div>

        {/* Petitions */}
        <div
          onClick={() => {
            setView("petitions");
            localStorage.setItem("lastView", "petitions");
          }}
          className={`flex items-center gap-3 mb-8 p-3 rounded cursor-pointer ${
            view === "petitions" ? "bg-zinc-900 font-medium" : "hover:bg-zinc-900"
          }`}
        >
           📜 <span>Petitions</span>
        </div>

        {/* Referendums */}
        <a href="#" className="flex items-center gap-3 mb-8 hover:bg-zinc-900 p-3 rounded">
          🗳️ <span className="font-medium">Referendums</span>
        </a>

        {/* Settings */}
        <a href="#" className="flex items-center gap-3 mt-auto hover:bg-zinc-900 p-3 rounded">
          ⚙️ <span className="font-medium">Settings</span>
        </a>
      </div>

      {/* Main Feed Area */}
      <div className="ml-64 flex-1 p-6">
        {view === "petitions" && (
        <>
        <h1 className="text-2xl font-bold mb-6 text-center w-full">Petitions</h1>        
 
        <div className="mb-6 flex justify-center">
          <div className="flex w-2/3 items-center gap-2 relative">
            <input
              type="text"
              placeholder="Search petitions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 p-2 border border-white rounded bg-black text-white placeholder:text-gray-400"
            />

            <div className="relative">
              <button
                onClick={() => setShowSort(!showSort)}
                className="px-3 py-2 bg-zinc-900 text-white rounded hover:bg-zinc-700"
              >
                Sort
              </button>

              {showSort && (
                <div className="absolute right-0 mt-2 bg-zinc-900 border border-white rounded shadow-lg z-10">
                  <button
                    onClick={() => { setSortOrder("newest"); setShowSort(false) }}
                    className="block w-full text-left px-4 py-2 hover:bg-zinc-700"
                  >
                    Newest
                  </button>
                  <button
                    onClick={() => { setSortOrder("oldest"); setShowSort(false) }}
                    className="block w-full text-left px-4 py-2 hover:bg-zinc-700"
                  >
                    Oldest
                  </button>
                  <button
                    onClick={() => { setSortOrder("popular"); setShowSort(false) }}
                    className="block w-full text-left px-4 py-2 hover:bg-zinc-700"
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
            onClick={() => setTab('all')} 
            className={`px-4 py-2 ${tab === 'all' ? 'bg-blue-600' : 'bg-zinc-900'} text-white rounded hover:bg-blue-700`}
         >
            All
          </button>

          <button 
            onClick={() => setTab('signed')} 
            className={`px-4 py-2 ${tab === 'signed' ? 'bg-blue-600' : 'bg-zinc-900'} text-white rounded hover:bg-blue-700`}
          >
            Signed
          </button>

          <button 
            onClick={() => setTab('yours')} 
            className={`px-4 py-2 ${tab === 'yours' ? 'bg-blue-600' : 'bg-zinc-900'} text-white rounded hover:bg-blue-700`}
          >
            Yours
          </button>
        </div>

        {tab === 'yours' && (
          <div className="mb-8 p-4 border border-white rounded bg-black text-white">
            <h2 className="font-semibold mb-4 text-white">Create New Petition</h2>
            <input
              id="petition-title"
              name="petition-title"
              type="text"
              placeholder="Petition Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mb-2 p-2 border border-white rounded bg-black text-white placeholder:text-gray-400"
            />
            <textarea
              id="petition-description"
              name="petition-description"
              placeholder="Petition Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full mb-2 p-2 border border-white rounded bg-black text-white placeholder:text-gray-400 h-24"
            />
            <button
              onClick={handleCreate}
              disabled={isConfirming || !title || !description}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
            >
              {isConfirming ? "Creating on-chain..." : "Create Petition"}
            </button>
            {isSuccess && (
              <p className="mt-2 text-green-400">
                Petition created successfully! Refresh the page to see the new card.
              </p>
            )}
          </div>
        )}

        {tab === 'signed' && (
          signedPetitions.map(id => (
            <PetitionCard key={id} id={BigInt(id)} />
          ))
        )}

        {tab === 'yours' && (
          yourPetitions.map(id => (
            <PetitionCard key={id} id={BigInt(id)} />
          ))
        )}
      
        {tab === 'all' && ids.map((id) => (
          <PetitionCard key={id} id={BigInt(id)} />
        ))}
    
        </>
       )}
       
       {view === "orgs" && (
        <>
          <h1 className="text-2xl font-bold mb-6 text-center w-full">Organizations</h1>

          <div className="mb-6 flex justify-center">
            <div className="flex w-2/3 items-center gap-2 relative">
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 p-2 border border-white rounded bg-black text-white placeholder:text-gray-400"
              />

              <div className="relative">
                <button
                  onClick={() => setShowOrgSort(!showOrgSort)}
                  className="px-3 py-2 bg-zinc-900 text-white rounded hover:bg-zinc-700"
                >
                  Sort
                </button>

                {showOrgSort && (
                  <div className="absolute right-0 mt-2 bg-zinc-900 border border-white rounded shadow-lg z-10">
                    <button
                      onClick={() => { 
                        setOrgSortOrder("newest"); 
                        setShowOrgSort(false) 
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-700"
                    >
                      Newest
                    </button>
                    <button
                      onClick={() => { 
                        setOrgSortOrder("oldest"); 
                        setShowOrgSort(false) 
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-700"
                    >
                      Oldest
                    </button>
                    <button
                      onClick={() => { 
                        setOrgSortOrder("popular"); 
                        setShowOrgSort(false) 
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-700"
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
              className={`px-4 py-2 ${orgTab === 'all' ? 'bg-blue-600' : 'bg-zinc-900'} text-white rounded hover:bg-blue-700`}
            >
              All
            </button>
            <button
              onClick={() => setOrgTab('yours')}
              className={`px-4 py-2 ${orgTab === 'yours' ? 'bg-blue-600' : 'bg-zinc-900'} text-white rounded hover:bg-blue-700`}
            >
              Yours
            </button>
            <button
              onClick={() => setOrgTab('create')}
              className={`px-4 py-2 ${orgTab === 'create' ? 'bg-blue-600' : 'bg-zinc-900'} text-white rounded hover:bg-blue-700`}
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

          {orgTab === 'all' && filteredOrgs.map((org, index) => {
            const isCreator = org.creator === address;
            const safeOrgAddr = safeAddress(org.address);
            const membershipMode = safeOrgAddr
              ? Number(isMemberMap.modeMap[safeOrgAddr] ?? 0)
              : 0;
            const isMemberFromContract = safeOrgAddr
              ? Boolean(isMemberMap.memberMap[safeOrgAddr] ?? false)
              : false;
            const isMember = isCreator || isMemberFromContract;
            const hasPendingRequest = !isMember && safeOrgAddr
              ? Boolean(isMemberMap.pendingMap[safeOrgAddr] ?? false)
              : false;

            return (
              <div key={index} className="mb-6 p-6 border border-white rounded bg-black text-white flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{org.title || "Untitled Organization"}</h3>
                  <p className="text-gray-400 mb-4 line-clamp-3">{org.description || "No description provided"}</p>
                  <div className="text-sm text-gray-500">
                    Members: {safeOrgAddr ? (isMemberMap.countMap[safeOrgAddr] || 1) : 1}
                    {isCreator && " • You are the creator"}
                  </div>
                </div>

                <div className="flex gap-3 ml-6">
                  {isMember ? (
                    <button
                      onClick={() => window.location.href = `/orgs/${org.address}`}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Enter
                    </button>
                  ) : hasPendingRequest ? (
                    <button
                      disabled
                      className="px-6 py-2 bg-gray-600 text-white rounded cursor-not-allowed"
                    >
                      Request Sent
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoin(org.address, membershipMode)}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {orgTab === 'yours' && (filteredOrgs
              .filter((org) => {
                const safeOrgAddr = safeAddress(org.address);
                if (!safeOrgAddr) return false;

                const isCreator = org.creator === address;
                const isMember = Boolean(isMemberMap.memberMap[safeOrgAddr] ?? false);

                return isCreator || isMember;
              })
              .map((org, index) => {
                const isCreator = org.creator === address;
                const safeOrgAddr = safeAddress(org.address);
                const isMemberFromContract = safeOrgAddr
                  ? Boolean(isMemberMap.memberMap[safeOrgAddr] ?? false)
                  : false;
                const isMember = isCreator || isMemberFromContract;

              return (
                <div key={index} className="mb-6 p-6 border border-white rounded bg-black text-white flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{org.title || "Untitled Organization"}</h3>
                    <p className="text-gray-400 mb-4 line-clamp-3">{org.description || "No description provided"}</p>
                    <div className="text-sm text-gray-500">
                      Members: {safeOrgAddr ? (isMemberMap.countMap[safeOrgAddr] || 1) : 1}
                      {isCreator && " • You are the creator"}
                    </div>
                  </div>

                  <div className="flex gap-3 ml-6">
                    <button
                      onClick={() => window.location.href = `/orgs/${org.address}`}
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
       )}
      </div>
    </div>
  )
}