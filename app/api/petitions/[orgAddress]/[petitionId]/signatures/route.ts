import { NextResponse } from "next/server"
import { getSignaturesForPetition } from "@/lib/petition-signatures"

type RouteContext = {
  params: Promise<{ orgAddress: string; petitionId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { orgAddress, petitionId } = await context.params
  const organizationAddress = decodeURIComponent(orgAddress ?? "").trim()
  const pid = decodeURIComponent(petitionId ?? "").trim()

  if (!organizationAddress || !pid) {
    return NextResponse.json(
      { error: "orgAddress and petitionId required", signatures: [], count: 0 },
      { status: 400 }
    )
  }

  const { signatures, count } = await getSignaturesForPetition({
    organizationAddress,
    petitionId: pid,
  })

  return NextResponse.json({ signatures, count })
}
