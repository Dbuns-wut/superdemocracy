import { NextResponse } from "next/server"
import { getPollById } from "@/lib/polls/store"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params
  const pollId = decodeURIComponent(id ?? "").trim()
  if (!pollId) return NextResponse.json({ error: "poll id required" }, { status: 400 })
  const { poll, votes, tally } = await getPollById(pollId)
  if (!poll) return NextResponse.json({ error: "poll not found" }, { status: 404 })
  return NextResponse.json({ poll, votes, tally, totalVotes: votes.length })
}

