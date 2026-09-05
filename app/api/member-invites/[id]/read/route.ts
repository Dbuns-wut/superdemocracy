import { NextResponse } from "next/server"
import { markMemberInviteRead } from "@/lib/member-invites/store"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: Params) {
  const { id } = await context.params
  if (!id?.trim()) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  let body: { user?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const result = await markMemberInviteRead(id.trim(), String(body.user ?? ""))
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
}
