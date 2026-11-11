import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { createPetition, listPetitionsForViewer } from "@/lib/petitions/store"

export async function GET(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  const orgId = new URL(request.url).searchParams.get("orgId")?.trim() ?? ""
  const result = await listPetitionsForViewer({ orgId, viewerId: auth.account.id })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({
    petitions: result.petitions,
    threshold: result.threshold,
    enabled: result.enabled,
  })
}

export async function POST(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const result = await createPetition({
    orgId: String(body.orgId ?? ""),
    creatorId: auth.account.id,
    title: String(body.title ?? ""),
    description: String(body.description ?? ""),
    options: body.options,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ petition: result.petition }, { status: 201 })
}
