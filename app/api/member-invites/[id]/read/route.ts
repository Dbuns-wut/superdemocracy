import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { markMemberInviteRead } from "@/lib/member-invites/store"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Params) {
  const { id } = await context.params
  if (!id?.trim()) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  const result = await markMemberInviteRead(id.trim(), auth.account.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
}
