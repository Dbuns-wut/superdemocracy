import { NextResponse } from "next/server"
import { requireAccount } from "@/lib/auth/session"
import { getCommunityOrgById } from "@/lib/community-orgs/store"
import { getOrgSettings, setOrgSettings } from "@/lib/org-settings/store"
import { isOrgSettingsAdmin } from "@/lib/org-settings/admin"
import { normalizeOrgId } from "@/lib/org-id"

type Params = { params: Promise<{ orgId: string }> }

export async function GET(_: Request, context: Params) {
  const { orgId: raw } = await context.params
  const orgId = normalizeOrgId(raw)
  if (!orgId) {
    return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  }
  const org = await getCommunityOrgById(orgId)
  if (!org) return NextResponse.json({ error: "organization not found" }, { status: 404 })
  const settings = await getOrgSettings(orgId)
  if (!settings) {
    return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  }
  const governance = org.kind === "governance"
  return NextResponse.json({
    settings: {
      ...settings,
      educationBeforeVote: governance ? true : settings.educationBeforeVote,
    },
    kind: org.kind,
  })
}

export async function PUT(request: Request, context: Params) {
  const { orgId: raw } = await context.params
  const orgId = normalizeOrgId(raw)
  if (!orgId) {
    return NextResponse.json({ error: "invalid org id" }, { status: 400 })
  }
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 })
  }

  const org = await getCommunityOrgById(orgId)
  if (!org) return NextResponse.json({ error: "organization not found" }, { status: 404 })
  const allowed = await isOrgSettingsAdmin(orgId, auth.account.id)
  if (!allowed) {
    return NextResponse.json({ error: "only the organization admin can change settings" }, { status: 403 })
  }

  const governance = org.kind === "governance"
  const result = await setOrgSettings({
    orgId,
    citizenInitiativesEnabled: Boolean(body.citizenInitiativesEnabled),
    educationBeforeVote: governance ? true : Boolean(body.educationBeforeVote),
    joinRequirements: body.joinRequirements,
    lockEducationOn: governance,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ settings: result.settings, kind: org.kind })
}
