import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { signPetition } from "@/lib/petitions/store"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  const result = await signPetition({ petitionId: decodeURIComponent(id ?? ""), accountId: auth.account.id })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ petition: result.petition })
}
