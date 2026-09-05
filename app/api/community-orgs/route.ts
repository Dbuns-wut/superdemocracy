import { NextResponse } from "next/server"
import { createCommunityOrg, listCommunityOrgs } from "@/lib/community-orgs/store"
import { enrichCommunityOrgsWithViewer } from "@/lib/community-applications/store"
import { verifySignedAction } from "@/lib/request-signatures"

export async function GET(req: Request) {
  const viewer = new URL(req.url).searchParams.get("viewer")
  const orgs = await listCommunityOrgs()
  if (!viewer?.trim()) {
    return NextResponse.json({ orgs })
  }
  const enriched = await enrichCommunityOrgsWithViewer(orgs, viewer.trim())
  return NextResponse.json({ orgs: enriched })
}

export async function POST(request: Request) {
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
  const title = String(b.title ?? "")
  const description = String(b.description ?? "")
  const membershipMode = b.membershipMode
  const creatorAddress = String(b.creatorAddress ?? b.voterId ?? "")
  const origin = new URL(request.url).origin
  const auth = await verifySignedAction({
    action: "community.orgs.create",
    resourceId: "new",
    voterId: creatorAddress,
    choices: [],
    payload: { title, description, membershipMode },
    nonce: String(b.nonce ?? ""),
    issuedAt: Number(b.issuedAt),
    expiresAt: Number(b.expiresAt),
    signature: String(b.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await createCommunityOrg({
    title,
    description,
    membershipMode,
    creatorAddress: auth.signer,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ org: result.org }, { status: 201 })
}
