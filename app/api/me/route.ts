import { NextResponse } from "next/server"
import { getProfileByAddress, upsertProfile } from "@/lib/identity/store"
import { verifySignedAction } from "@/lib/request-signatures"

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address")?.trim() ?? ""
  if (!address) {
    return NextResponse.json({ error: "address query required" }, { status: 400 })
  }

  const profile = await getProfileByAddress(address)
  if (!profile) {
    return NextResponse.json({ profile: null })
  }

  return NextResponse.json({ profile })
}

export async function PUT(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }

  const voterId = String(body.voterId ?? body.address ?? "")
  const displayName = String(body.displayName ?? "")
  const avatarUrl =
    body.avatarUrl === undefined || body.avatarUrl === null
      ? undefined
      : String(body.avatarUrl)
  const bio =
    body.bio === undefined || body.bio === null ? undefined : String(body.bio)

  const origin = new URL(request.url).origin
  const auth = await verifySignedAction({
    action: "identity.profile.update",
    resourceId: voterId,
    voterId,
    choices: [],
    payload: { displayName, avatarUrl, bio },
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const result = await upsertProfile(auth.signer, {
    displayName,
    avatarUrl,
    bio,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ profile: result.profile })
}
