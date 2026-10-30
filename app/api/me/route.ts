import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { profilePayload } from "@/lib/identity/profile-payload"
import { getProfileByAccountId, upsertProfile } from "@/lib/identity/store"

/** The signed-in person's own profile. */
export async function GET(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  const profile = await getProfileByAccountId(auth.account.id)
  return NextResponse.json({
    profile: profile ?? {
      accountId: auth.account.id,
      displayName: auth.account.name,
      email: auth.account.email,
      updatedAt: auth.account.createdAt,
    },
  })
}

export async function PUT(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }

  const payload = profilePayload({
    displayName: String(body.displayName ?? ""),
    avatarUrl: body.avatarUrl == null ? undefined : String(body.avatarUrl),
    bio: body.bio == null ? undefined : String(body.bio),
    email: body.email == null ? undefined : String(body.email),
  })

  const result = await upsertProfile(auth.account.id, payload)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ profile: result.profile })
}
