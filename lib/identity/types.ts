export type IdentityProfile = {
  address: `0x${string}`
  displayName: string
  avatarUrl?: string
  bio?: string
  updatedAt: number
}

export type IdentityProfileInput = {
  displayName: string
  avatarUrl?: string
  bio?: string
}
