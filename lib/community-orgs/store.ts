import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { isSameParticipant, normalizeParticipantId } from "@/lib/participant-id"
import type { CommunityMembershipMode, CommunityOrg, OrgKind } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "community-orgs.json")
const POLLS_FILE = path.join(DATA_DIR, "polls.json")
const POLL_VOTES_FILE = path.join(DATA_DIR, "poll-votes.json")
const COMMUNITY_VOTES_FILE = path.join(DATA_DIR, "community-votes.json")
const COMMUNITY_BALLOTS_FILE = path.join(DATA_DIR, "community-vote-ballots.json")
/** Accounts that opened / joined an organization; merged with vote-based inference. */
const COMMUNITY_ORG_MEMBERS_FILE = path.join(DATA_DIR, "community-org-members.json")

function isOrgKind(v: unknown): v is OrgKind {
  return v === "community" || v === "governance"
}

function fromStored(raw: unknown): CommunityOrg | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const id = typeof row.id === "string" ? row.id.toLowerCase() : ""
  const creatorId = normalizeParticipantId(row.creatorId)
  if (!id || !creatorId) return null
  return {
    id,
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    kind: isOrgKind(row.kind) ? row.kind : "community",
    membershipMode: isMembershipMode(row.membershipMode) ? row.membershipMode : "Open",
    creatorId,
    auditorId: normalizeParticipantId(row.auditorId),
    auditorVisibleBallots: row.auditorVisibleBallots !== false,
    createdAt: Number(row.createdAt ?? 0),
  }
}

