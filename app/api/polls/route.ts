import { NextResponse } from "next/server"
import { listPollsByOrgWithSummary } from "@/lib/polls/store"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get("orgId")?.trim() ?? ""
  if (!orgId) return NextResponse.json({ error: "orgId query param required" }, { status: 400 })
  const voter = searchParams.get("voter")?.trim() || null
  const polls = await listPollsByOrgWithSummary(orgId, voter)
  return NextResponse.json({ polls })
}

