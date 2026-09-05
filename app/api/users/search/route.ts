import { NextResponse } from "next/server"
import { searchKnownWallets } from "@/lib/user-directory"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const limitRaw = searchParams.get("limit")
  const limit = limitRaw ? parseInt(limitRaw, 10) : 30
  const addresses = await searchKnownWallets(q, Number.isFinite(limit) ? limit : 30)
  return NextResponse.json({ addresses })
}
