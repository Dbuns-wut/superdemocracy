import { NextResponse } from "next/server"
import { listCommunityVotesByOrgWithSummary } from "@/lib/votes/store"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get("orgId")?.trim() ?? ""
  if (!orgId) return NextResponse.json({ error: "orgId query param required" }, { status: 400 })
  const viewer = searchParams.get("viewer")?.trim() || null
  const votes = await listCommunityVotesByOrgWithSummary(orgId, viewer)
  return NextResponse.json({ votes })
}
