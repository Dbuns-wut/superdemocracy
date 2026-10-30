import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import {
  approveCommunityApplication,
  rejectCommunityApplication,
} from "@/lib/community-applications/store"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Params) {
  const { id } = await context.params
  if (!id?.trim()) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const decision = String(body.decision ?? "")
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "decision must be approve or reject" }, { status: 400 })
  }

  if (decision === "approve") {
    const result = await approveCommunityApplication(id.trim(), auth.account.id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ status: "approved" })
  }
  const result = await rejectCommunityApplication(id.trim(), auth.account.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ status: "rejected" })
}
