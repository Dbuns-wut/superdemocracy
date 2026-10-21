import { NextResponse } from "next/server"
import { changePassword } from "@/lib/auth/accounts"
import { readSessionToken } from "@/lib/auth/cookie"

export async function POST(request: Request) {
  let body: { currentPassword?: unknown; newPassword?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Enter your current password and a new one." }, { status: 400 })
  }
  const result = await changePassword({
    token: readSessionToken(request),
    currentPassword: String(body.currentPassword ?? ""),
    newPassword: String(body.newPassword ?? ""),
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true })
}
