import { NextResponse } from "next/server"
import { sessionAccount } from "@/lib/auth/session"
import { isSameParticipant } from "@/lib/participant-id"
import { getPollById } from "@/lib/polls/store"

type RouteContext = { params: Promise<{ id: string }> }

/** Poll with tally. Individual answers are not exposed; only the viewer's own choices. */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const pollId = decodeURIComponent(id ?? "").trim()
  if (!pollId) return NextResponse.json({ error: "poll id required" }, { status: 400 })
  const { poll, votes, tally } = await getPollById(pollId)
  if (!poll) return NextResponse.json({ error: "poll not found" }, { status: 404 })
  const viewer = await sessionAccount(request)
  const mine = viewer ? votes.find((v) => isSameParticipant(v.voterId, viewer.id)) : null
  return NextResponse.json({
    poll,
    tally,
    totalVotes: votes.length,
    currentUserChoices: mine ? [...mine.choices] : null,
  })
}
