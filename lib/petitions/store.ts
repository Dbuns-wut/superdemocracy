import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { ensureMigrated, hasDatabase, withDbClient } from "@/lib/db"
import { getCommunityOrgById, getCommunityOrgMembersList } from "@/lib/community-orgs/store"
import { getOrgSettings } from "@/lib/org-settings/store"
import { normalizeOrgId } from "@/lib/org-id"
import { isSameParticipant, normalizeParticipantId } from "@/lib/participant-id"
import { isVoteOrgAdmin, isVoteOrgAuditor, isVoteOrgMember } from "@/lib/votes/access"
import { createCommunityVote } from "@/lib/votes/store"
import type { Petition, PetitionSignature, PetitionView } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = path.join(DATA_DIR, "petitions.json")

type Result<T> = { ok: true; petition: T } | { ok: false; error: string; status: number }

function activeSignatures(petition: Petition): PetitionSignature[] {
  return petition.signatures.filter((row) => !row.removedAt)
}

function supportCount(petition: Petition): number {
  return activeSignatures(petition).length
}

async function readJson(): Promise<Petition[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as Petition[]) : []
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return []
    throw e
  }
}

async function writeJson(rows: Petition[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(rows, null, 2), "utf8")
}

async function readAll(): Promise<Petition[]> {
  if (!hasDatabase()) return readJson()
  await ensureMigrated()
  return withDbClient(async (client) => {
    const res = await client.query(`SELECT body FROM petitions`)
    return res.rows.map((row) => row.body as Petition)
  })
}

async function readOne(id: string): Promise<Petition | null> {
  if (!hasDatabase()) {
    return (await readJson()).find((row) => row.id === id) ?? null
  }
  await ensureMigrated()
  return withDbClient(async (client) => {
    const res = await client.query(`SELECT body FROM petitions WHERE id = $1`, [id])
    return (res.rows[0]?.body as Petition | undefined) ?? null
  })
}

async function save(petition: Petition): Promise<void> {
  if (!hasDatabase()) {
    const rows = await readJson()
    const idx = rows.findIndex((row) => row.id === petition.id)
    if (idx >= 0) rows[idx] = petition
    else rows.push(petition)
    await writeJson(rows)
    return
  }
  await ensureMigrated()
  await withDbClient(async (client) => {
    await client.query(
      `INSERT INTO petitions (id, org_id, body) VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (id) DO UPDATE SET org_id = EXCLUDED.org_id, body = EXCLUDED.body`,
      [petition.id, petition.orgId, JSON.stringify(petition)]
    )
  })
}

/** Drop signers who are no longer members. The original row stays, marked removed. */
async function refreshEligibility(petition: Petition): Promise<Petition> {
  if (petition.status === "launched" || petition.status === "rejected") return petition
  const members = (await getCommunityOrgMembersList(petition.orgId)) ?? []
  const memberIds = new Set(members.map((id) => id.toLowerCase()))
  let changed = false
  const signatures = petition.signatures.map((row) => {
    if (row.removedAt) return row
    if (memberIds.has(row.accountId.toLowerCase())) return row
    changed = true
    return { ...row, removedAt: Date.now(), removedReason: "not-a-member" as const }
  })
  if (!changed) return petition
  const next = { ...petition, signatures }
  await save(next)
  return next
}

async function thresholdFor(orgId: string): Promise<number> {
  const settings = await getOrgSettings(orgId)
  return settings?.petitionThreshold ?? 1
}

async function assertPetitionsOn(orgId: string): Promise<Result<never> | null> {
  const settings = await getOrgSettings(orgId)
  if (!settings?.citizenInitiativesEnabled) {
    return { ok: false, error: "This organization has not turned on petitions.", status: 403 }
  }
  return null
}

