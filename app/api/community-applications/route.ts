import { NextResponse } from "next/server"
import {
  createCommunityApplication,
  listCommunityApplications,
} from "@/lib/community-applications/store"
import { normalizeOrgId } from "@/lib/org-id"
import { signedRequestOrigin, verifySignedAction } from "@/lib/request-signatures"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId") ?? undefined
  const user = searchParams.get("user") ?? undefined
  const status = searchParams.get("status") as "pending" | "approved" | "rejected" | undefined
  const normalizedOrg = orgId ? normalizeOrgId(orgId) : null
  if (orgId && !normalizedOrg) {
    return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  }
  const applications = await listCommunityApplications({
    orgId: normalizedOrg ?? undefined,
    user: user ?? undefined,
    status: status && ["pending", "approved", "rejected"].includes(status) ? status : undefined,
  })
  return NextResponse.json({ applications })
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const orgIdRaw = String(body.orgId ?? "")
  const orgId = normalizeOrgId(orgIdRaw)
  if (!orgId) {
    return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  }
  const user = String(body.user ?? body.voterId ?? "")
  const message = String(body.message ?? "")
  const answers = Array.isArray(body.answers) ? body.answers : []
  const origin = signedRequestOrigin(req)
  const auth = await verifySignedAction({
    action: "community.applications.create",
    resourceId: orgId,
    voterId: user,
    choices: [],
    payload: { message, answers },
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await createCommunityApplication({
    orgId,
    user: auth.signer,
    message,
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
