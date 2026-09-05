import { NextResponse } from "next/server"
import { getEducation, setEducation } from "@/lib/education/store"
import { verifySignedAction } from "@/lib/request-signatures"

type Params = { params: Promise<{ address: string }> }

export async function GET(_: Request, context: Params) {
  const { address } = await context.params
  const education = await getEducation(address)
  if (!education) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 })
  }
  return NextResponse.json({ education })
}

export async function PUT(request: Request, context: Params) {
  const { address } = await context.params
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  const perspectives = Array.isArray(body.perspectives) ? body.perspectives : []
  const voterId = String(body.voterId ?? "")
  const origin = new URL(request.url).origin
  const auth = await verifySignedAction({
    action: "education.set",
    resourceId: address,
    voterId,
    choices: [],
    payload: { perspectives },
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await setEducation({
    referendumAddress: address,
    perspectives: perspectives.map((p) => {
      const row = p as { title?: string; body?: string }
      return { title: String(row.title ?? ""), body: String(row.body ?? "") }
    }),
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ education: result.education })
}
