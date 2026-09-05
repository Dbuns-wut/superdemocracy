import { NextResponse } from "next/server"
import { getPetitionSubmission } from "@/lib/petition-submissions/store"

type RouteContext = {
  params: Promise<{ orgAddress: string; petitionId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { orgAddress, petitionId } = await context.params
  const organizationAddress = decodeURIComponent(orgAddress ?? "").trim()
  const pid = decodeURIComponent(petitionId ?? "").trim()

  if (!organizationAddress || !pid) {
    return NextResponse.json({ error: "orgAddress and petitionId required" }, { status: 400 })
  }

  const submission = await getPetitionSubmission({ organizationAddress, petitionId: pid })
  return NextResponse.json({
    submitted: !!submission?.submitted,
    submission: submission ?? null,
  })
}

