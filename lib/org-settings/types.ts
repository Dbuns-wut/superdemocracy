export type JoinRequirementFieldType = "text" | "file"

export type JoinRequirementField = {
  id: string
  label: string
  type: JoinRequirementFieldType
  required: boolean
}

export type OrgSettings = {
  orgId: string
  /** Member-initiated petition → approval → launch. Soft default off (D-2026-09-09-01). */
  citizenInitiativesEnabled: boolean
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
export const DEFAULT_EDUCATION_BEFORE_VOTE = true

export function defaultOrgSettings(orgId: string): OrgSettings {
  return {
    orgId,
    citizenInitiativesEnabled: DEFAULT_CITIZEN_INITIATIVES,
    educationBeforeVote: DEFAULT_EDUCATION_BEFORE_VOTE,
    joinRequirements: [],
    updatedAt: 0,
  }
}
