import { promises as fs } from "fs"
import path from "path"
import { ensureMigrated, hasDatabase, withDbClient } from "@/lib/db"
import { normalizeParticipantId } from "@/lib/participant-id"
import type { IdentityProfile, IdentityProfileInput } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "identity-profiles.json")

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
        typeof (row as IdentityProfile).accountId === "string" &&
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

function rowToProfile(row: {
  account_id: string
  display_name: string
  avatar_url?: string | null
  bio?: string | null
  email?: string | null
  updated_at: number | string
}): IdentityProfile {
  return {
    accountId: row.account_id,
    displayName: row.display_name,
    ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}),
    ...(row.bio ? { bio: row.bio } : {}),
    ...(row.email ? { email: row.email } : {}),
    updatedAt: Number(row.updated_at),
  }
}

async function pgGetProfile(accountId: string): Promise<IdentityProfile | null> {
  await ensureMigrated()
  return withDbClient(async (client) => {
    const res = await client.query(`SELECT * FROM identity_profiles WHERE LOWER(account_id) = $1`, [accountId])
    const row = res.rows[0]
    return row ? rowToProfile(row) : null
  })
}

async function pgGetProfiles(accountIds: string[]): Promise<IdentityProfile[]> {
  if (accountIds.length === 0) return []
  await ensureMigrated()
  return withDbClient(async (client) => {
    const res = await client.query(`SELECT * FROM identity_profiles WHERE LOWER(account_id) = ANY($1)`, [accountIds])
    return res.rows.map(rowToProfile)
  })
}

async function pgUpsertProfile(profile: IdentityProfile): Promise<void> {
  await ensureMigrated()
  await withDbClient(async (client) => {
    await client.query(
      `INSERT INTO identity_profiles (account_id, display_name, avatar_url, bio, email, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (account_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         avatar_url = EXCLUDED.avatar_url,
         bio = EXCLUDED.bio,
         email = EXCLUDED.email,
         updated_at = EXCLUDED.updated_at`,
      [
        profile.accountId,
        profile.displayName,
        profile.avatarUrl ?? null,
        profile.bio ?? null,
        profile.email ?? null,
        profile.updatedAt,
      ]
    )
  })
}

export async function getProfileByAccountId(accountIdRaw: string): Promise<IdentityProfile | null> {
  const accountId = normalizeParticipantId(accountIdRaw)
  if (!accountId) return null
  if (hasDatabase()) return pgGetProfile(accountId)
  const profiles = await readProfilesJson()
  return profiles.find((p) => p.accountId.toLowerCase() === accountId) ?? null
}

/** Profiles for a set of participants, keyed by lowercase account id. */
export async function getProfilesByAccountIds(ids: Iterable<string>): Promise<Record<string, IdentityProfile>> {
  const wanted: string[] = []
  for (const id of ids) {
    const n = normalizeParticipantId(id)
    if (n && !wanted.includes(n)) wanted.push(n)
  }
  const out: Record<string, IdentityProfile> = {}
  if (wanted.length === 0) return out
  const rows = hasDatabase()
    ? await pgGetProfiles(wanted)
    : (await readProfilesJson()).filter((p) => wanted.includes(p.accountId.toLowerCase()))
  for (const p of rows) out[p.accountId.toLowerCase()] = p
  return out
}

export async function upsertProfile(
  accountIdRaw: string,
  input: IdentityProfileInput
): Promise<
  | { ok: true; profile: IdentityProfile }
  | { ok: false; error: string; status: number }
> {
  const accountId = normalizeParticipantId(accountIdRaw)
  if (!accountId) {
    return { ok: false, error: "Sign in first.", status: 401 }
  }

  const displayName = String(input.displayName ?? "").trim()
  if (!displayName) {
    return { ok: false, error: "Name is required.", status: 400 }
  }
  if (displayName.length > 80) {
    return { ok: false, error: "Name is too long.", status: 400 }
  }

  const avatarUrl = trimOptional(input.avatarUrl)
  if (avatarUrl && avatarUrl.length > 100_000) {
    return { ok: false, error: "Photo is too large.", status: 400 }
  }

  const bio = trimOptional(input.bio)
  if (bio && bio.length > 280) {
    return { ok: false, error: "About you is too long.", status: 400 }
  }

  const email = trimOptional(input.email)?.toLowerCase()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Email doesn't look right.", status: 400 }
  }
  if (email && email.length > 120) {
    return { ok: false, error: "Email is too long.", status: 400 }
  }

  const profile: IdentityProfile = {
    accountId,
    displayName,
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(bio ? { bio } : {}),
    ...(email ? { email } : {}),
    updatedAt: Date.now(),
  }

  if (hasDatabase()) {
    await pgUpsertProfile(profile)
  } else {
    const profiles = await readProfilesJson()
    const idx = profiles.findIndex((p) => p.accountId.toLowerCase() === accountId)
    if (idx >= 0) profiles[idx] = profile
    else profiles.push(profile)
    await writeProfilesJson(profiles)
  }

  return { ok: true, profile }
}
