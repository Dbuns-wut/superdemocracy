import { NextResponse } from "next/server"
import { createPublicClient, http, isAddress } from "viem"
import { openSealedBallot } from "@/lib/ballot-crypto"
import { canReadLinkedBallot } from "@/lib/ballot-visibility"
import { verifySignedAction } from "@/lib/request-signatures"
import { anvil } from "@/lib/web3-server"

const referendumAbi = [
  {
    type: "function",
    name: "auditorVisible",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "organization",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const

const organizationAbi = [
  {
    type: "function",
    name: "ballotAuditor",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const

/**
 * Appointed counter only. Returns the choice inside a sealed ballot.
 * Refuses when the referendum was launched with auditor visibility off.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }

  const referendum = String(body.referendum ?? "").trim()
  const sealed = String(body.sealed ?? "").trim()
  if (!isAddress(referendum)) {
    return NextResponse.json({ error: "referendum required" }, { status: 400 })
  }
  if (!sealed.startsWith("0x")) {
    return NextResponse.json({ error: "sealed ballot required" }, { status: 400 })
  }

  const origin = new URL(req.url).origin
  const auth = await verifySignedAction({
    action: "chain.ballot.open",
    resourceId: referendum,
    voterId: String(body.voterId ?? ""),
    choices: [],
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rpc = process.env.NEXT_PUBLIC_RPC_URL?.trim() || anvil.rpcUrls.default.http[0]
  const client = createPublicClient({ chain: anvil, transport: http(rpc) })
  let auditorVisible = false
  let counter = ""
  try {
    auditorVisible = await client.readContract({
      address: referendum,
      abi: referendumAbi,
      functionName: "auditorVisible",
    })
    const organization = await client.readContract({
      address: referendum,
      abi: referendumAbi,
      functionName: "organization",
    })
    counter = await client.readContract({
      address: organization,
      abi: organizationAbi,
      functionName: "ballotAuditor",
    })
  } catch {
    return NextResponse.json({ error: "could not read the referendum" }, { status: 503 })
  }

  const gate = canReadLinkedBallot({
    auditorVisible,
    callerIsAppointedCounter: counter.toLowerCase() === auth.signer.toLowerCase(),
  })
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 })

  try {
    const choices = openSealedBallot(sealed)
    return NextResponse.json({ choices })
  } catch {
    return NextResponse.json({ error: "could not open ballot" }, { status: 400 })
  }
}
