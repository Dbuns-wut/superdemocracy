import { NextResponse } from "next/server"
import { submitPetition } from "@/lib/petition-submissions/store"

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

  const { organizationAddress, petitionId, submittedBy } = body as {
    organizationAddress?: unknown
    petitionId?: unknown
    submittedBy?: unknown
  }

  if (
    typeof organizationAddress !== "string" ||
    typeof petitionId !== "string" ||
    typeof submittedBy !== "string"
  ) {
    return NextResponse.json(
      { error: "organizationAddress, petitionId, and submittedBy must be strings" },
      { status: 400 }
    )
  }

  const result = await submitPetition({ organizationAddress, petitionId, submittedBy })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ submission: result.submission }, { status: 201 })
}

