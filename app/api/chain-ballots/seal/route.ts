import { NextResponse } from "next/server"
import { sealBallotChoices } from "@/lib/ballot-crypto"

/** Encrypt a ranking for a blockchain vote. The response is ciphertext, not the choice. */
export async function POST(req: Request) {
  let body: { choices?: unknown }
  try {
    body = (await req.json()) as { choices?: unknown }
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }
  if (!Array.isArray(body.choices) || body.choices.length === 0) {
    return NextResponse.json({ error: "choices required" }, { status: 400 })
  }
  const choices = body.choices.map((c) => Number(c))
  if (!choices.every((c) => Number.isInteger(c) && c >= 0)) {
    return NextResponse.json({ error: "invalid choices" }, { status: 400 })
  }
  const sealed = sealBallotChoices(choices)
  return NextResponse.json({ sealed })
}
