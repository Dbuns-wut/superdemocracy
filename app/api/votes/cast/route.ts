import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { getCommunityOrgById } from "@/lib/community-orgs/store"
import { hasAcknowledgedEducation } from "@/lib/education/store"
import { getOrgSettings } from "@/lib/org-settings/store"
import { castCommunityBallot, getCommunityVotePublic } from "@/lib/votes/store"

export async function POST(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "expected JSON object" }, { status: 400 })
  }
  const { voteId, choices } = body as Record<string, unknown>
  const id = String(voteId ?? "").trim()
  if (!id) return NextResponse.json({ error: "voteId required" }, { status: 400 })

  // Education Before Vote is enforced here, not only in the UI.
  const existing = await getCommunityVotePublic(id, null)
  if (!existing) return NextResponse.json({ error: "vote not found" }, { status: 404 })
  const org = await getCommunityOrgById(existing.vote.orgId)
  const settings = await getOrgSettings(existing.vote.orgId)
  const educationRequired = org?.kind === "governance" || settings?.educationBeforeVote !== false
  if (educationRequired && !(await hasAcknowledgedEducation(id, auth.account.id))) {
    return NextResponse.json(
      { error: "Read the education for this vote and confirm before casting your ballot." },
      { status: 428 }
    )
  }

  const result = await castCommunityBallot({
    voteId: id,
    voterId: auth.account.id,
    choices,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ receipt: result.receipt }, { status: 201 })
}
