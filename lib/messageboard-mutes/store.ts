import { promises as fs } from "fs"
import path from "path"
import { getCommunityOrgById } from "@/lib/community-orgs/store"
import { normalizeOrgId } from "@/lib/org-id"
import { isSameParticipant, normalizeParticipantId } from "@/lib/participant-id"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "messageboard-mutes.json")

export type MessageboardMuteRecord = {
  orgKey: string
  /** Account id of the muted person. */
  user: string
  mutedUntil: number
  /** Account id of the admin who set it. */
  setBy: string
  setAt: number
}

async function readAll(): Promise<MessageboardMuteRecord[]> {
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

async function writeAll(rows: MessageboardMuteRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(STORE_FILE, JSON.stringify(rows, null, 2), "utf8")
}

function orgKeyLower(orgKey: string): string | null {
  const t = orgKey.trim()
  if (!t) return null
  return normalizeOrgId(t)
}

export function activeMutedUntilForUser(
  rows: MessageboardMuteRecord[],
  orgKey: string,
  accountId: string
): number | null {
  const o = orgKeyLower(orgKey)
  const u = normalizeParticipantId(accountId)
  if (!o || !u) return null
  const now = Date.now()
  let best = 0
  for (const r of rows) {
    if (r.orgKey.toLowerCase() !== o) continue
    if (!isSameParticipant(r.user, u)) continue
    if (r.mutedUntil > now && r.mutedUntil > best) best = r.mutedUntil
  }
  return best > 0 ? best : null
}

export async function getActiveMutedUntil(orgKey: string, accountId: string): Promise<number | null> {
  const rows = await readAll()
  return activeMutedUntilForUser(rows, orgKey, accountId)
}

export async function listActiveMutesForOrg(orgKey: string): Promise<{ user: string; mutedUntil: number }[]> {
  const o = orgKeyLower(orgKey)
  if (!o) return []
  const rows = await readAll()
  const now = Date.now()
  const byUser = new Map<string, number>()
  for (const r of rows) {
    if (r.orgKey.toLowerCase() !== o) continue
    if (r.mutedUntil <= now) continue
    const low = r.user.toLowerCase()
    const prev = byUser.get(low) ?? 0
    if (r.mutedUntil > prev) byUser.set(low, r.mutedUntil)
  }
  return [...byUser.entries()].map(([user, mutedUntil]) => ({ user, mutedUntil }))
}

async function assertOrgAdmin(
  orgKey: string,
  adminId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const admin = normalizeParticipantId(adminId)
  if (!admin) return { ok: false, error: "Sign in first.", status: 401 }
  const org = await getCommunityOrgById(orgKey)
  if (!org) return { ok: false, error: "org not found", status: 404 }
  if (!isSameParticipant(org.creatorId, admin)) {
    return { ok: false, error: "only the org admin can mute", status: 403 }
  }
  return { ok: true }
}

export async function setMessageboardMute(input: {
  orgKey: string
  targetUser: string
  mutedUntil: number
  adminId: string
}): Promise<{ ok: true; record: MessageboardMuteRecord } | { ok: false; error: string; status: number }> {
  const org = orgKeyLower(input.orgKey)
  if (!org) return { ok: false, error: "invalid org", status: 400 }
  const target = normalizeParticipantId(input.targetUser)
  if (!target) return { ok: false, error: "choose a member to mute", status: 400 }
  const admin = normalizeParticipantId(input.adminId)
  if (!admin) return { ok: false, error: "Sign in first.", status: 401 }
  if (isSameParticipant(target, admin)) {
    return { ok: false, error: "cannot mute yourself", status: 400 }
  }
  if (input.mutedUntil <= Date.now()) {
    return { ok: false, error: "mute must end in the future", status: 400 }
  }

  const gate = await assertOrgAdmin(org, admin)
  if (!gate.ok) return gate

  const rows = await readAll()
  const record: MessageboardMuteRecord = {
    orgKey: org,
    user: target,
    mutedUntil: input.mutedUntil,
    setBy: admin,
    setAt: Date.now(),
  }
  rows.push(record)
  await writeAll(rows)
  return { ok: true, record }
}

export async function clearMessageboardMute(input: {
  orgKey: string
  targetUser: string
  adminId: string
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const org = orgKeyLower(input.orgKey)
  if (!org) return { ok: false, error: "invalid org", status: 400 }
  const target = normalizeParticipantId(input.targetUser)
  if (!target) return { ok: false, error: "choose a member", status: 400 }

  const gate = await assertOrgAdmin(org, input.adminId)
  if (!gate.ok) return gate

  const rows = await readAll()
  const cleared = rows.filter((r) => !(r.orgKey.toLowerCase() === org && isSameParticipant(r.user, target)))
  await writeAll(cleared)
  return { ok: true }
}
