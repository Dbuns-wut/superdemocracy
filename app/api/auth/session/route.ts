import { NextResponse } from "next/server"
import { toPublicAccount } from "@/lib/auth/accounts"
import { sessionAccount } from "@/lib/auth/session"

export async function GET(request: Request) {
  const account = await sessionAccount(request)
  if (!account) return NextResponse.json({ account: null }, { status: 401 })
  return NextResponse.json({ account: toPublicAccount(account) })
}
