import { NextResponse } from "next/server"
import { secretChainTally } from "@/lib/chain-ballots/store"

/** Public totals for a secret-mode referendum. No voter ids. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const referendum = searchParams.get("referendum")?.trim() ?? ""
  const optionCount = Number(searchParams.get("optionCount"))
  if (!referendum) return NextResponse.json({ error: "referendum required" }, { status: 400 })
  if (!Number.isInteger(optionCount) || optionCount < 1 || optionCount > 50) {
    return NextResponse.json({ error: "optionCount required" }, { status: 400 })
  }
  const counts = await secretChainTally(referendum, optionCount)
  const total = counts.reduce((sum, n) => sum + n, 0)
  return NextResponse.json({ counts, total })
}
