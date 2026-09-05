import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { getAddress, isAddress } from "viem"
import {
  decryptBallotChoices,
  encryptBallotChoices,
} from "@/lib/ballot-crypto"
import { ensureMigrated, hasDatabase, withDbClient } from "@/lib/db"
import { getCommunityOrgById } from "@/lib/community-orgs/store"
import { isOffchainOrgId, normalizeOrgId } from "@/lib/org-id"
import { isVoteOrgAdmin, isVoteOrgAuditor } from "./access"
import { appendBallotAudit } from "./audit-log"
import type {
  Ballot,
  BallotReceipt,
  CommunityVote,
  CommunityVotePublic,
  CommunityVoteSummary,
  StoredBallot,
  VerificationApproval,
  VoteStatus,
} from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const VOTES_FILE = path.join(DATA_DIR, "community-votes.json")
const BALLOTS_FILE = path.join(DATA_DIR, "community-vote-ballots.json")

type BallotsByVote = Record<string, Array<StoredBallot | Ballot>>

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8")
    return JSON.parse(raw) as T
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return fallback
    throw e
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8")
}

function normalizeEthAddress(input: string): string | null {
  const t = typeof input === "string" ? input.trim() : ""
  if (!t || !isAddress(t)) return null
  try {
    return getAddress(t as `0x${string}`)
  } catch {
    return null
  }
}

function normalizeOptions(options: unknown): string[] | null {
  if (!Array.isArray(options)) return null
  const cleaned = options.map((o) => (typeof o === "string" ? o.trim() : "")).filter(Boolean)
  return cleaned.length >= 2 ? cleaned : null
}

function normalizeStatus(status: unknown): VoteStatus {
  const allowed: VoteStatus[] = ["draft", "active", "closed", "verification", "certified"]
  return allowed.includes(status as VoteStatus) ? (status as VoteStatus) : "active"
}

function isLegacyBallot(row: StoredBallot | Ballot): row is Ballot {
  return Array.isArray((row as Ballot).choices)
}

function toStoredBallot(row: StoredBallot | Ballot): StoredBallot {
  if (!isLegacyBallot(row)) return row
  const encrypted = encryptBallotChoices(row.choices)
  return {
    voterId: row.voterId,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    timestamp: row.timestamp,
  }
}

function decryptStoredBallot(row: StoredBallot | Ballot): Ballot {
  if (isLegacyBallot(row)) {
    return { voterId: row.voterId, choices: row.choices, timestamp: row.timestamp }
  }
  const choices = decryptBallotChoices({
    ciphertext: row.ciphertext,
    iv: row.iv,
    authTag: row.authTag,
  })
  return { voterId: row.voterId, choices, timestamp: row.timestamp }
}

function computeTally(vote: CommunityVote, ballots: Ballot[]): number[] {
  const tally = new Array(vote.options.length).fill(0)
  for (const ballot of ballots) {
    for (const c of ballot.choices) {
      if (c >= 0 && c < tally.length) tally[c] += 1
    }
  }
  return tally
}

function deriveVoteStatus(vote: CommunityVote): VoteStatus {
  const now = Date.now()
  if (vote.status === "verification" || vote.status === "certified") return vote.status
  if (now > vote.endTime && vote.status === "active") return "closed"
  return vote.status
}

function rowToVote(row: {
  id: string
  org_id?: string
  orgId?: string
  title: string
  description: string
  options: string[] | unknown
  start_time?: number
  startTime?: number
  end_time?: number
  endTime?: number
  eligible_voters?: string[] | unknown
  eligibleVoters?: string[] | unknown
  allow_vote_change?: boolean
  allowVoteChange?: boolean
  status?: string
  verification_approvals?: VerificationApproval[] | unknown
  verificationApprovals?: VerificationApproval[] | unknown
  created_at?: number
  createdAt?: number
}): CommunityVote {
  const vote: CommunityVote = {
    id: row.id,
    orgId: String(row.org_id ?? row.orgId ?? ""),
    title: row.title,
    description: row.description ?? "",
    options: Array.isArray(row.options) ? row.options.map(String) : [],
    startTime: Number(row.start_time ?? row.startTime ?? 0),
    endTime: Number(row.end_time ?? row.endTime ?? 0),
    eligibleVoters: (() => {
      const raw = row.eligible_voters ?? row.eligibleVoters
      return Array.isArray(raw) ? raw.map(String) : []
    })(),
    allowVoteChange: Boolean(row.allow_vote_change ?? row.allowVoteChange),
    status: normalizeStatus(row.status),
    verificationApprovals: Array.isArray(row.verification_approvals ?? row.verificationApprovals)
      ? (row.verification_approvals ?? row.verificationApprovals) as VerificationApproval[]
      : [],
    createdAt: Number(row.created_at ?? row.createdAt ?? 0),
  }
  return { ...vote, status: deriveVoteStatus(vote) }
}

