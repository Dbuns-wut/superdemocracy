import { NextResponse } from "next/server"
import { requireAccount, sessionAccount } from "@/lib/auth/session"
import { getEducation, hasAcknowledgedEducation, setEducation } from "@/lib/education/store"
import { isVoteOrgAdmin } from "@/lib/votes/access"
import { getCommunityVotePublic } from "@/lib/votes/store"

type Params = { params: Promise<{ voteId: string }> }

export async function GET(request: Request, context: Params) {
  const { voteId } = await context.params
  const education = await getEducation(voteId)
  if (!education) {
    return NextResponse.json({ error: "invalid vote id" }, { status: 400 })
  }
  const viewer = await sessionAccount(request)
  const acknowledged = viewer ? await hasAcknowledgedEducation(voteId, viewer.id) : false
  return NextResponse.json({ education, acknowledged })
}

/** Only the admin of the organization that owns the vote can edit its education. */
export async function PUT(request: Request, context: Params) {
  const { voteId } = await context.params
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }

  const vote = await getCommunityVotePublic(voteId, null)
  if (!vote) return NextResponse.json({ error: "vote not found" }, { status: 404 })
  if (!(await isVoteOrgAdmin(vote.vote.orgId, auth.account.id))) {
    return NextResponse.json({ error: "only the organization admin can edit education" }, { status: 403 })
  }

  const perspectives = Array.isArray(body.perspectives) ? body.perspectives : []
  const result = await setEducation({
    voteId,
    perspectives: perspectives.map((p) => {
      const row = p as { title?: string; body?: string }
      return { title: String(row.title ?? ""), body: String(row.body ?? "") }
    }),
    quickDebrief: body.quickDebrief,
    evidence: body.evidence,
    sources: body.sources,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ education: result.education })
}
