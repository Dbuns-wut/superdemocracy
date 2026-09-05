export type VoteStatus = "draft" | "active" | "closed" | "verification" | "certified"

/** History of window open/close (admin lifecycle only — not ballot reveal). */
export type VerificationApproval = {
  signer: string
  approvedAt: number
  action: "open" | "close"
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

export type CommunityVoteSummary = CommunityVote & {
  tally: number[] | null
  totalBallots: number | null
}

export type CommunityVotePublic = {
  vote: CommunityVote
  tally: number[] | null
  totalBallots: number | null
}
