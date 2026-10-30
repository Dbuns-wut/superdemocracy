import { NextResponse } from "next/server"
import { requireAccount, sessionAccount } from "@/lib/auth/session"
import {
  listActiveMutesForOrg,
  setMessageboardMute,
  clearMessageboardMute,
  getActiveMutedUntil,
} from "@/lib/messageboard-mutes/store"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orgKey = searchParams.get("orgKey") ?? ""
  const mutes = await listActiveMutesForOrg(orgKey)
  const viewer = await sessionAccount(request)
  const viewerMutedUntil = viewer ? await getActiveMutedUntil(orgKey, viewer.id) : null
  return NextResponse.json({ mutes, viewerMutedUntil })
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
  const mutedUntilRaw = body.mutedUntil
  const mutedUntil =
    typeof mutedUntilRaw === "number" ? mutedUntilRaw : Number.parseInt(String(mutedUntilRaw ?? ""), 10)
  if (!Number.isFinite(mutedUntil)) {
    return NextResponse.json({ error: "mutedUntil required" }, { status: 400 })
  }

  const result = await setMessageboardMute({
    orgKey: String(body.orgKey ?? ""),
    targetUser: String(body.targetUser ?? ""),
    mutedUntil,
    adminId: auth.account.id,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ record: result.record }, { status: 201 })
}

export async function DELETE(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const result = await clearMessageboardMute({
    orgKey: String(body.orgKey ?? ""),
    targetUser: String(body.targetUser ?? ""),
    adminId: auth.account.id,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
}
