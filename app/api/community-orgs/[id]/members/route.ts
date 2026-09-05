import { NextResponse } from "next/server"
import {
  getCommunityOrgMembersList,
  recordCommunityOrgMember,
} from "@/lib/community-orgs/store"
import { isOffchainOrgId, normalizeOrgId } from "@/lib/org-id"
import { verifySignedAction } from "@/lib/request-signatures"

type Params = { params: Promise<{ id: string }> }

function rejectIfNotCommunityOrgId(id: string) {
  const normalized = normalizeOrgId(id)
  if (!normalized) {
    return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  }
  if (!isOffchainOrgId(normalized)) {
    return NextResponse.json({ error: "not a community org id" }, { status: 400 })
  }
  return normalized
}

export async function GET(_: Request, context: Params) {
  const { id } = await context.params
  const normalized = rejectIfNotCommunityOrgId(id)
  if (normalized instanceof NextResponse) return normalized
  const members = await getCommunityOrgMembersList(normalized)
  if (members === null) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  return NextResponse.json({ members })
}

export async function POST(req: Request, context: Params) {
  const { id } = await context.params
  const normalized = rejectIfNotCommunityOrgId(id)
  if (normalized instanceof NextResponse) return normalized
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
  const address = String(body.address ?? body.voterId ?? "")
  const origin = new URL(req.url).origin
  const auth = await verifySignedAction({
    action: "community.members.join",
    resourceId: normalized,
    voterId: address,
    choices: [],
    payload: { address },
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await recordCommunityOrgMember(normalized, auth.signer)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const members = await getCommunityOrgMembersList(normalized)
  return NextResponse.json({ ok: true, members: members ?? [] })
}
