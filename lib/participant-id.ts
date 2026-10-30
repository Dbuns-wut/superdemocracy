/**
 * A participant is an account. The account id (UUID) is the only identifier the
 * governance stores use for people. It comes from the signed-in session, never
 * from the request body.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function normalizeParticipantId(input: unknown): string | null {
  const t = typeof input === "string" ? input.trim().toLowerCase() : ""
  if (!t || !UUID_RE.test(t)) return null
  return t
}

export function isSameParticipant(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}
