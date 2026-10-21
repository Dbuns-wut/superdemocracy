import { NextResponse } from "next/server"
import { getOrgSettings, setOrgSettings } from "@/lib/org-settings/store"
import { isOrgSettingsAdmin } from "@/lib/org-settings/admin"
import { isOffchainOrgId, normalizeOrgId } from "@/lib/org-id"
import { signedRequestOrigin, verifySignedAction } from "@/lib/request-signatures"

type Params = { params: Promise<{ orgId: string }> }

export async function GET(_: Request, context: Params) {
  const { orgId: raw } = await context.params
  const orgId = normalizeOrgId(raw)
  if (!orgId) {
    return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  }
  const settings = await getOrgSettings(orgId)
  if (!settings) {
    return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  }
  const community = isOffchainOrgId(orgId)
  return NextResponse.json({
    settings: {
      ...settings,
      educationBeforeVote: community ? settings.educationBeforeVote : true,
      joinRequirements: community ? settings.joinRequirements : [],
    },
    community,
  })
}

export async function PUT(request: Request, context: Params) {
  const { orgId: raw } = await context.params
  const orgId = normalizeOrgId(raw)
  if (!orgId) {
    return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  }
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }

  const community = isOffchainOrgId(orgId)
  const citizenInitiativesEnabled = Boolean(body.citizenInitiativesEnabled)
  const educationBeforeVote = community ? Boolean(body.educationBeforeVote) : true
  const joinRequirements = community ? body.joinRequirements : []
  const voterId = String(body.voterId ?? "")
  const origin = signedRequestOrigin(request)
  const payload = {
    citizenInitiativesEnabled,
    educationBeforeVote,
    joinRequirements,
  }
  const auth = await verifySignedAction({
    action: "org.settings.set",
    resourceId: orgId,
    voterId,
    choices: [],
    payload,
    nonce: String(body.nonce ?? ""),
    issuedAt: Number(body.issuedAt),
    expiresAt: Number(body.expiresAt),
    signature: String(body.signature ?? ""),
    origin,
  })
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const allowed = await isOrgSettingsAdmin(orgId, auth.signer)
  if (!allowed) {
    return NextResponse.json({ error: "only the organization admin can change settings" }, { status: 403 })
  }

  const result = await setOrgSettings({
    orgId,
    citizenInitiativesEnabled,
    educationBeforeVote,
    joinRequirements,
    lockEducationOn: !community,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ settings: result.settings, community })
}
