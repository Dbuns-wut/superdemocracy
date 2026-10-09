import { NextResponse } from "next/server"
import { setCommunityOrgAuditorVisibility } from "@/lib/community-orgs/store"
import { isOffchainOrgId, normalizeOrgId } from "@/lib/org-id"
import { verifySignedAction } from "@/lib/request-signatures"

type Params = { params: Promise<{ id: string }> }

/** Org admin sets whether future votes keep a person-to-choice record for the counter. */
export async function POST(req: Request, context: Params) {
  const { id } = await context.params
  const orgId = normalizeOrgId(id)
  if (!orgId || !isOffchainOrgId(orgId)) {
    return NextResponse.json({ error: "invalid community org id" }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }

  const auditorVisibleBallots = body.auditorVisibleBallots
  if (typeof auditorVisibleBallots !== "boolean") {
    return NextResponse.json({ error: "auditorVisibleBallots required" }, { status: 400 })
  }

  const origin = new URL(req.url).origin
  const auth = await verifySignedAction({
    action: "community.orgs.setAuditorVisibility",
    resourceId: orgId,
    voterId: String(body.voterId ?? body.adminAddress ?? ""),
    choices: [],
    payload: { auditorVisibleBallots },
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await setCommunityOrgAuditorVisibility({
    orgId,
    adminAddress: auth.signer,
    auditorVisibleBallots,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ org: result.org })
}
