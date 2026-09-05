import { NextResponse } from "next/server"
import { listAuditorBallots } from "@/lib/votes/store"
import { verifySignedAction } from "@/lib/request-signatures"

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Designated auditor only. Org admin is rejected even if the window is open.
 * Requires signed votes.audit + auditor=1.
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params
  const voteId = decodeURIComponent(id ?? "").trim()
  if (!voteId) return NextResponse.json({ error: "vote id required" }, { status: 400 })

  const { searchParams } = new URL(request.url)
  if (searchParams.get("auditor") !== "1") {
    return NextResponse.json({ error: "auditor access required" }, { status: 403 })
  }

  const voterId = searchParams.get("voterId")?.trim() ?? ""
  const nonce = searchParams.get("nonce")?.trim() ?? ""
  const issuedAt = Number(searchParams.get("issuedAt"))
  const expiresAt = Number(searchParams.get("expiresAt"))
  const signature = searchParams.get("signature")?.trim() ?? ""

  const origin = new URL(request.url).origin
  const auth = await verifySignedAction({
    action: "votes.audit",
    resourceId: voteId,
    voterId,
    choices: [],
    nonce,
    issuedAt,
    expiresAt,
    signature,
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await listAuditorBallots({ voteId, auditor: auth.signer })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({
    ballots: result.ballots,
    totalBallots: result.ballots.length,
  })
}
