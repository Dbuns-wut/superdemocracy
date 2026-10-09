export type CommunityMembershipMode = "Open" | "Manual" | "Automatic"

export type CommunityViewerStatus = "creator" | "member" | "pending" | "none"

export type CommunityOrg = {
  id: string
  title: string
  description: string
  membershipMode: CommunityMembershipMode
  creatorAddress: string
  /**
   * Optional external auditor — only this wallet may reveal identity-linked ballots
   * during an open verification window. Must differ from creatorAddress.
   */
  auditorAddress?: string | null
  /**
   * When true (the default), appointed counters can see who voted how.
   * When false, new votes in this organization do not keep that link.
   * Missing means on, matching blockchain votes.
   */
  auditorVisibleBallots?: boolean
  createdAt: number
  memberCount?: number
  /** Present when listing orgs with `?viewer=` (home page). */
  viewerStatus?: CommunityViewerStatus
}
