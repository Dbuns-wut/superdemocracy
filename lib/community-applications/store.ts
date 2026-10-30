import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import type { CommunityOrg, CommunityViewerStatus } from "@/lib/community-orgs/types"
import {
  getCommunityOrgById,
  getCommunityOrgMembersList,
  recordCommunityOrgMember,
} from "@/lib/community-orgs/store"
import { isSameParticipant, normalizeParticipantId } from "@/lib/participant-id"
import { getOrgSettings } from "@/lib/org-settings/store"
import { getJoinFile } from "@/lib/join-files/store"

const DATA_DIR = path.join(process.cwd(), "data")
const APPLICATIONS_FILE = path.join(DATA_DIR, "community-applications.json")

export type JoinFieldAnswer = {
  fieldId: string
  label: string
  type: "text" | "file"
  value: string
}

export type CommunityApplicationRecord = {
  id: string
  orgId: string
  user: string
  message: string
  answers?: JoinFieldAnswer[]
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
    const u = normalizeParticipantId(filters.user)
    if (u) rows = rows.filter((r) => isSameParticipant(r.user, u))
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
  answers?: JoinFieldAnswer[]
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
  const user = normalizeParticipantId(input.user)
  if (!user) return { ok: false, error: "Sign in first.", status: 401 }
  const message = String(input.message ?? "").trim()

  const settings = await getOrgSettings(orgId)
  const requirements = settings?.joinRequirements ?? []
  const incoming = Array.isArray(input.answers) ? input.answers : []
  const answers: JoinFieldAnswer[] = []
  for (const field of requirements) {
    const match = incoming.find((a) => a.fieldId === field.id)
    const value = String(match?.value ?? "").trim()
    if (field.required && !value) {
      return { ok: false, error: `${field.label} is required`, status: 400 }
    }
    if (!value) continue
    if (field.type === "file") {
      const file = await getJoinFile(value)
      if (!file) {
        return { ok: false, error: `${field.label} upload was not found`, status: 400 }
      }
    }
    answers.push({
      fieldId: field.id,
      label: field.label,
      type: field.type,
      value,
    })
  }

  const rows = await readApplications()
  const pendingDup = rows.some(
    (r) =>
      r.orgId.toLowerCase() === orgId &&
      isSameParticipant(r.user, user) &&
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
    answers,
    status: "pending",
    createdAt: Date.now(),
  }
  rows.push(app)
  await writeApplications(rows)
  return { ok: true, application: app }
}

export async function approveCommunityApplication(
  applicationId: string,
  adminId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const admin = normalizeParticipantId(adminId)
  if (!admin) return { ok: false, error: "Sign in first.", status: 401 }
  const rows = await readApplications()
  const idx = rows.findIndex((r) => r.id === applicationId)
  if (idx === -1) return { ok: false, error: "application not found", status: 404 }
  const app = rows[idx]
  if (app.status !== "pending") {
    return { ok: false, error: "application is not pending", status: 400 }
  }
  const org = await getCommunityOrgById(app.orgId)
  if (!org) return { ok: false, error: "org not found", status: 404 }
  if (!isSameParticipant(org.creatorId, admin)) {
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
  adminId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const admin = normalizeParticipantId(adminId)
  if (!admin) return { ok: false, error: "Sign in first.", status: 401 }
  const rows = await readApplications()
  const idx = rows.findIndex((r) => r.id === applicationId)
  if (idx === -1) return { ok: false, error: "application not found", status: 404 }
  const app = rows[idx]
  if (app.status !== "pending") {
    return { ok: false, error: "application is not pending", status: 400 }
  }
  const org = await getCommunityOrgById(app.orgId)
  if (!org) return { ok: false, error: "org not found", status: 404 }
  if (!isSameParticipant(org.creatorId, admin)) {
    return { ok: false, error: "only the org creator can reject", status: 403 }
  }
  rows[idx] = { ...app, status: "rejected" }
  await writeApplications(rows)
  return { ok: true }
}

/** For home cards: membership + application state for a signed-in person. */
export async function viewerStatusForCommunityOrg(
  org: CommunityOrg,
  viewerRaw: string | null | undefined
): Promise<CommunityViewerStatus> {
  const viewer = normalizeParticipantId(viewerRaw)
  if (!viewer) return "none"
  if (isSameParticipant(org.creatorId, viewer)) return "creator"

  const pending = await listCommunityApplications({
    orgId: org.id,
    user: viewer,
    status: "pending",
  })
  if (pending.length > 0) return "pending"

  const members = await getCommunityOrgMembersList(org.id.toLowerCase())
  if (members?.some((m) => isSameParticipant(m, viewer))) return "member"

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
