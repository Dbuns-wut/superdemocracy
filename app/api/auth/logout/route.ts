import { NextResponse } from "next/server"
import { destroySession } from "@/lib/auth/accounts"
import { clearSessionCookieHeader, readSessionToken } from "@/lib/auth/cookie"

export async function POST(request: Request) {
  await destroySession(readSessionToken(request))
  const res = NextResponse.json({ ok: true })
  res.headers.set("Set-Cookie", clearSessionCookieHeader())
  return res
}
