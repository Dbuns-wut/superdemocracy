import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { setCommunityOrgAuditor } from "@/lib/community-orgs/store"
import { normalizeOrgId } from "@/lib/org-id"

type Params = { params: Promise<{ id: string }> }

/** Org admin appoints the counter (must differ from admin). */
export async function POST(request: Request, context: Params) {
  const { id } = await context.params
  const orgId = normalizeOrgId(id)
  if (!orgId) return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }

  const result = await setCommunityOrgAuditor({
    orgId,
    auditorId: String(body.auditorId ?? ""),
    adminId: auth.account.id,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ org: result.org })
}
