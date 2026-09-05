import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { getAddress, isAddress } from "viem"
import type { CommunityMembershipMode, CommunityOrg } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "community-orgs.json")
const POLLS_FILE = path.join(DATA_DIR, "polls.json")
const POLL_VOTES_FILE = path.join(DATA_DIR, "poll-votes.json")
const COMMUNITY_VOTES_FILE = path.join(DATA_DIR, "community-votes.json")
const COMMUNITY_BALLOTS_FILE = path.join(DATA_DIR, "community-vote-ballots.json")
/** Wallets that opened / joined a community org (off-chain); merged with vote-based inference. */
const COMMUNITY_ORG_MEMBERS_FILE = path.join(DATA_DIR, "community-org-members.json")

async function readOrgs(): Promise<CommunityOrg[]> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return []
    throw e
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw) as T
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return fallback
    throw e
  }
}

async function writeOrgs(orgs: CommunityOrg[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(STORE_FILE, JSON.stringify(orgs, null, 2), "utf8")
}

export function normalizeCreator(addr: string): `0x${string}` | null {
  if (!isAddress(addr)) return null
  try {
    return getAddress(addr.trim() as `0x${string}`)
  } catch {
    return null
  }
}

function isMembershipMode(v: unknown): v is CommunityMembershipMode {
  return v === "Open" || v === "Manual" || v === "Automatic"
}

type MembersByOrg = Map<string, Set<string>>

async function readExplicitCommunityOrgMembers(): Promise<Record<string, string[]>> {
  const raw = await readJsonFile<Record<string, unknown>>(COMMUNITY_ORG_MEMBERS_FILE, {})
  const out: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!Array.isArray(v)) continue
    out[k.toLowerCase()] = v.filter((x): x is string => typeof x === "string")
  }
  return out
}

async function writeExplicitCommunityOrgMembers(data: Record<string, string[]>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(COMMUNITY_ORG_MEMBERS_FILE, JSON.stringify(data, null, 2), "utf8")
}

async function buildCommunityMembersByOrg(): Promise<MembersByOrg> {
  type Poll = { id: string; orgId: string }
  type PollVote = { pollId: string; voterId: string }
  type CommunityVote = { id: string; orgId: string }
  type Ballot = { voterId: string }
  type BallotsByVote = Record<string, Ballot[]>

  const orgs = await readOrgs()
  const membersByOrg: MembersByOrg = new Map()
  for (const org of orgs) {
    const set = new Set<string>()
    const creator = normalizeCreator(org.creatorAddress)
    if (creator) set.add(creator.toLowerCase())
    membersByOrg.set(org.id.toLowerCase(), set)
  }

  const polls = await readJsonFile<Poll[]>(POLLS_FILE, [])
  const pollVotes = await readJsonFile<PollVote[]>(POLL_VOTES_FILE, [])
  const pollOrgById = new Map<string, string>()
  for (const poll of polls) pollOrgById.set(poll.id, String(poll.orgId).toLowerCase())
  for (const vote of pollVotes) {
    const orgId = pollOrgById.get(vote.pollId)
    const voter = normalizeCreator(vote.voterId)
    if (!orgId || !voter) continue
    membersByOrg.get(orgId)?.add(voter.toLowerCase())
  }

  const { listBallotVoterIdsForOrg } = await import("@/lib/votes/store")
  const { hasDatabase } = await import("@/lib/db")
  if (hasDatabase()) {
    for (const org of orgs) {
      const voterIds = await listBallotVoterIdsForOrg(org.id)
      const orgId = org.id.toLowerCase()
      for (const voterId of voterIds) {
        const voter = normalizeCreator(voterId)
        if (!voter) continue
        membersByOrg.get(orgId)?.add(voter.toLowerCase())
      }
    }
  } else {
    const communityVotes = await readJsonFile<CommunityVote[]>(COMMUNITY_VOTES_FILE, [])
    const ballotsByVote = await readJsonFile<BallotsByVote>(COMMUNITY_BALLOTS_FILE, {})
    for (const vote of communityVotes) {
      const orgId = String(vote.orgId).toLowerCase()
      const ballots = Array.isArray(ballotsByVote[vote.id]) ? ballotsByVote[vote.id] : []
      for (const ballot of ballots) {
        const voter = normalizeCreator(ballot.voterId)
        if (!voter) continue
        membersByOrg.get(orgId)?.add(voter.toLowerCase())
      }
    }
  }

  const explicit = await readExplicitCommunityOrgMembers()
  for (const org of orgs) {
    const key = org.id.toLowerCase()
    const addrs = explicit[key] ?? []
    const set = membersByOrg.get(key)
    if (!set) continue
    for (const a of addrs) {
      const v = normalizeCreator(a)
      if (v) set.add(v.toLowerCase())
    }
  }

  return membersByOrg
}

async function buildCommunityMemberCounts(): Promise<Record<string, number>> {
  const membersByOrg = await buildCommunityMembersByOrg()
  const counts: Record<string, number> = {}
  for (const [orgId, members] of membersByOrg.entries()) {
    counts[orgId] = members.size
  }
  return counts
}

