import { NextResponse } from "next/server"
import { requireAccount, sessionAccount } from "@/lib/auth/session"
import { createCommunityOrg, listCommunityOrgs } from "@/lib/community-orgs/store"
import { enrichCommunityOrgsWithViewer } from "@/lib/community-applications/store"

export async function GET(request: Request) {
  const orgs = await listCommunityOrgs()
  const viewer = await sessionAccount(request)
  if (!viewer) return NextResponse.json({ orgs })
  const enriched = await enrichCommunityOrgsWithViewer(orgs, viewer.id)
  return NextResponse.json({ orgs: enriched })
}

export async function POST(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "expected JSON object" }, { status: 400 })
  }
  const b = body as Record<string, unknown>
  const result = await createCommunityOrg({
    title: String(b.title ?? ""),
    description: String(b.description ?? ""),
    kind: b.kind,
    membershipMode: b.membershipMode,
    creatorId: auth.account.id,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ org: result.org }, { status: 201 })
}
