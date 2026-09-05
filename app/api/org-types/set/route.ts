import { NextResponse } from "next/server"
import { setOrgType } from "@/lib/org-types/store"
import { verifySignedAction } from "@/lib/request-signatures"

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
  const { orgId, type, voterId, nonce, issuedAt, expiresAt, signature } = body as Record<
    string,
    unknown
  >
  const origin = new URL(request.url).origin
  const auth = await verifySignedAction({
    action: "org-types.set",
    resourceId: String(orgId ?? ""),
    voterId: String(voterId ?? ""),
    choices: [],
    payload: { type: String(type ?? "") },
    nonce: String(nonce ?? ""),
    issuedAt: Number(issuedAt),
    expiresAt: Number(expiresAt),
    signature: String(signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const result = await setOrgType(
    String(orgId ?? ""),
    String(type ?? "") as "ON_CHAIN" | "OFF_CHAIN"
  )
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true, setBy: auth.signer })
}
