export type JoinRequirementFieldType = "text" | "file"

export type JoinRequirementField = {
  id: string
  label: string
  type: JoinRequirementFieldType
  required: boolean
}

export type OrgSettings = {
  orgId: string
  /** Member-initiated petition → approval → referendum. Soft default off (D-2026-09-09-01). */
  citizenInitiativesEnabled: boolean
  /**
   * How many current members must sign before an administrator can approve a petition.
   * People who leave are dropped from the count. Default 1 (D-2026-11-11-01).
   */
  petitionThreshold: number
  /**
   * Education Before Vote gate, enforced by the server when a ballot is cast. Soft default on.
   * Community orgs may disable. Governance orgs cannot; the server treats it as always on.
   */
  educationBeforeVote: boolean
  /** Per-org join fields. Not global identity. */
  joinRequirements: JoinRequirementField[]
  updatedAt: number
}

export const DEFAULT_CITIZEN_INITIATIVES = false
export const DEFAULT_PETITION_THRESHOLD = 1
export const DEFAULT_EDUCATION_BEFORE_VOTE = true

export function normalizePetitionThreshold(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 100000) return DEFAULT_PETITION_THRESHOLD
  return n
}

export function defaultOrgSettings(orgId: string): OrgSettings {
  return {
    orgId,
    citizenInitiativesEnabled: DEFAULT_CITIZEN_INITIATIVES,
    petitionThreshold: DEFAULT_PETITION_THRESHOLD,
    educationBeforeVote: DEFAULT_EDUCATION_BEFORE_VOTE,
    joinRequirements: [],
    updatedAt: 0,
  }
}
