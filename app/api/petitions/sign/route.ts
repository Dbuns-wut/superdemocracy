import { NextResponse } from "next/server"
import { addSignature } from "@/lib/petition-signatures"

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

  const { organizationAddress, petitionId, signer } = body as {
    organizationAddress?: unknown
    petitionId?: unknown
    signer?: unknown
  }

  if (
    typeof organizationAddress !== "string" ||
    typeof petitionId !== "string" ||
    typeof signer !== "string"
  ) {
    return NextResponse.json(
      {
        error:
          "organizationAddress, petitionId, and signer must be strings (petitionId = on-chain index, e.g. \"0\")",
      },
      { status: 400 }
    )
  }

  const result = await addSignature({
    organizationAddress,
    petitionId,
    signer,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ signature: result.signature }, { status: 201 })
}
