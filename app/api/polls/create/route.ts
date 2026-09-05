import { NextResponse } from "next/server"
import { createPoll } from "@/lib/polls/store"
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
    type,
    startTime,
    endTime,
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
    type: String(type ?? ""),
    startTime: Number(startTime),
    endTime: Number(endTime),
  }
  const origin = new URL(request.url).origin
  const auth = await verifySignedAction({
    action: "polls.create",
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

  const result = await createPoll({
    orgId: String(orgId ?? ""),
    title: String(title ?? ""),
    description: String(description ?? ""),
    options,
    type,
    startTime: Number(startTime),
    endTime: Number(endTime),
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ poll: result.poll, createdBy: auth.signer }, { status: 201 })
}
