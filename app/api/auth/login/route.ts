import { NextResponse } from "next/server"
import { loginAccount, toPublicAccount } from "@/lib/auth/accounts"
import { sessionCookieHeader } from "@/lib/auth/cookie"

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 })
  }
  const result = await loginAccount(String(body.email ?? ""), String(body.password ?? ""))
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const res = NextResponse.json({ ok: true, account: toPublicAccount(result.account) })
  res.headers.set("Set-Cookie", sessionCookieHeader(result.token))
  return res
}
