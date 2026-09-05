import { NextResponse } from "next/server"
import { castCommunityBallot } from "@/lib/votes/store"
import { verifySignedAction } from "@/lib/request-signatures"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "expected JSON object" }, { status: 400 })
  }
  const { voteId, voterId, choices, nonce, issuedAt, expiresAt, signature } = body as Record<
    string,
    unknown
  >
  const origin = new URL(request.url).origin
  const auth = await verifySignedAction({
    action: "votes.cast",
    resourceId: String(voteId ?? ""),
    voterId: String(voterId ?? ""),
    choices,
    nonce: String(nonce ?? ""),
    issuedAt: Number(issuedAt),
    expiresAt: Number(expiresAt),
    signature: String(signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await castCommunityBallot({
    voteId: String(voteId ?? ""),
    voterId: auth.signer,
    choices,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ receipt: result.receipt }, { status: 201 })
}
