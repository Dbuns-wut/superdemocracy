export type CommunityMembershipMode = "Open" | "Manual" | "Automatic"

/**
 * Community: polls, discussion, and votes with organization-chosen rules.
 * Governance: votes with the stricter rules on; Education Before Vote cannot be turned off.
 */
export type OrgKind = "community" | "governance"

export type CommunityViewerStatus = "creator" | "member" | "pending" | "none"

export type CommunityOrg = {
  id: string
  title: string
  description: string
  kind: OrgKind
  membershipMode: CommunityMembershipMode
  /** Account id of the person who runs this organization. */
  creatorId: string
  /**
   * Appointed counter. Only this account may open identity-linked ballots during a
   * verification window. Must differ from creatorId.
   */
  auditorId?: string | null
  /**
   * When true (the default), appointed counters can see who voted how.
   * When false, new votes in this organization do not keep that link.
   */
  auditorVisibleBallots?: boolean
  createdAt: number
  memberCount?: number
  /** Present when listing orgs for a signed-in viewer. */
  viewerStatus?: CommunityViewerStatus
}
