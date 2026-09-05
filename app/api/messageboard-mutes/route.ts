import { NextResponse } from "next/server"
import {
  listActiveMutesForOrg,
  setMessageboardMute,
  clearMessageboardMute,
  getActiveMutedUntil,
} from "@/lib/messageboard-mutes/store"
import { verifySignedAction } from "@/lib/request-signatures"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orgKey = searchParams.get("orgKey") ?? ""
  const viewer = searchParams.get("viewer") ?? undefined
  const mutes = await listActiveMutesForOrg(orgKey)
  let viewerMutedUntil: number | null = null
  if (viewer) {
    viewerMutedUntil = await getActiveMutedUntil(orgKey, viewer)
  }
  return NextResponse.json({ mutes, viewerMutedUntil })
}

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const orgKey = String(body.orgKey ?? "")
  const targetUser = String(body.targetUser ?? "")
  const adminAddress = String(body.adminAddress ?? body.voterId ?? "")
  const mutedUntilRaw = body.mutedUntil
  const mutedUntil =
    typeof mutedUntilRaw === "number"
      ? mutedUntilRaw
      : Number.parseInt(String(mutedUntilRaw ?? ""), 10)
  if (!Number.isFinite(mutedUntil)) {
    return NextResponse.json({ error: "mutedUntil required" }, { status: 400 })
  }
  const origin = new URL(req.url).origin
  const auth = await verifySignedAction({
    action: "messageboard.mute.set",
    resourceId: orgKey,
    voterId: adminAddress,
    choices: [],
    payload: { targetUser, mutedUntil },
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await setMessageboardMute({
    orgKey,
    targetUser,
    mutedUntil,
    adminAddress: auth.signer,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ record: result.record }, { status: 201 })
}

export async function DELETE(req: Request) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const orgKey = String(body.orgKey ?? "")
  const targetUser = String(body.targetUser ?? "")
  const adminAddress = String(body.adminAddress ?? body.voterId ?? "")
  const origin = new URL(req.url).origin
  const auth = await verifySignedAction({
    action: "messageboard.mute.clear",
    resourceId: orgKey,
    voterId: adminAddress,
    choices: [],
    payload: { targetUser },
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await clearMessageboardMute({
    orgKey,
    targetUser,
    adminAddress: auth.signer,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
}
