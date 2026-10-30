import { NextResponse } from "next/server"
import { requireAccount, sessionAccount } from "@/lib/auth/session"
import {
  getCommunityOrgById,
  getCommunityOrgMembersList,
  recordCommunityOrgMember,
} from "@/lib/community-orgs/store"
import { isSameParticipant } from "@/lib/participant-id"
import { normalizeOrgId } from "@/lib/org-id"

type Params = { params: Promise<{ id: string }> }

/** Member list. Members see the list; others only get the count. */
export async function GET(request: Request, context: Params) {
  const { id } = await context.params
  const normalized = normalizeOrgId(id)
  if (!normalized) return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  const members = await getCommunityOrgMembersList(normalized)
  if (members === null) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const viewer = await sessionAccount(request)
  const org = await getCommunityOrgById(normalized)
  const isMember = Boolean(
    viewer && (members.some((m) => isSameParticipant(m, viewer.id)) || isSameParticipant(org?.creatorId, viewer.id))
  )
  if (!isMember) return NextResponse.json({ members: [], memberCount: members.length })
  return NextResponse.json({ members, memberCount: members.length })
}

/** Join an open organization as the signed-in person. */
export async function POST(request: Request, context: Params) {
  const { id } = await context.params
  const normalized = normalizeOrgId(id)
  if (!normalized) return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response

  const result = await recordCommunityOrgMember(normalized, auth.account.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const members = await getCommunityOrgMembersList(normalized)
  return NextResponse.json({ ok: true, members: members ?? [], memberCount: members?.length ?? 0 })
}
