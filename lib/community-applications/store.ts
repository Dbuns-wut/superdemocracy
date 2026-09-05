import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import type { CommunityOrg, CommunityViewerStatus } from "@/lib/community-orgs/types"
import {
  getCommunityOrgById,
  getCommunityOrgMembersList,
  recordCommunityOrgMember,
  normalizeCreator,
} from "@/lib/community-orgs/store"

const DATA_DIR = path.join(process.cwd(), "data")
const APPLICATIONS_FILE = path.join(DATA_DIR, "community-applications.json")

export type CommunityApplicationRecord = {
  id: string
  orgId: string
  user: string
  message: string
  status: "pending" | "approved" | "rejected"
  createdAt: number
}

async function readApplications(): Promise<CommunityApplicationRecord[]> {
  try {
    const raw = await fs.readFile(APPLICATIONS_FILE, "utf8")
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return []
    throw e
  }
}

async function writeApplications(rows: CommunityApplicationRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(APPLICATIONS_FILE, JSON.stringify(rows, null, 2), "utf8")
}

export async function listCommunityApplications(filters?: {
  orgId?: string
  user?: string
  status?: CommunityApplicationRecord["status"]
}): Promise<CommunityApplicationRecord[]> {
  let rows = await readApplications()
  if (filters?.orgId) {
    const t = filters.orgId.trim().toLowerCase()
    rows = rows.filter((r) => r.orgId.toLowerCase() === t)
  }
  if (filters?.user) {
    const u = normalizeCreator(filters.user)
    if (u) {
      const low = u.toLowerCase()
      rows = rows.filter((r) => r.user.toLowerCase() === low)
    }
  }
  if (filters?.status) {
    rows = rows.filter((r) => r.status === filters.status)
  }
  return rows
}

export async function createCommunityApplication(input: {
  orgId: string
  user: string
  message: string
}): Promise<
  | { ok: true; application: CommunityApplicationRecord }
  | { ok: false; error: string; status: number }
> {
  const orgId = input.orgId?.trim().toLowerCase()
  if (!orgId) return { ok: false, error: "org id required", status: 400 }
  const org = await getCommunityOrgById(orgId)
  if (!org) return { ok: false, error: "org not found", status: 404 }
  if (org.membershipMode !== "Manual") {
    return { ok: false, error: "this organization does not require applications", status: 400 }
  }
  const user = normalizeCreator(input.user)
  if (!user) return { ok: false, error: "valid user address required", status: 400 }
  const message = String(input.message ?? "").trim()

  const rows = await readApplications()
  const pendingDup = rows.some(
    (r) =>
      r.orgId.toLowerCase() === orgId &&
      r.user.toLowerCase() === user.toLowerCase() &&
      r.status === "pending"
  )
  if (pendingDup) {
    return { ok: false, error: "already_applied", status: 409 }
  }

  const app: CommunityApplicationRecord = {
    id: randomUUID(),
    orgId,
    user,
    message,
    status: "pending",
    createdAt: Date.now(),
  }
  rows.push(app)
  await writeApplications(rows)
  return { ok: true, application: app }
}

export async function approveCommunityApplication(
  applicationId: string,
  adminAddress: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const admin = normalizeCreator(adminAddress)
  if (!admin) return { ok: false, error: "valid admin address required", status: 400 }
  const rows = await readApplications()
  const idx = rows.findIndex((r) => r.id === applicationId)
  if (idx === -1) return { ok: false, error: "application not found", status: 404 }
  const app = rows[idx]
  if (app.status !== "pending") {
    return { ok: false, error: "application is not pending", status: 400 }
  }
  const org = await getCommunityOrgById(app.orgId)
  if (!org) return { ok: false, error: "org not found", status: 404 }
  if (org.creatorAddress.toLowerCase() !== admin.toLowerCase()) {
    return { ok: false, error: "only the org creator can approve", status: 403 }
  }

  const add = await recordCommunityOrgMember(app.orgId, app.user, {
    fromApproval: true,
  })
  if (!add.ok) return { ok: false, error: add.error, status: add.status }

  rows[idx] = { ...app, status: "approved" }
  await writeApplications(rows)
  return { ok: true }
}

export async function rejectCommunityApplication(
  applicationId: string,
  adminAddress: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const admin = normalizeCreator(adminAddress)
  if (!admin) return { ok: false, error: "valid admin address required", status: 400 }
  const rows = await readApplications()
  const idx = rows.findIndex((r) => r.id === applicationId)
  if (idx === -1) return { ok: false, error: "application not found", status: 404 }
  const app = rows[idx]
  if (app.status !== "pending") {
    return { ok: false, error: "application is not pending", status: 400 }
  }
  const org = await getCommunityOrgById(app.orgId)
  if (!org) return { ok: false, error: "org not found", status: 404 }
  if (org.creatorAddress.toLowerCase() !== admin.toLowerCase()) {
    return { ok: false, error: "only the org creator can reject", status: 403 }
  }
  rows[idx] = { ...app, status: "rejected" }
  await writeApplications(rows)
  return { ok: true }
}

/** For home cards: membership + application state for a wallet. */
export async function viewerStatusForCommunityOrg(
  org: CommunityOrg,
  viewerRaw: string | null | undefined
): Promise<CommunityViewerStatus> {
  if (!viewerRaw) return "none"
  const viewer = normalizeCreator(viewerRaw)
  if (!viewer) return "none"
  const vlow = viewer.toLowerCase()
  if (org.creatorAddress.toLowerCase() === vlow) return "creator"

  const pending = await listCommunityApplications({
    orgId: org.id,
    user: viewer,
    status: "pending",
  })
  if (pending.length > 0) return "pending"

  const members = await getCommunityOrgMembersList(org.id.toLowerCase())
  if (members?.some((m) => m.toLowerCase() === vlow)) return "member"

  return "none"
}

export async function enrichCommunityOrgsWithViewer(
  orgs: CommunityOrg[],
  viewerRaw: string | null | undefined
): Promise<(CommunityOrg & { viewerStatus: CommunityViewerStatus })[]> {
  const out: (CommunityOrg & { viewerStatus: CommunityViewerStatus })[] = []
  for (const org of orgs) {
    const viewerStatus = await viewerStatusForCommunityOrg(org, viewerRaw)
    out.push({ ...org, viewerStatus })
  }
  return out
}
