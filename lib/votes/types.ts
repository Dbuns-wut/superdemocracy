export type VoteStatus = "draft" | "active" | "closed" | "verification" | "certified"

/** History of window open/close (admin lifecycle only — not ballot reveal). */
export type VerificationApproval = {
  /** Account id of the admin who opened, closed, or locked the window. */
  signer: string
  approvedAt: number
  action: "open" | "close" | "lock"
}

export type CommunityVote = {
  id: string
  orgId: string
  title: string
  description: string
  options: string[]
  startTime: number
  endTime: number
  eligibleVoters: string[]
  allowVoteChange: boolean
  /** Snapshotted from the organization at creation. Missing on older votes means on. */
  auditorVisible?: boolean
  /**
   * A referendum is the binding question, including one launched from a petition.
   * Missing on older records means an ordinary vote.
   */
  kind?: "vote" | "referendum"
  /** Set when this referendum was launched from a petition. */
  petitionId?: string
  status: VoteStatus
  verificationApprovals: VerificationApproval[]
  createdAt: number
}

/** Plaintext ballot — server-side only after decryption; never returned to ordinary clients. */
export type Ballot = {
  voterId: string
  choices: number[]
  timestamp: number
}

export type StoredBallot = {
  voterId: string
  ciphertext: string
  iv: string
  authTag: string
  timestamp: number
}

/** Public cast confirmation — no choice leakage. */
export type BallotReceipt = {
  voterId: string
  timestamp: number
}

/** What a participant can see about their own submission. Never returned for anyone else. */
export type OwnSubmission = {
  /** null when the vote uses a secret count and only participation is recorded. */
  choices: number[] | null
  timestamp: number | null
  linked: boolean
}

export type CommunityVoteSummary = CommunityVote & {
  tally: number[] | null
  totalBallots: number | null
  /** Present only for the signed-in viewer's own submission. */
  mySubmission?: OwnSubmission | null
}

export type CommunityVotePublic = {
  vote: CommunityVote
  tally: number[] | null
  totalBallots: number | null
  /** Present only for the signed-in viewer's own submission. */
  mySubmission?: OwnSubmission | null
}
