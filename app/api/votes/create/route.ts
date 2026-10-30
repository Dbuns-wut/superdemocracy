import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { isVoteOrgAdmin } from "@/lib/votes/access"
import { createCommunityVote } from "@/lib/votes/store"

/** Only the organization admin can create a vote. */
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
  const { orgId, title, description, options, startTime, endTime, eligibleVoters, allowVoteChange } =
    body as Record<string, unknown>

  const org = String(orgId ?? "")
  if (!(await isVoteOrgAdmin(org, auth.account.id))) {
    return NextResponse.json({ error: "only the organization admin can create a vote" }, { status: 403 })
  }

  const result = await createCommunityVote({
    orgId: org,
    title: String(title ?? ""),
    description: String(description ?? ""),
    options,
    startTime: Number(startTime),
    endTime: Number(endTime),
    eligibleVoters,
    allowVoteChange: Boolean(allowVoteChange),
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ vote: result.vote, createdBy: auth.account.id }, { status: 201 })
}
