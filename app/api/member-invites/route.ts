import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { createMemberInvite, listMemberInvitesForUser } from "@/lib/member-invites/store"

/** The signed-in person's own invites. */
export async function GET(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  const invites = await listMemberInvitesForUser(auth.account.id)
  return NextResponse.json({ invites })
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
  const result = await createMemberInvite({
    orgSlug: String(body.orgSlug ?? ""),
    invitee: String(body.invitee ?? ""),
    inviter: auth.account.id,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ invite: result.invite }, { status: 201 })
}
