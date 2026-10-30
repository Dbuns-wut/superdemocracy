import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { listAuditorBallots } from "@/lib/votes/store"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Appointed counter only, and only while the verification window is open.
 * The org admin is rejected even if the window is open.
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const voteId = decodeURIComponent(id ?? "").trim()
  if (!voteId) return NextResponse.json({ error: "vote id required" }, { status: 400 })
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response

  const result = await listAuditorBallots({ voteId, auditor: auth.account.id })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({
    ballots: result.ballots,
    totalBallots: result.ballots.length,
  })
}
