import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { decidePetition } from "@/lib/petitions/store"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const action = String(body.action ?? "").trim().toLowerCase()
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 })
  }
  const result = await decidePetition({
    petitionId: decodeURIComponent(id ?? ""),
    adminId: auth.account.id,
    action,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ petition: result.petition })
}
