import { NextResponse } from "next/server"
import { votePoll } from "@/lib/polls/store"
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
  const { pollId, voterId, choices, nonce, issuedAt, expiresAt, signature } = body as Record<string, unknown>
  const origin = new URL(request.url).origin
  const auth = await verifySignedAction({
    action: "polls.vote",
    resourceId: String(pollId ?? ""),
    voterId: String(voterId ?? ""),
    choices,
    nonce: String(nonce ?? ""),
    issuedAt: Number(issuedAt),
    expiresAt: Number(expiresAt),
    signature: String(signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await votePoll({
    pollId: String(pollId ?? ""),
    voterId: auth.signer,
    choices,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ vote: result.vote }, { status: 201 })
}

