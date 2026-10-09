/** Who may see a person-to-choice record. The tally is a separate, public fact. */
export function canReadLinkedBallot(input: {
  auditorVisible: boolean
  callerIsAppointedCounter: boolean
}): { ok: true } | { ok: false; error: string } {
  if (!input.auditorVisible) {
    return { ok: false, error: "this vote does not keep a person-to-choice record" }
  }
  if (!input.callerIsAppointedCounter) {
    return { ok: false, error: "appointed counter required" }
  }
  return { ok: true }
}

export function orgKeepsAuditorVisibleBallots(org: {
  auditorVisibleBallots?: boolean | null
}): boolean {
  return org.auditorVisibleBallots !== false
}