function checksummedAddresses(lowers: Iterable<string>): string[] {
  const out: string[] = []
  for (const low of lowers) {
    const v = normalizeCreator(low)
    if (v) out.push(v)
  }
  return [...new Set(out)].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
}

export async function getCommunityOrgMembersList(id: string): Promise<string[] | null> {
  const t = id?.trim().toLowerCase()
  if (!t) return null
  const orgs = await readOrgs()
  if (!orgs.some((o) => o.id.toLowerCase() === t)) return null
  const membersByOrg = await buildCommunityMembersByOrg()
  const set = membersByOrg.get(t)
  if (!set) return []
  return checksummedAddresses(set)
}

export async function recordCommunityOrgMember(
  orgId: string,
  memberAddress: string,
  opts?: { fromApproval?: boolean }
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const t = orgId?.trim().toLowerCase()
  if (!t) return { ok: false, error: "invalid org id", status: 400 }
  const orgs = await readOrgs()
  const org = orgs.find((o) => o.id.toLowerCase() === t)
  if (!org) {
    return { ok: false, error: "org not found", status: 404 }
  }
  if (org.membershipMode === "Manual" && !opts?.fromApproval) {
    return { ok: false, error: "manual membership requires admin approval", status: 403 }
  }
  const wallet = normalizeCreator(memberAddress)
  if (!wallet) return { ok: false, error: "valid member address required", status: 400 }

  const explicit = await readExplicitCommunityOrgMembers()
  const list = [...(explicit[t] ?? [])]
  const low = wallet.toLowerCase()
  if (!list.some((a) => normalizeCreator(a)?.toLowerCase() === low)) {
    list.push(wallet)
  }
  explicit[t] = list
  await writeExplicitCommunityOrgMembers(explicit)
  return { ok: true }
}

export async function createCommunityOrg(input: {
  title: string
  description: string
  membershipMode: unknown
  creatorAddress: string
}): Promise<{ ok: true; org: CommunityOrg } | { ok: false; error: string; status: number }> {
  const title = input.title?.trim()
  if (!title) return { ok: false, error: "title required", status: 400 }
  const description = (input.description ?? "").trim()
  if (!description) return { ok: false, error: "description required", status: 400 }
  if (!isMembershipMode(input.membershipMode)) {
    return { ok: false, error: "invalid membershipMode", status: 400 }
  }
  const creatorAddress = normalizeCreator(input.creatorAddress)
  if (!creatorAddress) return { ok: false, error: "valid creator address required", status: 400 }

  const org: CommunityOrg = {
    id: randomUUID().toLowerCase(),
    title,
    description,
    membershipMode: input.membershipMode,
    creatorAddress,
    auditorAddress: null,
    createdAt: Date.now(),
  }
  const orgs = await readOrgs()
  orgs.push(org)
  await writeOrgs(orgs)
  return { ok: true, org }
}

export async function getCommunityOrgById(
  id: string
): Promise<CommunityOrg | null> {
  const t = id?.trim().toLowerCase()
  if (!t) return null
  const orgs = await readOrgs()
  const org = orgs.find((o) => o.id === t) ?? null
  if (!org) return null
  const counts = await buildCommunityMemberCounts()
  return { ...org, memberCount: counts[t] ?? 1 }
}

export async function listCommunityOrgs(): Promise<CommunityOrg[]> {
  const orgs = await readOrgs()
  const counts = await buildCommunityMemberCounts()
  return [...orgs]
    .map((org) => ({ ...org, memberCount: counts[org.id.toLowerCase()] ?? 1 }))
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** Designate external auditor. Must not be the org admin (creator). */
export async function setCommunityOrgAuditor(input: {
  orgId: string
  auditorAddress: string
  adminAddress: string
}): Promise<{ ok: true; org: CommunityOrg } | { ok: false; error: string; status: number }> {
  const t = input.orgId?.trim().toLowerCase()
  if (!t) return { ok: false, error: "invalid org id", status: 400 }
  const admin = normalizeCreator(input.adminAddress)
  if (!admin) return { ok: false, error: "valid admin address required", status: 400 }
  const auditor = normalizeCreator(input.auditorAddress)
  if (!auditor) return { ok: false, error: "valid auditor address required", status: 400 }

  const orgs = await readOrgs()
  const idx = orgs.findIndex((o) => o.id.toLowerCase() === t)
  if (idx < 0) return { ok: false, error: "org not found", status: 404 }
  const org = orgs[idx]
  if (org.creatorAddress.toLowerCase() !== admin.toLowerCase()) {
    return { ok: false, error: "only the org admin can set the auditor", status: 403 }
  }
  if (auditor.toLowerCase() === org.creatorAddress.toLowerCase()) {
    return {
      ok: false,
      error: "auditor must be a different wallet than the org admin",
      status: 400,
    }
  }

  const next: CommunityOrg = { ...org, auditorAddress: auditor }
  orgs[idx] = next
  await writeOrgs(orgs)
  const counts = await buildCommunityMemberCounts()
  return { ok: true, org: { ...next, memberCount: counts[t] ?? 1 } }
}

export async function getCommunityOrgAuditor(orgId: string): Promise<string | null> {
  const org = await getCommunityOrgById(orgId)
  const a = org?.auditorAddress
  if (!a) return null
  return normalizeCreator(a)
}
