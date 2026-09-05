import { NextResponse } from "next/server"
import { createCommunityVote } from "@/lib/votes/store"
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
  const {
    orgId,
    title,
    description,
    options,
    startTime,
    endTime,
    eligibleVoters,
    allowVoteChange,
    voterId,
    nonce,
    issuedAt,
    expiresAt,
    signature,
  } = body as Record<string, unknown>

  const payload = {
    title: String(title ?? ""),
    description: String(description ?? ""),
    options,
    startTime: Number(startTime),
    endTime: Number(endTime),
    allowVoteChange: Boolean(allowVoteChange),
  }
  const origin = new URL(request.url).origin
  const auth = await verifySignedAction({
    action: "votes.create",
    resourceId: String(orgId ?? ""),
    voterId: String(voterId ?? ""),
    choices: [],
    payload,
    nonce: String(nonce ?? ""),
    issuedAt: Number(issuedAt),
    expiresAt: Number(expiresAt),
    signature: String(signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await createCommunityVote({
    orgId: String(orgId ?? ""),
    title: String(title ?? ""),
    description: String(description ?? ""),
    options,
    startTime: Number(startTime),
    endTime: Number(endTime),
    eligibleVoters,
    allowVoteChange: Boolean(allowVoteChange),
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ vote: result.vote, createdBy: auth.signer }, { status: 201 })
}
