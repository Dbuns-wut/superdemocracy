import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { getActiveMutedUntil } from "@/lib/messageboard-mutes/store"
import { reactToMessageboardPost } from "@/lib/messageboard/store"

const BACKEND = process.env.MESSAGE_BOARD_BACKEND_URL ?? "http://127.0.0.1:3001"

async function tryBackend(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(`${BACKEND}${path}`, {
      ...init,
      signal: AbortSignal.timeout(1500),
    })
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const auth = await requireAccount(req)
  if (!auth.ok) return auth.response
  let body: { postId?: string; user?: string; reaction?: string; org?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const user = auth.account.id
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
  const remote = await tryBackend("/messageboard/react", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, user, reaction }),
  })
  if (remote) {
    const data = await remote.json().catch(() => ({}))
    if (remote.ok) return NextResponse.json(data, { status: remote.status })
    if (remote.status !== 404 && remote.status < 500) {
      return NextResponse.json(data, { status: remote.status })
    }
  }
  const result = await reactToMessageboardPost({
    postId: String(postId ?? ""),
    user,
    reaction,
    org,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ status: "reacted", post: result.post })
}
