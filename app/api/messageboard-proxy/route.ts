import { NextResponse } from "next/server"
import { getActiveMutedUntil } from "@/lib/messageboard-mutes/store"

const BACKEND =
  process.env.MESSAGE_BOARD_BACKEND_URL ?? "http://127.0.0.1:3001"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const org = searchParams.get("org")
  if (!org) {
    return NextResponse.json({ error: "Missing org" }, { status: 400 })
  }
  const r = await fetch(
    `${BACKEND}/messageboard?org=${encodeURIComponent(org)}`
  )
  const data = await r.json()
  return NextResponse.json(data, { status: r.status })
}

export async function POST(req: Request) {
  let body: { user?: string; org?: string; text?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const user = String(body.user ?? "")
  const org = String(body.org ?? "")
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
  const r = await fetch(`${BACKEND}/messageboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  return NextResponse.json(data, { status: r.status })
}
