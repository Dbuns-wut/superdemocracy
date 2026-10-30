const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Organization ids are lowercase UUIDs. */
export function normalizeOrgId(input: string): string | null {
  const t = typeof input === "string" ? input.trim() : ""
  if (!t || !UUID_RE.test(t)) return null
  return t.toLowerCase()
}
