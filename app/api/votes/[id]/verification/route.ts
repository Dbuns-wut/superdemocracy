import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { handleVerificationAction } from "@/lib/votes/store"

type RouteContext = { params: Promise<{ id: string }> }

/** Org admin only: open or close the verification window (no ballot access). */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const voteId = decodeURIComponent(id ?? "").trim()
  if (!voteId) return NextResponse.json({ error: "vote id required" }, { status: 400 })
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "expected JSON object" }, { status: 400 })
  }

  const { action } = body as Record<string, unknown>
  const normalizedAction = String(action ?? "").trim().toLowerCase()
  if (normalizedAction !== "open" && normalizedAction !== "close") {
    return NextResponse.json({ error: "action must be open or close" }, { status: 400 })
  }

  const result = await handleVerificationAction({
    voteId,
    signer: auth.account.id,
    action: normalizedAction as "open" | "close",
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ vote: result.vote })
}
