import { promises as fs } from "fs"
import path from "path"
import { createPublicClient, http, type Address } from "viem"
import {
  normalizeCreator,
  getCommunityOrgById,
} from "@/lib/community-orgs/store"
import { normalizeOrgId } from "@/lib/org-id"
import { anvil } from "@/lib/web3-server"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "messageboard-mutes.json")

export type MessageboardMuteRecord = {
  orgKey: string
  user: string
  mutedUntil: number
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
  const n = normalizeOrgId(t)
  if (!n) return null
  return n.toLowerCase()
}

export function activeMutedUntilForUser(
  rows: MessageboardMuteRecord[],
  orgKey: string,
  userAddress: string
): number | null {
  const o = orgKeyLower(orgKey)
  const u = normalizeCreator(userAddress)
  if (!o || !u) return null
  const low = u.toLowerCase()
  const now = Date.now()
  let best = 0
  for (const r of rows) {
    if (r.orgKey.toLowerCase() !== o) continue
    if (r.user.toLowerCase() !== low) continue
    if (r.mutedUntil > now && r.mutedUntil > best) best = r.mutedUntil
  }
  return best > 0 ? best : null
}

export async function getActiveMutedUntil(
  orgKey: string,
  userAddress: string
): Promise<number | null> {
  const rows = await readAll()
  return activeMutedUntilForUser(rows, orgKey, userAddress)
}

export async function listActiveMutesForOrg(orgKey: string): Promise<
  { user: string; mutedUntil: number }[]
> {
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
  return [...byUser.entries()].map(([low, until]) => ({
    user: normalizeCreator(low) ?? low,
    mutedUntil: until,
  }))
}

const orgAdminAbi = [
  {
    name: "isAdmin",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const

async function assertOrgAdmin(
  orgSlug: string,
  adminAddress: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const admin = normalizeCreator(adminAddress)
  if (!admin) return { ok: false, error: "invalid admin address", status: 400 }

  const normalizedOrg = normalizeOrgId(orgSlug.trim())
  if (!normalizedOrg) {
    return { ok: false, error: "invalid org", status: 400 }
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (uuidRe.test(normalizedOrg)) {
    const org = await getCommunityOrgById(normalizedOrg)
    if (!org) return { ok: false, error: "org not found", status: 404 }
    if (org.creatorAddress.toLowerCase() !== admin.toLowerCase()) {
      return { ok: false, error: "only the org admin can mute", status: 403 }
    }
    return { ok: true }
  }

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8546"
  const client = createPublicClient({
    chain: anvil,
    transport: http(rpcUrl),
  })
  try {
    const isAdm = await client.readContract({
      address: normalizedOrg as Address,
      abi: orgAdminAbi,
      functionName: "isAdmin",
      args: [admin as Address],
    })
    if (!isAdm) {
      return { ok: false, error: "only the org admin can mute", status: 403 }
    }
  } catch {
    return { ok: false, error: "could not verify admin on-chain", status: 400 }
  }
  return { ok: true }
}

export async function setMessageboardMute(input: {
  orgKey: string
  targetUser: string
  mutedUntil: number
  adminAddress: string
}): Promise<
  { ok: true; record: MessageboardMuteRecord } | { ok: false; error: string; status: number }
> {
  const org = orgKeyLower(input.orgKey)
  if (!org) return { ok: false, error: "invalid org", status: 400 }
  const target = normalizeCreator(input.targetUser)
  if (!target) return { ok: false, error: "invalid user address", status: 400 }
  const admin = normalizeCreator(input.adminAddress)
  if (!admin) return { ok: false, error: "invalid admin address", status: 400 }
  if (target.toLowerCase() === admin.toLowerCase()) {
    return { ok: false, error: "cannot mute yourself", status: 400 }
  }
  if (input.mutedUntil <= Date.now()) {
    return { ok: false, error: "mute must end in the future", status: 400 }
  }

  const gate = await assertOrgAdmin(input.orgKey, input.adminAddress)
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
  adminAddress: string
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const org = orgKeyLower(input.orgKey)
  if (!org) return { ok: false, error: "invalid org", status: 400 }
  const target = normalizeCreator(input.targetUser)
  if (!target) return { ok: false, error: "invalid user address", status: 400 }

  const gate = await assertOrgAdmin(input.orgKey, input.adminAddress)
  if (!gate.ok) return gate

  const rows = await readAll()
  const low = target.toLowerCase()
  const cleared = rows.filter(
    (r) =>
      !(
        r.orgKey.toLowerCase() === org &&
        r.user.toLowerCase() === low
      )
  )
  await writeAll(cleared)
  return { ok: true }
}
