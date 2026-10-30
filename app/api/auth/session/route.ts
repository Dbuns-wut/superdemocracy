import { NextResponse } from "next/server"
import { accountFromToken } from "@/lib/auth/accounts"
import { readSessionToken } from "@/lib/auth/cookie"

export async function GET(request: Request) {
  const account = await accountFromToken(readSessionToken(request))
  if (!account) return NextResponse.json({ account: null }, { status: 401 })
  return NextResponse.json({
    account: {
      email: account.email,
      name: account.name,
      address: account.walletAddress ?? null,
    },
  })
}
