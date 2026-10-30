import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { getPollById, votePoll } from "@/lib/polls/store"
import { isVoteOrgMember } from "@/lib/votes/access"

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
  const { pollId, choices } = body as Record<string, unknown>
  const id = String(pollId ?? "").trim()
  const { poll } = await getPollById(id)
  if (!poll) return NextResponse.json({ error: "poll not found" }, { status: 404 })
  if (!(await isVoteOrgMember(poll.orgId, auth.account.id))) {
    return NextResponse.json({ error: "only members of this organization can answer" }, { status: 403 })
  }

  const result = await votePoll({ pollId: id, voterId: auth.account.id, choices })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ vote: result.vote }, { status: 201 })
}
