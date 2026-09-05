import { NextResponse } from "next/server"
import { getCommunityOrgById } from "@/lib/community-orgs/store"
import { normalizeOrgId } from "@/lib/org-id"

type Params = { params: Promise<{ id: string }> }

export async function GET(_: Request, context: Params) {
  const { id } = await context.params
  const normalized = normalizeOrgId(id)
  if (!normalized) {
    return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  }
  const org = await getCommunityOrgById(normalized)
  if (!org) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  return NextResponse.json({ org })
}
