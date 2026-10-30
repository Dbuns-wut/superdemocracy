import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { acknowledgeEducation } from "@/lib/education/store"

/** The signed-in person confirms they read the education for this vote. */
export async function POST(request: Request, context: { params: Promise<{ voteId: string }> }) {
  const { voteId } = await context.params
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  const ok = await acknowledgeEducation(voteId, auth.account.id)
  if (!ok) return NextResponse.json({ error: "invalid vote id" }, { status: 400 })
  return NextResponse.json({ ok: true, acknowledged: true })
}
