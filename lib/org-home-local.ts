/** Client-only helpers for `org-home:${orgKey}` localStorage blob. */

export function parseOrgHomeRaw(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const p = JSON.parse(raw) as unknown;
    return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function getOrgProfileLogoUrl(orgKey: string): string {
  if (typeof window === "undefined") return "";
  const parsed = parseOrgHomeRaw(localStorage.getItem(`org-home:${orgKey.toLowerCase()}`));
  const v = parsed.profileLogoUrl;
  return typeof v === "string" ? v : "";
}
