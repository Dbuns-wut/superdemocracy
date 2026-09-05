import { NextResponse } from "next/server"
import {
  approveCommunityApplication,
  rejectCommunityApplication,
} from "@/lib/community-applications/store"
import { verifySignedAction } from "@/lib/request-signatures"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: Params) {
  const { id } = await context.params
  if (!id?.trim()) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const adminAddress = String(body.adminAddress ?? body.voterId ?? "")
  const decision = String(body.decision ?? "")
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "decision must be approve or reject" }, { status: 400 })
  }
  const origin = new URL(req.url).origin
  const auth = await verifySignedAction({
    action: "community.applications.decision",
    resourceId: id.trim(),
    voterId: adminAddress,
    choices: [],
    payload: { decision },
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  if (decision === "approve") {
    const result = await approveCommunityApplication(id.trim(), auth.signer)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ status: "approved" })
  }
  const result = await rejectCommunityApplication(id.trim(), auth.signer)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ status: "rejected" })
}
