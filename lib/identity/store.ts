import { promises as fs } from "fs"
import path from "path"
import { getAddress, isAddress } from "viem"
import { ensureMigrated, hasDatabase, withDbClient } from "@/lib/db"
import type { IdentityProfile, IdentityProfileInput } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "identity-profiles.json")

function normalizeAddress(addr: string): `0x${string}` | null {
  if (!isAddress(addr)) return null
  try {
    return getAddress(addr.trim() as `0x${string}`)
  } catch {
    return null
  }
}

function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

async function readProfilesJson(): Promise<IdentityProfile[]> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row): row is IdentityProfile =>
        !!row &&
        typeof row === "object" &&
        typeof (row as IdentityProfile).address === "string" &&
        typeof (row as IdentityProfile).displayName === "string"
    )
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return []
    throw e
  }
}

async function writeProfilesJson(profiles: IdentityProfile[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(STORE_FILE, JSON.stringify(profiles, null, 2), "utf8")
}

async function pgGetProfile(address: string): Promise<IdentityProfile | null> {
  await ensureMigrated()
  return withDbClient(async (client) => {
    const res = await client.query(`SELECT * FROM identity_profiles WHERE LOWER(address) = LOWER($1)`, [
      address,
    ])
    const row = res.rows[0]
    if (!row) return null
    return {
      address: row.address as `0x${string}`,
      displayName: row.display_name,
      ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}),
      ...(row.bio ? { bio: row.bio } : {}),
      updatedAt: Number(row.updated_at),
    }
  })
}

async function pgUpsertProfile(profile: IdentityProfile): Promise<void> {
  await ensureMigrated()
  await withDbClient(async (client) => {
    await client.query(
      `INSERT INTO identity_profiles (address, display_name, avatar_url, bio, updated_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (address) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         avatar_url = EXCLUDED.avatar_url,
         bio = EXCLUDED.bio,
         updated_at = EXCLUDED.updated_at`,
      [
        profile.address,
        profile.displayName,
        profile.avatarUrl ?? null,
        profile.bio ?? null,
        profile.updatedAt,
      ]
    )
  })
}

export async function getProfileByAddress(
  address: string
): Promise<IdentityProfile | null> {
  const normalized = normalizeAddress(address)
  if (!normalized) return null
  if (hasDatabase()) return pgGetProfile(normalized)
  const profiles = await readProfilesJson()
  return (
    profiles.find(
      (p) => p.address.toLowerCase() === normalized.toLowerCase()
    ) ?? null
  )
}

export async function upsertProfile(
  address: string,
  input: IdentityProfileInput
): Promise<
  | { ok: true; profile: IdentityProfile }
  | { ok: false; error: string; status: number }
> {
  const normalized = normalizeAddress(address)
  if (!normalized) {
    return { ok: false, error: "invalid address", status: 400 }
  }

  const displayName = String(input.displayName ?? "").trim()
  if (!displayName) {
    return { ok: false, error: "display name is required", status: 400 }
  }
  if (displayName.length > 80) {
    return { ok: false, error: "display name is too long", status: 400 }
  }

  const avatarUrl = trimOptional(input.avatarUrl)
  if (avatarUrl && avatarUrl.length > 2048) {
    return { ok: false, error: "avatar URL is too long", status: 400 }
  }

  const bio = trimOptional(input.bio)
  if (bio && bio.length > 280) {
    return { ok: false, error: "bio is too long", status: 400 }
  }

  const profile: IdentityProfile = {
    address: normalized,
    displayName,
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(bio ? { bio } : {}),
    updatedAt: Date.now(),
  }

  if (hasDatabase()) {
    await pgUpsertProfile(profile)
  } else {
    const profiles = await readProfilesJson()
    const idx = profiles.findIndex(
      (p) => p.address.toLowerCase() === normalized.toLowerCase()
    )
    if (idx >= 0) profiles[idx] = profile
    else profiles.push(profile)
    await writeProfilesJson(profiles)
  }

  return { ok: true, profile }
}
