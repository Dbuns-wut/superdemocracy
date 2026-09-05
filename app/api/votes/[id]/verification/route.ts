import { NextResponse } from "next/server"
import { handleVerificationAction } from "@/lib/votes/store"
import { verifySignedAction } from "@/lib/request-signatures"

type RouteContext = { params: Promise<{ id: string }> }

/** Org admin only: open or close the verification window (no ballot access). */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const voteId = decodeURIComponent(id ?? "").trim()
  if (!voteId) return NextResponse.json({ error: "vote id required" }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "expected JSON object" }, { status: 400 })
  }

  const { action, voterId, nonce, issuedAt, expiresAt, signature } = body as Record<string, unknown>
  const normalizedAction = String(action ?? "").trim().toLowerCase()
  if (normalizedAction !== "open" && normalizedAction !== "close") {
    return NextResponse.json({ error: "action must be open or close" }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  const auth = await verifySignedAction({
    action: "votes.verification",
    resourceId: voteId,
    voterId: String(voterId ?? ""),
    choices: [],
    payload: { step: normalizedAction },
    nonce: String(nonce ?? ""),
    issuedAt: Number(issuedAt),
    expiresAt: Number(expiresAt),
    signature: String(signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await handleVerificationAction({
    voteId,
    signer: auth.signer,
    action: normalizedAction as "open" | "close",
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ vote: result.vote })
}
