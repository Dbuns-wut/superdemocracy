import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import {
  normalizeCreator,
  getCommunityOrgById,
} from "@/lib/community-orgs/store"
import { normalizeOrgId } from "@/lib/org-id"
import { createPublicClient, http, type Address } from "viem"
import { anvil } from "@/lib/web3-server"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "member-invites.json")

export type MemberInviteRecord = {
  id: string
  /** Path segment for `/orgs/[address]/apply` */
  orgSlug: string
  orgTitle: string
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

const orgAdminAbi = [
  {
    name: "isAdmin",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const

async function assertInviterIsOrgAdmin(
  orgSlug: string,
  inviter: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const inv = normalizeCreator(inviter)
  if (!inv) return { ok: false, error: "invalid inviter", status: 400 }

  const normalizedOrg = normalizeOrgId(orgSlug)
  if (!normalizedOrg) {
    return { ok: false, error: "invalid org", status: 400 }
  }

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (uuidRe.test(normalizedOrg)) {
    const org = await getCommunityOrgById(normalizedOrg)
    if (!org) return { ok: false, error: "org not found", status: 404 }
    if (org.membershipMode !== "Manual") {
      return { ok: false, error: "invites only for manual membership orgs", status: 400 }
    }
    if (org.creatorAddress.toLowerCase() !== inv.toLowerCase()) {
      return { ok: false, error: "only the org admin can invite", status: 403 }
    }
    return { ok: true }
  }

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8546"
  const client = createPublicClient({
    chain: anvil,
    transport: http(rpcUrl),
  })
  try {
    const admin = await client.readContract({
      address: normalizedOrg as Address,
      abi: orgAdminAbi,
      functionName: "isAdmin",
      args: [inv as Address],
    })
    if (!admin) {
      return { ok: false, error: "only the org admin can invite", status: 403 }
    }
  } catch {
    return { ok: false, error: "could not verify admin on-chain", status: 400 }
  }
  return { ok: true }
}

export async function listMemberInvitesForUser(
  wallet: string
): Promise<MemberInviteRecord[]> {
  const u = normalizeCreator(wallet)
  if (!u) return []
  const low = u.toLowerCase()
  const rows = await readAll()
  return rows
    .filter((r) => r.invitee.toLowerCase() === low)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function createMemberInvite(input: {
  orgSlug: string
  orgTitle: string
  invitee: string
  inviter: string
}): Promise<
  | { ok: true; invite: MemberInviteRecord }
  | { ok: false; error: string; status: number }
> {
  const orgSlugNorm = normalizeOrgId(input.orgSlug.trim())
  if (!orgSlugNorm) {
    return { ok: false, error: "invalid org", status: 400 }
  }
  const invitee = normalizeCreator(input.invitee)
  if (!invitee) {
    return { ok: false, error: "invalid invitee address", status: 400 }
  }
  const inviterNorm = normalizeCreator(input.inviter)
  if (inviterNorm && inviterNorm.toLowerCase() === invitee.toLowerCase()) {
    return { ok: false, error: "cannot invite yourself", status: 400 }
  }

  const gate = await assertInviterIsOrgAdmin(orgSlugNorm, input.inviter)
  if (!gate.ok) return gate

  let title = input.orgTitle?.trim() ?? ""
  if (!title) {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (uuidRe.test(orgSlugNorm)) {
      const org = await getCommunityOrgById(orgSlugNorm)
      title = org?.title ?? "Organization"
    } else {
      title = "Organization"
    }
  }

  const rows = await readAll()
  const invite: MemberInviteRecord = {
    id: randomUUID(),
    orgSlug: orgSlugNorm,
    orgTitle: title,
    invitee,
    inviter: normalizeCreator(input.inviter) ?? input.inviter,
    createdAt: Date.now(),
    read: false,
  }
  rows.push(invite)
  await writeAll(rows)
  return { ok: true, invite }
}

export async function markMemberInviteRead(
  id: string,
  wallet: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const u = normalizeCreator(wallet)
  if (!u) return { ok: false, error: "invalid user", status: 400 }
  const rows = await readAll()
  const idx = rows.findIndex((r) => r.id === id)
  if (idx === -1) return { ok: false, error: "not found", status: 404 }
  const row = rows[idx]
  if (row.invitee.toLowerCase() !== u.toLowerCase()) {
    return { ok: false, error: "forbidden", status: 403 }
  }
  rows[idx] = { ...row, read: true }
  await writeAll(rows)
  return { ok: true }
}
