import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import {
  createCommunityApplication,
  listCommunityApplications,
} from "@/lib/community-applications/store"
import { isCommunityOrgAdmin } from "@/lib/community-orgs/store"
import { normalizeOrgId } from "@/lib/org-id"

/**
 * Applications are private. An org admin sees applications to their org;
 * anyone else sees only their own.
 */
export async function GET(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get("orgId") ?? undefined
  const status = searchParams.get("status") as "pending" | "approved" | "rejected" | undefined
  const normalizedOrg = orgId ? normalizeOrgId(orgId) : null
  if (orgId && !normalizedOrg) {
    return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  }
  const admin = normalizedOrg ? await isCommunityOrgAdmin(normalizedOrg, auth.account.id) : false
  const applications = await listCommunityApplications({
    orgId: normalizedOrg ?? undefined,
    user: admin ? undefined : auth.account.id,
    status: status && ["pending", "approved", "rejected"].includes(status) ? status : undefined,
  })
  return NextResponse.json({ applications })
}

export async function POST(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const orgId = normalizeOrgId(String(body.orgId ?? ""))
  if (!orgId) {
    return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  }
  const answers = Array.isArray(body.answers) ? body.answers : []

  const result = await createCommunityApplication({
    orgId,
    user: auth.account.id,
    message: String(body.message ?? ""),
    answers: answers.map((row) => {
      const r = row as { fieldId?: string; label?: string; type?: string; value?: string }
      return {
        fieldId: String(r.fieldId ?? ""),
        label: String(r.label ?? ""),
        type: r.type === "file" ? "file" : "text",
        value: String(r.value ?? ""),
      }
    }),
  })
  if (!result.ok) {
    if (result.error === "already_applied") {
      return NextResponse.json({ status: "already_applied" }, { status: 409 })
    }
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ status: "pending", application: result.application }, { status: 201 })
}