async function readOrgs(): Promise<CommunityOrg[]> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(fromStored).filter((o): o is CommunityOrg => o !== null)
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
    membersByOrg.set(org.id, new Set([org.creatorId]))
  }

  const polls = await readJsonFile<Poll[]>(POLLS_FILE, [])
  const pollVotes = await readJsonFile<PollVote[]>(POLL_VOTES_FILE, [])
  const pollOrgById = new Map<string, string>()
  for (const poll of polls) pollOrgById.set(poll.id, String(poll.orgId).toLowerCase())
  for (const vote of pollVotes) {
    const orgId = pollOrgById.get(vote.pollId)
    const voter = normalizeParticipantId(vote.voterId)
    if (!orgId || !voter) continue
    membersByOrg.get(orgId)?.add(voter)
  }

  const { listBallotVoterIdsForOrg } = await import("@/lib/votes/store")
  const { hasDatabase } = await import("@/lib/db")
  if (hasDatabase()) {
    for (const org of orgs) {
      const voterIds = await listBallotVoterIdsForOrg(org.id)
      for (const voterId of voterIds) {
        const voter = normalizeParticipantId(voterId)
        if (voter) membersByOrg.get(org.id)?.add(voter)
      }
    }
  } else {
    const communityVotes = await readJsonFile<CommunityVote[]>(COMMUNITY_VOTES_FILE, [])
    const ballotsByVote = await readJsonFile<BallotsByVote>(COMMUNITY_BALLOTS_FILE, {})
    for (const vote of communityVotes) {
      const orgId = String(vote.orgId).toLowerCase()
      const ballots = Array.isArray(ballotsByVote[vote.id]) ? ballotsByVote[vote.id] : []
      for (const ballot of ballots) {
        const voter = normalizeParticipantId(ballot.voterId)
        if (voter) membersByOrg.get(orgId)?.add(voter)
      }
    }
  }

  const explicit = await readExplicitCommunityOrgMembers()
  for (const org of orgs) {
    const set = membersByOrg.get(org.id)
    if (!set) continue
    for (const a of explicit[org.id] ?? []) {
      const v = normalizeParticipantId(a)
      if (v) set.add(v)
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

export async function getCommunityOrgMembersList(id: string): Promise<string[] | null> {
  const t = id?.trim().toLowerCase()
  if (!t) return null
  const orgs = await readOrgs()
  if (!orgs.some((o) => o.id === t)) return null
  const membersByOrg = await buildCommunityMembersByOrg()
  const set = membersByOrg.get(t)
  if (!set) return []
  return [...set].sort()
}

export async function isCommunityOrgMember(orgId: string, participantId: string): Promise<boolean> {
  const p = normalizeParticipantId(participantId)
  if (!p) return false
  const members = await getCommunityOrgMembersList(orgId)
  return Boolean(members?.some((m) => isSameParticipant(m, p)))
}

export async function recordCommunityOrgMember(
  orgId: string,
  memberId: string,
  opts?: { fromApproval?: boolean }
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const t = orgId?.trim().toLowerCase()
  if (!t) return { ok: false, error: "invalid org id", status: 400 }
  const orgs = await readOrgs()
  const org = orgs.find((o) => o.id === t)
  if (!org) {
    return { ok: false, error: "org not found", status: 404 }
  }
  if (org.membershipMode === "Manual" && !opts?.fromApproval) {
    return { ok: false, error: "manual membership requires admin approval", status: 403 }
  }
  const member = normalizeParticipantId(memberId)
  if (!member) return { ok: false, error: "Sign in first.", status: 401 }

  const explicit = await readExplicitCommunityOrgMembers()
  const list = [...(explicit[t] ?? [])]
  if (!list.some((a) => isSameParticipant(a, member))) {
    list.push(member)
  }
  explicit[t] = list
  await writeExplicitCommunityOrgMembers(explicit)
  return { ok: true }
}

export async function createCommunityOrg(input: {
  title: string
  description: string
  kind: unknown
  membershipMode: unknown
  creatorId: string
}): Promise<{ ok: true; org: CommunityOrg } | { ok: false; error: string; status: number }> {
  const title = input.title?.trim()
  if (!title) return { ok: false, error: "title required", status: 400 }
  const description = (input.description ?? "").trim()
  if (!description) return { ok: false, error: "description required", status: 400 }
  if (!isMembershipMode(input.membershipMode)) {
    return { ok: false, error: "invalid membershipMode", status: 400 }
  }
  const kind: OrgKind = isOrgKind(input.kind) ? input.kind : "community"
  const creatorId = normalizeParticipantId(input.creatorId)
  if (!creatorId) return { ok: false, error: "Sign in first.", status: 401 }

  const org: CommunityOrg = {
    id: randomUUID().toLowerCase(),
    title,
    description,
    kind,
    membershipMode: input.membershipMode,
    creatorId,
    auditorId: null,
    auditorVisibleBallots: true,
    createdAt: Date.now(),
  }
  const orgs = await readOrgs()
  orgs.push(org)
  await writeOrgs(orgs)
  return { ok: true, org }
}

export async function getCommunityOrgById(id: string): Promise<CommunityOrg | null> {
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
    .map((org) => ({ ...org, memberCount: counts[org.id] ?? 1 }))
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function isCommunityOrgAdmin(orgId: string, participantId: string): Promise<boolean> {
  const org = await getCommunityOrgById(orgId)
  return Boolean(org && isSameParticipant(org.creatorId, participantId))
}

/** Appoint the counter. Must not be the org admin (creator). */
export async function setCommunityOrgAuditor(input: {
  orgId: string
  auditorId: string
  adminId: string
}): Promise<{ ok: true; org: CommunityOrg } | { ok: false; error: string; status: number }> {
  const t = input.orgId?.trim().toLowerCase()
  if (!t) return { ok: false, error: "invalid org id", status: 400 }
  const admin = normalizeParticipantId(input.adminId)
  if (!admin) return { ok: false, error: "Sign in first.", status: 401 }
  const auditor = normalizeParticipantId(input.auditorId)
  if (!auditor) return { ok: false, error: "choose a member to appoint", status: 400 }

  const orgs = await readOrgs()
  const idx = orgs.findIndex((o) => o.id === t)
  if (idx < 0) return { ok: false, error: "org not found", status: 404 }
  const org = orgs[idx]
  if (!isSameParticipant(org.creatorId, admin)) {
    return { ok: false, error: "only the org admin can set the auditor", status: 403 }
  }
  if (isSameParticipant(auditor, org.creatorId)) {
    return {
      ok: false,
      error: "the counter must be someone other than the person who runs this organization",
      status: 400,
    }
  }

  const next: CommunityOrg = { ...org, auditorId: auditor }
  orgs[idx] = next
  await writeOrgs(orgs)
  const counts = await buildCommunityMemberCounts()
  return { ok: true, org: { ...next, memberCount: counts[t] ?? 1 } }
}

/** Organization setting. Applies to votes created after the change. */
export async function setCommunityOrgAuditorVisibility(input: {
  orgId: string
  adminId: string
  auditorVisibleBallots: boolean
}): Promise<{ ok: true; org: CommunityOrg } | { ok: false; error: string; status: number }> {
  const t = input.orgId?.trim().toLowerCase()
  if (!t) return { ok: false, error: "invalid org id", status: 400 }
  const admin = normalizeParticipantId(input.adminId)
  if (!admin) return { ok: false, error: "Sign in first.", status: 401 }
  if (typeof input.auditorVisibleBallots !== "boolean") {
    return { ok: false, error: "auditorVisibleBallots required", status: 400 }
  }

  const orgs = await readOrgs()
  const idx = orgs.findIndex((o) => o.id === t)
  if (idx < 0) return { ok: false, error: "org not found", status: 404 }
  const org = orgs[idx]
  if (!isSameParticipant(org.creatorId, admin)) {
    return { ok: false, error: "only the org admin can change ballot visibility", status: 403 }
  }

  const next: CommunityOrg = { ...org, auditorVisibleBallots: input.auditorVisibleBallots }
  orgs[idx] = next
  await writeOrgs(orgs)
  const counts = await buildCommunityMemberCounts()
  return { ok: true, org: { ...next, memberCount: counts[t] ?? 1 } }
}

export async function getCommunityOrgAuditor(orgId: string): Promise<string | null> {
  const org = await getCommunityOrgById(orgId)
  return normalizeParticipantId(org?.auditorId)
}
