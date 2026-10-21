import { NextResponse } from "next/server"
import { profilePayload } from "@/lib/identity/profile-payload"
import { getProfileByAddress, upsertProfile } from "@/lib/identity/store"
import { signedRequestOrigin, verifySignedAction } from "@/lib/request-signatures"

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
  const payload = profilePayload({
    displayName: String(body.displayName ?? ""),
    avatarUrl: body.avatarUrl == null ? undefined : String(body.avatarUrl),
    bio: body.bio == null ? undefined : String(body.bio),
    email: body.email == null ? undefined : String(body.email),
  })

  const origin = signedRequestOrigin(request)
  const auth = await verifySignedAction({
    action: "identity.profile.update",
    resourceId: voterId,
    voterId,
    choices: [],
    payload,
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const result = await upsertProfile(auth.signer, payload)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ profile: result.profile })
}
