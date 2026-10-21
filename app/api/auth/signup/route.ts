import { NextResponse } from "next/server"
import { createAccount } from "@/lib/auth/accounts"
import { sessionCookieHeader } from "@/lib/auth/cookie"

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
  const res = NextResponse.json({ ok: true, email: result.account.email, name: result.account.name })
  res.headers.set("Set-Cookie", sessionCookieHeader(result.token))
  return res
}
