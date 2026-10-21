import type { IdentityProfileInput } from "./types"

export function profilePayload(input: {
  displayName: string
  avatarUrl?: string
  bio?: string
  email?: string
}): IdentityProfileInput {
  const avatarUrl = input.avatarUrl?.trim() || undefined
  const bio = input.bio?.trim() || undefined
  const email = input.email?.trim() || undefined
  return {
    displayName: input.displayName.trim(),
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(bio ? { bio } : {}),
    ...(email ? { email } : {}),
  }
}

export function emailLooksOk(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}
