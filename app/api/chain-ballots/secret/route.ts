import { NextResponse } from "next/server"
import { addSecretChainBallot } from "@/lib/chain-ballots/store"
import { verifySignedAction } from "@/lib/request-signatures"

/** Records a choice with no voter address. Used when auditor visibility is off. */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }

  const referendum = String(body.referendum ?? "").trim()
  const choicesRaw = body.choices
  if (!referendum) return NextResponse.json({ error: "referendum required" }, { status: 400 })
  if (!Array.isArray(choicesRaw) || choicesRaw.length === 0) {
    return NextResponse.json({ error: "choices required" }, { status: 400 })
  }
  const choices = choicesRaw.map((c) => Number(c))
  if (!choices.every((c) => Number.isInteger(c) && c >= 0)) {
    return NextResponse.json({ error: "invalid choices" }, { status: 400 })
  }

  const origin = new URL(req.url).origin
  const signature = String(body.signature ?? "")
  const auth = await verifySignedAction({
    action: "chain.ballot.secret",
    resourceId: referendum,
    voterId: String(body.voterId ?? ""),
    choices,
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature,
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const saved = await addSecretChainBallot({ referendum, signature, choices })
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status })
  return NextResponse.json({ accepted: true })
}
