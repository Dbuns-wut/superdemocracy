import { NextResponse } from "next/server"
import { getCommunityVotePublic } from "@/lib/votes/store"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const voteId = decodeURIComponent(id ?? "").trim()
  if (!voteId) return NextResponse.json({ error: "vote id required" }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const viewer = searchParams.get("viewer")?.trim() || null

  const result = await getCommunityVotePublic(voteId, viewer)
  if (!result) return NextResponse.json({ error: "vote not found" }, { status: 404 })

  return NextResponse.json({
    vote: result.vote,
    tally: result.tally,
    totalBallots: result.totalBallots,
  })
}
