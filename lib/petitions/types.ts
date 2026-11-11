export type PetitionStatus = "open" | "approved" | "rejected" | "launched"

export type PetitionSignature = {
  accountId: string
  signedAt: number
  /** Set when the person is no longer a member. The row is kept. */
  removedAt?: number
  removedReason?: "not-a-member"
}

export type Petition = {
  id: string
  orgId: string
  title: string
  description: string
  /** The question a launched referendum will ask. At least two. */
  options: string[]
  creatorId: string
  status: PetitionStatus
  signatures: PetitionSignature[]
  voteId?: string
  createdAt: number
  decidedAt?: number
  decidedBy?: string
}

/** What the client may see. Signer names are only on `signers`, and only for the counter. */
export type PetitionView = {
  id: string
  orgId: string
  title: string
  description: string
  options: string[]
  creatorId: string
  status: PetitionStatus
  support: number
  threshold: number
  createdAt: number
  voteId: string | null
  /** Present when the viewer has a current signature. */
  signedAt: number | null
  /** Appointed counter only. Null for everyone else. */
  signers: { accountId: string; signedAt: number }[] | null
  /** Appointed counter only. People dropped because they left. */
  removed: { accountId: string; removedAt: number }[] | null
}
