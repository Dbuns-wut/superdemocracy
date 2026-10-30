export type IdentityProfile = {
  accountId: string
  displayName: string
  avatarUrl?: string
  bio?: string
  email?: string
  updatedAt: number
}

export type IdentityProfileInput = {
  displayName: string
  avatarUrl?: string
  bio?: string
  email?: string
}
