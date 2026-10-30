import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { createPoll } from "@/lib/polls/store"
import { isVoteOrgMember } from "@/lib/votes/access"

/** Members of the organization can open a poll. */
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
  const { orgId, title, description, options, type, startTime, endTime } = body as Record<string, unknown>
  const org = String(orgId ?? "")
  if (!(await isVoteOrgMember(org, auth.account.id))) {
    return NextResponse.json({ error: "only members of this organization can open a poll" }, { status: 403 })
  }

  const result = await createPoll({
    orgId: org,
    title: String(title ?? ""),
    description: String(description ?? ""),
    options,
    type,
    startTime: Number(startTime),
    endTime: Number(endTime),
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ poll: result.poll, createdBy: auth.account.id }, { status: 201 })
}