// --- JSON backend ---

async function jsonReadVotes(): Promise<CommunityVote[]> {
  const raw = await readJson<Array<CommunityVote & { status?: VoteStatus }>>(VOTES_FILE, [])
  return raw.map((v) => rowToVote(v))
}

async function jsonWriteVotes(votes: CommunityVote[]): Promise<void> {
  await writeJson(VOTES_FILE, votes)
}

async function jsonReadBallots(voteId: string): Promise<Ballot[]> {
  const ballotsByVote = await readJson<BallotsByVote>(BALLOTS_FILE, {})
  const rows = ballotsByVote[voteId] ?? []
  return rows.map(decryptStoredBallot)
}

async function jsonReadStoredBallots(voteId: string): Promise<StoredBallot[]> {
  const ballotsByVote = await readJson<BallotsByVote>(BALLOTS_FILE, {})
  return (ballotsByVote[voteId] ?? []).map(toStoredBallot)
}

async function jsonUpsertStoredBallot(voteId: string, stored: StoredBallot): Promise<void> {
  const ballotsByVote = await readJson<BallotsByVote>(BALLOTS_FILE, {})
  const existing = (ballotsByVote[voteId] ?? []).map(toStoredBallot)
  const idx = existing.findIndex((b) => b.voterId.toLowerCase() === stored.voterId.toLowerCase())
  if (idx >= 0) existing[idx] = stored
  else existing.push(stored)
  ballotsByVote[voteId] = existing
  await writeJson(BALLOTS_FILE, ballotsByVote)
}

// --- Postgres backend ---

async function pgReadVote(voteId: string): Promise<CommunityVote | null> {
  await ensureMigrated()
  return withDbClient(async (client) => {
    const res = await client.query(`SELECT * FROM community_votes WHERE id = $1`, [voteId])
    if (!res.rows[0]) return null
    return rowToVote(res.rows[0])
  })
}

async function pgReadVotesByOrg(orgId: string): Promise<CommunityVote[]> {
  await ensureMigrated()
  return withDbClient(async (client) => {
    const res = await client.query(
      `SELECT * FROM community_votes WHERE LOWER(org_id) = LOWER($1) ORDER BY created_at DESC`,
      [orgId]
    )
    return res.rows.map(rowToVote)
  })
}

