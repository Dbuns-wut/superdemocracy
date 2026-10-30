import { NextResponse } from "next/server"
import { searchPublicAccounts } from "@/lib/auth/accounts"
import { requireAccount } from "@/lib/auth/session"

/** Member directory search for invites. Signed-in members only. */
export async function GET(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q") ?? ""
  const limitRaw = searchParams.get("limit")
  const limit = limitRaw ? parseInt(limitRaw, 10) : 30
  const accounts = await searchPublicAccounts(q, Number.isFinite(limit) ? limit : 30)
  return NextResponse.json({ accounts })
}
