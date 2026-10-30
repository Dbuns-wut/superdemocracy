import { NextResponse } from "next/server"
import { createAccount, toPublicAccount } from "@/lib/auth/accounts"
import { sessionCookieHeader } from "@/lib/auth/cookie"
import { upsertProfile } from "@/lib/identity/store"

export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Enter your name, email, and password." }, { status: 400 })
  }
  const result = await createAccount({
    name: String(body.name ?? ""),
    email: String(body.email ?? ""),
    password: String(body.password ?? ""),
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  await upsertProfile(result.account.id, {
    displayName: result.account.name,
    email: result.account.email,
  })
  const res = NextResponse.json({ ok: true, account: toPublicAccount(result.account) })
  res.headers.set("Set-Cookie", sessionCookieHeader(result.token))
  return res
}
