import { NextResponse } from "next/server"
import { setCommunityOrgAuditor } from "@/lib/community-orgs/store"
import { isOffchainOrgId, normalizeOrgId } from "@/lib/org-id"
import { verifySignedAction } from "@/lib/request-signatures"

type Params = { params: Promise<{ id: string }> }

/** Org admin designates an external auditor (must differ from admin). */
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

  const auditorAddress = String(body.auditorAddress ?? "")
  const voterId = String(body.voterId ?? body.adminAddress ?? "")
  const origin = new URL(req.url).origin
  const auth = await verifySignedAction({
    action: "community.orgs.setAuditor",
    resourceId: orgId,
    voterId,
    choices: [],
    payload: { auditorAddress },
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await setCommunityOrgAuditor({
    orgId,
    auditorAddress,
    adminAddress: auth.signer,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ org: result.org })
}
