import { NextResponse } from "next/server"
import { getActiveMutedUntil } from "@/lib/messageboard-mutes/store"

const BACKEND =
  process.env.MESSAGE_BOARD_BACKEND_URL ?? "http://127.0.0.1:3001"

export async function POST(req: Request) {
  let body: { postId?: string; user?: string; reaction?: string; org?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const user = String(body.user ?? "")
  const org = String(body.org ?? "")
  if (!org) {
    return NextResponse.json({ error: "org required for messageboard actions" }, { status: 400 })
  }
  const until = await getActiveMutedUntil(org, user)
  if (until) {
    return NextResponse.json(
      {
        error: "You are muted on the messageboard for this organization.",
        mutedUntil: until,
      },
      { status: 403 }
    )
  }
  const { postId, reaction } = body
  const r = await fetch(`${BACKEND}/messageboard/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, user, reaction }),
  })
  const data = await r.json().catch(() => ({}))
  return NextResponse.json(data, { status: r.status })
}
