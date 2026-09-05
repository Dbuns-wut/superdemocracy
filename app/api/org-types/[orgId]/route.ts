import { NextResponse } from "next/server"
import { getOrgType } from "@/lib/org-types/store"

type RouteContext = { params: Promise<{ orgId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { orgId } = await context.params
  const id = decodeURIComponent(orgId ?? "").trim()
  if (!id) return NextResponse.json({ error: "orgId required" }, { status: 400 })
  const type = await getOrgType(id)
  return NextResponse.json({ orgId: id, type })
}

