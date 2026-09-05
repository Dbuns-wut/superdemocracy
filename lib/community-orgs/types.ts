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
  createdAt: number
  memberCount?: number
  /** Present when listing orgs with `?viewer=` (home page). */
  viewerStatus?: CommunityViewerStatus
}