async function pgInsertVote(vote: CommunityVote): Promise<void> {
  await ensureMigrated()
  await withDbClient(async (client) => {
    await client.query(
      `INSERT INTO community_votes (
        id, org_id, title, description, options, start_time, end_time,
        eligible_voters, allow_vote_change, status, verification_approvals, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        vote.id,
        vote.orgId,
        vote.title,
        vote.description,
        JSON.stringify(vote.options),
        vote.startTime,
        vote.endTime,
        JSON.stringify(vote.eligibleVoters),
        vote.allowVoteChange,
        vote.status,
        JSON.stringify(vote.verificationApprovals),
        vote.createdAt,
      ]
    )
  })
}

async function pgUpdateVote(vote: CommunityVote): Promise<void> {
  await ensureMigrated()
  await withDbClient(async (client) => {
    await client.query(
      `UPDATE community_votes SET
        title = $2, description = $3, options = $4, start_time = $5, end_time = $6,
        eligible_voters = $7, allow_vote_change = $8, status = $9,
        verification_approvals = $10
      WHERE id = $1`,
      [
        vote.id,
        vote.title,
        vote.description,
        JSON.stringify(vote.options),
        vote.startTime,
        vote.endTime,
        JSON.stringify(vote.eligibleVoters),
        vote.allowVoteChange,
        vote.status,
        JSON.stringify(vote.verificationApprovals),
      ]
    )
  })
}

async function pgReadBallots(voteId: string): Promise<Ballot[]> {
  await ensureMigrated()
  return withDbClient(async (client) => {
    const res = await client.query(
      `SELECT voter_id, ciphertext, iv, auth_tag, timestamp FROM community_ballots WHERE vote_id = $1`,
      [voteId]
    )
    return res.rows.map((row) =>
      decryptStoredBallot({
        voterId: row.voter_id,
        ciphertext: row.ciphertext,
        iv: row.iv,
        authTag: row.auth_tag,
        timestamp: Number(row.timestamp),
      })
    )
  })
}

async function pgUpsertStoredBallot(voteId: string, stored: StoredBallot): Promise<void> {
  await ensureMigrated()
  await withDbClient(async (client) => {
    await client.query(
      `INSERT INTO community_ballots (vote_id, voter_id, ciphertext, iv, auth_tag, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (vote_id, voter_id) DO UPDATE SET
         ciphertext = EXCLUDED.ciphertext,
         iv = EXCLUDED.iv,
         auth_tag = EXCLUDED.auth_tag,
         timestamp = EXCLUDED.timestamp`,
      [voteId, stored.voterId, stored.ciphertext, stored.iv, stored.authTag, stored.timestamp]
    )
  })
}

// --- Public API ---

export async function createCommunityVote(input: {
  orgId: string
  title: string
  description: string
  options: unknown
  startTime: number
  endTime: number
  eligibleVoters: unknown
  allowVoteChange: boolean
}): Promise<{ ok: true; vote: CommunityVote } | { ok: false; error: string; status: number }> {
  const orgId = normalizeOrgId(input.orgId)
  if (!orgId) return { ok: false, error: "invalid orgId", status: 400 }
  if (isOffchainOrgId(orgId)) {
    const co = await getCommunityOrgById(orgId)
    if (!co) return { ok: false, error: "community org not found", status: 404 }
  }
  const title = input.title.trim()
  if (!title) return { ok: false, error: "title required", status: 400 }
  const options = normalizeOptions(input.options)
  if (!options) return { ok: false, error: "at least two options required", status: 400 }

  const startTime = Number(input.startTime)
  const endTime = Number(input.endTime)
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return { ok: false, error: "invalid start/end time", status: 400 }
  }

  const eligibleVoters = Array.isArray(input.eligibleVoters)
    ? input.eligibleVoters
        .map((v) => normalizeEthAddress(String(v)))
        .filter((v): v is string => !!v)
    : []

  const vote: CommunityVote = {
    id: randomUUID(),
    orgId,
    title,
    description: input.description?.trim() ?? "",
    options,
    startTime,
    endTime,
    eligibleVoters,
    allowVoteChange: !!input.allowVoteChange,
    status: "active",
    verificationApprovals: [],
    createdAt: Date.now(),
  }

  if (hasDatabase()) {
    await pgInsertVote(vote)
  } else {
    const votes = await jsonReadVotes()
    votes.push(vote)
    await jsonWriteVotes(votes)
  }

  return { ok: true, vote }
}

export async function castCommunityBallot(input: {
  voteId: string
  voterId: string
  choices: unknown
}): Promise<{ ok: true; receipt: BallotReceipt } | { ok: false; error: string; status: number }> {
  const voteId = input.voteId.trim()
  if (!voteId) return { ok: false, error: "voteId required", status: 400 }
  const voterId = normalizeEthAddress(input.voterId)
  if (!voterId) return { ok: false, error: "invalid voterId", status: 400 }

  const vote = hasDatabase() ? await pgReadVote(voteId) : (await jsonReadVotes()).find((v) => v.id === voteId) ?? null
  if (!vote) return { ok: false, error: "vote not found", status: 404 }

  const now = Date.now()
  if (now < vote.startTime) return { ok: false, error: "vote has not started", status: 400 }
  if (now > vote.endTime) return { ok: false, error: "vote has ended", status: 400 }

  if (
    vote.eligibleVoters.length > 0 &&
    !vote.eligibleVoters.some((v) => v.toLowerCase() === voterId.toLowerCase())
  ) {
    return { ok: false, error: "voter not eligible", status: 403 }
  }

  if (!Array.isArray(input.choices) || input.choices.length === 0) {
    return { ok: false, error: "choices required", status: 400 }
  }
  const choices = [...new Set(input.choices.map((c) => Number(c)))]
  const valid = choices.every((c) => Number.isInteger(c) && c >= 0 && c < vote.options.length)
  if (!valid) return { ok: false, error: "invalid choices", status: 400 }

  const ballots = hasDatabase() ? await pgReadBallots(voteId) : await jsonReadBallots(voteId)
  const existing = ballots.find((b) => b.voterId.toLowerCase() === voterId.toLowerCase())
  if (existing && !vote.allowVoteChange) {
    return { ok: false, error: "vote change disabled", status: 409 }
  }

  const encrypted = encryptBallotChoices(choices)
  const stored: StoredBallot = {
    voterId,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    authTag: encrypted.authTag,
    timestamp: now,
  }

  if (hasDatabase()) {
    await pgUpsertStoredBallot(voteId, stored)
  } else {
    await jsonUpsertStoredBallot(voteId, stored)
  }

  return { ok: true, receipt: { voterId, timestamp: now } }
}

async function buildPublicView(
  vote: CommunityVote,
  viewerAddress: string | null
): Promise<CommunityVotePublic> {
  const { isVoteOrgMember } = await import("./access")
  const isMember = viewerAddress ? await isVoteOrgMember(vote.orgId, viewerAddress) : false
  if (!isMember) {
    return { vote, tally: null, totalBallots: null }
  }
  const stored = hasDatabase()
    ? await pgReadBallots(vote.id)
    : await jsonReadBallots(vote.id)
  const ballots = stored.map(decryptStoredBallot)
  return {
    vote,
    tally: computeTally(vote, ballots),
    totalBallots: ballots.length,
  }
}

export async function getCommunityVotePublic(
  voteId: string,
  viewerAddress?: string | null
): Promise<CommunityVotePublic | null> {
  const id = voteId.trim()
  if (!id) return null
  const viewer = viewerAddress ? normalizeEthAddress(viewerAddress) : null
  const vote = hasDatabase()
    ? await pgReadVote(id)
    : (await jsonReadVotes()).find((v) => v.id === id) ?? null
  if (!vote) return null
  return buildPublicView(vote, viewer)
}

/** @deprecated Use getCommunityVotePublic — never exposes ballot choices to clients. */
export async function getCommunityVote(voteId: string): Promise<{
  vote: CommunityVote | null
  tally: number[]
  totalBallots: number
}> {
  const result = await getCommunityVotePublic(voteId, null)
  if (!result) return { vote: null, tally: [], totalBallots: 0 }
  const stored = hasDatabase()
    ? await pgReadBallots(voteId)
    : await jsonReadBallots(voteId)
  const ballots = stored.map(decryptStoredBallot)
  return {
    vote: result.vote,
    tally: result.tally ?? computeTally(result.vote, ballots),
    totalBallots: ballots.length,
  }
}

export async function listCommunityVotesByOrg(orgId: string): Promise<CommunityVote[]> {
  const org = normalizeOrgId(orgId)
  if (!org) return []
  if (hasDatabase()) return pgReadVotesByOrg(org)
  const o = org.toLowerCase()
  const votes = await jsonReadVotes()
  return votes.filter((v) => v.orgId.toLowerCase() === o).sort((a, b) => b.createdAt - a.createdAt)
}

export async function listCommunityVotesByOrgWithSummary(
  orgId: string,
  viewerAddress?: string | null
): Promise<CommunityVoteSummary[]> {
  const votes = await listCommunityVotesByOrg(orgId)
  const viewer = viewerAddress ? normalizeEthAddress(viewerAddress) : null
  const { isVoteOrgMember } = await import("./access")
  const isMember = viewer ? await isVoteOrgMember(orgId, viewer) : false

  const summaries: CommunityVoteSummary[] = []
  for (const vote of votes) {
    if (!isMember) {
      summaries.push({ ...vote, tally: null, totalBallots: null })
      continue
    }
    const stored = hasDatabase()
      ? await pgReadBallots(vote.id)
      : await jsonReadBallots(vote.id)
    const ballots = stored.map(decryptStoredBallot)
    summaries.push({
      ...vote,
      tally: computeTally(vote, ballots),
      totalBallots: ballots.length,
    })
  }
  return summaries
}

/**
 * Auditor-only reveal after admin opened the verification window.
 * Org admin never receives ballots from this path (caller must enforce role).
 */
export async function listAuditorBallots(input: {
  voteId: string
  auditor: string
}): Promise<
  | { ok: true; ballots: Ballot[] }
  | { ok: false; error: string; status: number }
> {
  const id = input.voteId.trim()
  if (!id) return { ok: false, error: "vote id required", status: 400 }
  const auditor = normalizeEthAddress(input.auditor)
  if (!auditor) return { ok: false, error: "invalid auditor", status: 400 }

  const vote = hasDatabase()
    ? await pgReadVote(id)
    : (await jsonReadVotes()).find((v) => v.id === id) ?? null
  if (!vote) return { ok: false, error: "vote not found", status: 404 }

  if (await isVoteOrgAdmin(vote.orgId, auditor)) {
    return { ok: false, error: "org admin cannot reveal ballots", status: 403 }
  }
  if (!(await isVoteOrgAuditor(vote.orgId, auditor))) {
    return { ok: false, error: "designated auditor required", status: 403 }
  }
  if (vote.status !== "verification") {
    return { ok: false, error: "verification window is not open", status: 403 }
  }

  const stored = hasDatabase() ? await pgReadBallots(id) : await jsonReadBallots(id)
  const ballots = stored.map(decryptStoredBallot)
  await appendBallotAudit({
    voteId: id,
    actor: auditor,
    action: "view_ballots",
  })
  return { ok: true, ballots }
}

/** Admin opens or closes the verification window (lifecycle only). */
export async function handleVerificationAction(input: {
  voteId: string
  signer: string
  action: "open" | "close"
}): Promise<{ ok: true; vote: CommunityVote } | { ok: false; error: string; status: number }> {
  const voteId = input.voteId.trim()
  if (!voteId) return { ok: false, error: "voteId required", status: 400 }
  const signer = normalizeEthAddress(input.signer)
  if (!signer) return { ok: false, error: "invalid signer", status: 400 }
  if (input.action !== "open" && input.action !== "close") {
    return { ok: false, error: "action must be open or close", status: 400 }
  }

  const vote = hasDatabase()
    ? await pgReadVote(voteId)
    : (await jsonReadVotes()).find((v) => v.id === voteId) ?? null
  if (!vote) return { ok: false, error: "vote not found", status: 404 }

  const admin = await isVoteOrgAdmin(vote.orgId, signer)
  if (!admin) return { ok: false, error: "org admin required", status: 403 }

  const now = Date.now()

  if (input.action === "open") {
    if (now <= vote.endTime) {
      return { ok: false, error: "vote must end before opening verification", status: 400 }
    }
    if (vote.status === "verification") {
      return { ok: false, error: "verification already open", status: 409 }
    }
    if (vote.status === "certified") {
      return { ok: false, error: "vote already certified", status: 409 }
    }
    vote.status = "verification"
  } else {
    if (vote.status !== "verification") {
      return { ok: false, error: "verification is not open", status: 400 }
    }
    vote.status = "closed"
  }

  vote.verificationApprovals = [
    ...vote.verificationApprovals,
    { signer, approvedAt: now, action: input.action },
  ]

  if (hasDatabase()) {
    await pgUpdateVote(vote)
  } else {
    const votes = await jsonReadVotes()
    const idx = votes.findIndex((v) => v.id === voteId)
    if (idx >= 0) votes[idx] = vote
    await jsonWriteVotes(votes)
  }

  return { ok: true, vote }
}

export async function isVerificationOpen(voteId: string): Promise<boolean> {
  const vote = hasDatabase()
    ? await pgReadVote(voteId)
    : (await jsonReadVotes()).find((v) => v.id === voteId) ?? null
  return vote?.status === "verification"
}

export async function listBallotVoterIdsForOrg(orgId: string): Promise<string[]> {
  const votes = await listCommunityVotesByOrg(orgId)
  const voters = new Set<string>()
  for (const vote of votes) {
    const ballots = hasDatabase()
      ? await pgReadBallots(vote.id)
      : await jsonReadBallots(vote.id)
    for (const ballot of ballots) {
      voters.add(ballot.voterId.toLowerCase())
    }
  }
  return [...voters]
}
