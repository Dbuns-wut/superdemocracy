import { NextResponse } from "next/server"
import { listMessagesForUser, sendDirectMessage } from "@/lib/messages/store"
import { verifySignedAction } from "@/lib/request-signatures"

export async function GET(req: Request) {
  const user = new URL(req.url).searchParams.get("user")?.trim() ?? ""
  if (!user) return NextResponse.json({ error: "user required" }, { status: 400 })
  const messages = await listMessagesForUser(user)
  return NextResponse.json({ messages })
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const from = String(body.from ?? body.voterId ?? "")
  const to = String(body.to ?? "")
  const text = String(body.body ?? body.message ?? "")
  const orgId = body.orgId == null ? null : String(body.orgId)
  const origin = new URL(req.url).origin
  const auth = await verifySignedAction({
    action: "messages.send",
    resourceId: to,
    voterId: from,
    choices: [],
    payload: { to, body: text, orgId },
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await sendDirectMessage({
    from: auth.signer,
    to,
    body: text,
    orgId,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ message: result.message }, { status: 201 })
}