function toView(petition: Petition, viewerId: string, threshold: number, isCounter: boolean): PetitionView {
  const mine = activeSignatures(petition).find((row) => isSameParticipant(row.accountId, viewerId))
  return {
    id: petition.id,
    orgId: petition.orgId,
    title: petition.title,
    description: petition.description,
    options: petition.options,
    creatorId: petition.creatorId,
    status: petition.status,
    support: supportCount(petition),
    threshold,
    createdAt: petition.createdAt,
    voteId: petition.voteId ?? null,
    signedAt: mine?.signedAt ?? null,
    signers: isCounter
      ? activeSignatures(petition).map((row) => ({ accountId: row.accountId, signedAt: row.signedAt }))
      : null,
    removed: isCounter
      ? petition.signatures
          .filter((row) => row.removedAt)
          .map((row) => ({ accountId: row.accountId, removedAt: row.removedAt as number }))
      : null,
  }
}

export async function listPetitionsForViewer(input: {
  orgId: string
  viewerId: string
}): Promise<{ ok: true; petitions: PetitionView[]; threshold: number; enabled: boolean } | { ok: false; error: string; status: number }> {
  const orgId = normalizeOrgId(input.orgId)
  const viewerId = normalizeParticipantId(input.viewerId)
  if (!orgId) return { ok: false, error: "invalid orgId", status: 400 }
  if (!viewerId) return { ok: false, error: "Sign in first.", status: 401 }
  const org = await getCommunityOrgById(orgId)
  if (!org) return { ok: false, error: "organization not found", status: 404 }
  if (!(await isVoteOrgMember(orgId, viewerId))) {
    return { ok: false, error: "Members only.", status: 403 }
  }
  const settings = await getOrgSettings(orgId)
  const enabled = Boolean(settings?.citizenInitiativesEnabled)
  const threshold = settings?.petitionThreshold ?? 1
  if (!enabled) return { ok: true, petitions: [], threshold, enabled }
  const isCounter = await isVoteOrgAuditor(orgId, viewerId)
  const rows = (await readAll())
    .filter((row) => row.orgId.toLowerCase() === orgId.toLowerCase())
    .sort((a, b) => b.createdAt - a.createdAt)
  const petitions: PetitionView[] = []
  for (const row of rows) {
    const fresh = await refreshEligibility(row)
    petitions.push(toView(fresh, viewerId, threshold, isCounter))
  }
  return { ok: true, petitions, threshold, enabled }
}

export async function createPetition(input: {
  orgId: string
  creatorId: string
  title: string
  description: string
  options: unknown
}): Promise<Result<PetitionView>> {
  const orgId = normalizeOrgId(input.orgId)
  const creatorId = normalizeParticipantId(input.creatorId)
  if (!orgId) return { ok: false, error: "invalid orgId", status: 400 }
  if (!creatorId) return { ok: false, error: "Sign in first.", status: 401 }
  const org = await getCommunityOrgById(orgId)
  if (!org) return { ok: false, error: "organization not found", status: 404 }
  const blocked = await assertPetitionsOn(orgId)
  if (blocked) return blocked
  if (!(await isVoteOrgMember(orgId, creatorId))) {
    return { ok: false, error: "Only a member can start a petition.", status: 403 }
  }
  const title = input.title.trim()
  const description = input.description.trim()
  if (!title) return { ok: false, error: "A title is required.", status: 400 }
  if (!description) return { ok: false, error: "A description is required.", status: 400 }
  if (!Array.isArray(input.options)) return { ok: false, error: "At least two options are required.", status: 400 }
  const options = input.options.map((option) => (typeof option === "string" ? option.trim() : "")).filter(Boolean)
  if (options.length < 2) return { ok: false, error: "At least two options are required.", status: 400 }

  const now = Date.now()
  const petition: Petition = {
    id: randomUUID(),
    orgId,
    title,
    description,
    options,
    creatorId,
    status: "open",
    signatures: [{ accountId: creatorId, signedAt: now }],
    createdAt: now,
  }
  await save(petition)
  const threshold = await thresholdFor(orgId)
  return { ok: true, petition: toView(petition, creatorId, threshold, false) }
}

