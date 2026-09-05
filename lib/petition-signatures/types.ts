export type PetitionSignature = {
  /** Organization (group) contract this petition belongs to. */
  organizationAddress: `0x${string}`
  /** On-chain petition id (decimal string, same as `Organization.petitions` index). */
  petitionId: string
  signer: `0x${string}`
  timestamp: number
}
