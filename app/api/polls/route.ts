import { NextResponse } from "next/server"
import { sessionAccount } from "@/lib/auth/session"
import { listPollsByOrgWithSummary } from "@/lib/polls/store"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get("orgId")?.trim() ?? ""
  if (!orgId) return NextResponse.json({ error: "orgId query param required" }, { status: 400 })
  const viewer = await sessionAccount(request)
  const polls = await listPollsByOrgWithSummary(orgId, viewer?.id ?? null)
  return NextResponse.json({ polls })
}
