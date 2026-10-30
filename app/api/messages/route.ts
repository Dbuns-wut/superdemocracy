import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { listMessagesForUser, sendDirectMessage } from "@/lib/messages/store"

/** The signed-in person's own conversations. */
export async function GET(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  const messages = await listMessagesForUser(auth.account.id)
  return NextResponse.json({ messages })
}

export async function POST(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const result = await sendDirectMessage({
    from: auth.account.id,
    to: String(body.to ?? ""),
    body: String(body.body ?? body.message ?? ""),
    orgId: body.orgId == null ? null : String(body.orgId),
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ message: result.message }, { status: 201 })
}
