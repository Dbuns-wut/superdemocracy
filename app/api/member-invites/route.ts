import { NextResponse } from "next/server"
import {
  createMemberInvite,
  listMemberInvitesForUser,
} from "@/lib/member-invites/store"
import { normalizeCreator } from "@/lib/community-orgs/store"
import { verifySignedAction } from "@/lib/request-signatures"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const user = searchParams.get("user") ?? ""
  const normalized = normalizeCreator(user)
  if (!normalized) {
    return NextResponse.json({ error: "valid user address required" }, { status: 400 })
  }
  const invites = await listMemberInvitesForUser(normalized)
  return NextResponse.json({ invites })
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const inviter = String(body.inviter ?? body.voterId ?? "")
  const orgSlug = String(body.orgSlug ?? "")
  const orgTitle = String(body.orgTitle ?? "")
  const invitee = String(body.invitee ?? "")
  const origin = new URL(req.url).origin
  const auth = await verifySignedAction({
    action: "member-invites.create",
    resourceId: orgSlug,
    voterId: inviter,
    choices: [],
    payload: { orgTitle, invitee },
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await createMemberInvite({
    orgSlug,
    orgTitle,
    invitee,
    inviter: auth.signer,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ invite: result.invite }, { status: 201 })
}
