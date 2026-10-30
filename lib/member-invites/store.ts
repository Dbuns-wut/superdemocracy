import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { getCommunityOrgById } from "@/lib/community-orgs/store"
import { normalizeOrgId } from "@/lib/org-id"
import { isSameParticipant, normalizeParticipantId } from "@/lib/participant-id"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "member-invites.json")

export type MemberInviteRecord = {
  id: string
  /** Path segment for `/orgs/[orgId]/apply` */
  orgSlug: string
  orgTitle: string
  /** Account ids. */
  invitee: string
  inviter: string
  createdAt: number
  read: boolean
}

async function readAll(): Promise<MemberInviteRecord[]> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return []
    throw e
  }
}

async function writeAll(rows: MemberInviteRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(STORE_FILE, JSON.stringify(rows, null, 2), "utf8")
}

async function assertInviterIsOrgAdmin(
  orgId: string,
  inviter: string
): Promise<{ ok: true; title: string } | { ok: false; error: string; status: number }> {
  const inv = normalizeParticipantId(inviter)
  if (!inv) return { ok: false, error: "Sign in first.", status: 401 }
  const org = await getCommunityOrgById(orgId)
  if (!org) return { ok: false, error: "org not found", status: 404 }
  if (org.membershipMode !== "Manual") {
    return { ok: false, error: "invites only for manual membership orgs", status: 400 }
  }
  if (!isSameParticipant(org.creatorId, inv)) {
    return { ok: false, error: "only the org admin can invite", status: 403 }
  }
  return { ok: true, title: org.title }
}

export async function listMemberInvitesForUser(accountId: string): Promise<MemberInviteRecord[]> {
  const u = normalizeParticipantId(accountId)
  if (!u) return []
  const rows = await readAll()
  return rows.filter((r) => isSameParticipant(r.invitee, u)).sort((a, b) => b.createdAt - a.createdAt)
}

export async function createMemberInvite(input: {
  orgSlug: string
  invitee: string
  inviter: string
}): Promise<{ ok: true; invite: MemberInviteRecord } | { ok: false; error: string; status: number }> {
  const orgId = normalizeOrgId(input.orgSlug.trim())
  if (!orgId) return { ok: false, error: "invalid org", status: 400 }
  const invitee = normalizeParticipantId(input.invitee)
  if (!invitee) return { ok: false, error: "choose a person to invite", status: 400 }
  const inviter = normalizeParticipantId(input.inviter)
  if (!inviter) return { ok: false, error: "Sign in first.", status: 401 }
  if (isSameParticipant(inviter, invitee)) {
    return { ok: false, error: "cannot invite yourself", status: 400 }
  }

  const gate = await assertInviterIsOrgAdmin(orgId, inviter)
  if (!gate.ok) return gate

  const rows = await readAll()
  const invite: MemberInviteRecord = {
    id: randomUUID(),
    orgSlug: orgId,
    orgTitle: gate.title,
    invitee,
    inviter,
    createdAt: Date.now(),
    read: false,
  }
  rows.push(invite)
  await writeAll(rows)
  return { ok: true, invite }
}

export async function markMemberInviteRead(
  id: string,
  accountId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const u = normalizeParticipantId(accountId)
  if (!u) return { ok: false, error: "Sign in first.", status: 401 }
  const rows = await readAll()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx === -1) return { ok: false, error: "not found", status: 404 }
  const row = rows[idx]
  if (!isSameParticipant(row.invitee, u)) {
    return { ok: false, error: "forbidden", status: 403 }
  }
  rows[idx] = { ...row, read: true }
  await writeAll(rows)
  return { ok: true }
}
