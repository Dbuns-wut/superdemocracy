import { getCommunityOrgById } from "@/lib/community-orgs/store"
import { isSameParticipant, normalizeParticipantId } from "@/lib/participant-id"

export async function isVoteOrgAdmin(orgId: string, participantId: string): Promise<boolean> {
  const normalized = normalizeParticipantId(participantId)
  if (!normalized) return false
  const org = await getCommunityOrgById(orgId)
  if (!org) return false
  return isSameParticipant(org.creatorId, normalized)
}

/** Appointed counter only — never implied by admin. */
export async function isVoteOrgAuditor(orgId: string, participantId: string): Promise<boolean> {
  const normalized = normalizeParticipantId(participantId)
  if (!normalized) return false
  const org = await getCommunityOrgById(orgId)
  if (!org?.auditorId) return false
  if (isSameParticipant(org.creatorId, normalized)) return false
  return isSameParticipant(org.auditorId, normalized)
}

export async function isVoteOrgMember(orgId: string, participantId: string): Promise<boolean> {
  const normalized = normalizeParticipantId(participantId)
  if (!normalized) return false
  const { getCommunityOrgMembersList } = await import("@/lib/community-orgs/store")
  const members = await getCommunityOrgMembersList(orgId)
  if (!members) return false
  return members.some((m) => isSameParticipant(m, normalized))
}
