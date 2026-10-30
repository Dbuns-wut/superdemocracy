import { isCommunityOrgAdmin } from "@/lib/community-orgs/store"
import { normalizeOrgId } from "@/lib/org-id"
import { normalizeParticipantId } from "@/lib/participant-id"

export async function isOrgSettingsAdmin(orgIdRaw: string, participantRaw: string): Promise<boolean> {
  const orgId = normalizeOrgId(orgIdRaw)
  const participant = normalizeParticipantId(participantRaw)
  if (!orgId || !participant) return false
  return isCommunityOrgAdmin(orgId, participant)
}
