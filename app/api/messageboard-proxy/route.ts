import { NextResponse } from "next/server"
import { getActiveMutedUntil } from "@/lib/messageboard-mutes/store"
import {
  createMessageboardPost,
  listMessageboardPosts,
} from "@/lib/messageboard/store"

const BACKEND = process.env.MESSAGE_BOARD_BACKEND_URL ?? "http://127.0.0.1:3001"

async function tryBackend(
  path: string,
  init?: RequestInit
): Promise<Response | null> {
  try {
    return await fetch(`${BACKEND}${path}`, {
      ...init,
      signal: AbortSignal.timeout(1500),
    })
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const org = searchParams.get("org")
  if (!org) {
    return NextResponse.json({ error: "Missing org" }, { status: 400 })
  }
  const remote = await tryBackend(`/messageboard?org=${encodeURIComponent(org)}`)
  if (remote) {
    const data = await remote.json().catch(() => null)
    if (remote.ok && Array.isArray(data)) {
      return NextResponse.json(data)
    }
  }
  const posts = await listMessageboardPosts(org)
  return NextResponse.json(posts)
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
  const text = String(body.text ?? "")
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
  const remote = await tryBackend("/messageboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (remote) {
    const data = await remote.json().catch(() => ({}))
    if (remote.ok) return NextResponse.json(data, { status: remote.status })
    if (remote.status !== 404 && remote.status < 500) {
      return NextResponse.json(data, { status: remote.status })
    }
  }
  const result = await createMessageboardPost({ user, org, text })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ status: "posted", post: result.post }, { status: 201 })
}