export async function signPetition(input: {
  petitionId: string
  accountId: string
}): Promise<Result<PetitionView>> {
  const accountId = normalizeParticipantId(input.accountId)
  if (!accountId) return { ok: false, error: "Sign in first.", status: 401 }
  const existing = await readOne(input.petitionId.trim())
  if (!existing) return { ok: false, error: "Petition not found.", status: 404 }
  const blocked = await assertPetitionsOn(existing.orgId)
  if (blocked) return blocked
  if (!(await isVoteOrgMember(existing.orgId, accountId))) {
    return { ok: false, error: "Only a member can sign.", status: 403 }
  }
  const petition = await refreshEligibility(existing)
  if (petition.status !== "open") {
    return { ok: false, error: "This petition is no longer collecting support.", status: 409 }
  }
  if (activeSignatures(petition).some((row) => isSameParticipant(row.accountId, accountId))) {
    return { ok: false, error: "You already signed this petition.", status: 409 }
  }
  const next: Petition = {
    ...petition,
    signatures: [...petition.signatures, { accountId, signedAt: Date.now() }],
  }
  await save(next)
  const threshold = await thresholdFor(next.orgId)
  const isCounter = await isVoteOrgAuditor(next.orgId, accountId)
  return { ok: true, petition: toView(next, accountId, threshold, isCounter) }
}

export async function decidePetition(input: {
  petitionId: string
  adminId: string
  action: "approve" | "reject"
}): Promise<Result<PetitionView>> {
  const adminId = normalizeParticipantId(input.adminId)
  if (!adminId) return { ok: false, error: "Sign in first.", status: 401 }
  const existing = await readOne(input.petitionId.trim())
  if (!existing) return { ok: false, error: "Petition not found.", status: 404 }
  if (!(await isVoteOrgAdmin(existing.orgId, adminId))) {
    return { ok: false, error: "Only the organization admin can decide a petition.", status: 403 }
  }
  const petition = await refreshEligibility(existing)
  if (petition.status !== "open") {
    return { ok: false, error: "This petition has already been decided.", status: 409 }
  }
  const threshold = await thresholdFor(petition.orgId)
  if (input.action === "approve" && supportCount(petition) < threshold) {
    return {
      ok: false,
      error: `Needs ${threshold} current members. ${supportCount(petition)} have signed.`,
      status: 400,
    }
  }
  const next: Petition = {
    ...petition,
    status: input.action === "approve" ? "approved" : "rejected",
    decidedAt: Date.now(),
    decidedBy: adminId,
  }
  await save(next)
  return { ok: true, petition: toView(next, adminId, threshold, false) }
}

export async function launchPetition(input: {
  petitionId: string
  adminId: string
  startTime: number
  endTime: number
  allowVoteChange: boolean
}): Promise<Result<PetitionView>> {
  const adminId = normalizeParticipantId(input.adminId)
  if (!adminId) return { ok: false, error: "Sign in first.", status: 401 }
  const petition = await readOne(input.petitionId.trim())
  if (!petition) return { ok: false, error: "Petition not found.", status: 404 }
  if (!(await isVoteOrgAdmin(petition.orgId, adminId))) {
    return { ok: false, error: "Only the organization admin can launch a referendum.", status: 403 }
  }
  if (petition.status !== "approved") {
    return { ok: false, error: "Approve the petition before launching a referendum.", status: 409 }
  }
  const created = await createCommunityVote({
    orgId: petition.orgId,
    title: petition.title,
    description: petition.description,
    options: petition.options,
    startTime: input.startTime,
    endTime: input.endTime,
    eligibleVoters: [],
    allowVoteChange: input.allowVoteChange,
    kind: "referendum",
    petitionId: petition.id,
  })
  if (!created.ok) return created
  const next: Petition = { ...petition, status: "launched", voteId: created.vote.id }
  await save(next)
  const threshold = await thresholdFor(next.orgId)
  return { ok: true, petition: toView(next, adminId, threshold, false) }
}
