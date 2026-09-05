/**
 * Postgres persistence (optional).
 *
 * Set DATABASE_URL to use Postgres; omit it for JSON file storage under data/.
 *
 * Example (docker-compose in this repo):
 *   DATABASE_URL=postgresql://superdemocracy:superdemocracy@localhost:5432/superdemocracy
 *
 * Also set BALLOT_ENCRYPTION_KEY (64-char hex or any string — derived with SHA-256).
 */
import { Pool, type PoolClient } from "pg"

let pool: Pool | null = null
let migrated = false

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim())
}

export function getPool(): Pool {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }
  if (!pool) {
    pool = new Pool({ connectionString: url })
  }
  return pool
}

export async function withDbClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}

export async function migrate(): Promise<void> {
  if (!hasDatabase()) return
  if (migrated) return

  await withDbClient(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS community_orgs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        membership_mode TEXT NOT NULL,
        creator_address TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );

      ALTER TABLE community_orgs
        ADD COLUMN IF NOT EXISTS auditor_address TEXT;

      CREATE TABLE IF NOT EXISTS ballot_audit_log (
        id TEXT PRIMARY KEY,
        vote_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        at BIGINT NOT NULL,
        note TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_ballot_audit_vote ON ballot_audit_log (vote_id);

      CREATE TABLE IF NOT EXISTS community_votes (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        options JSONB NOT NULL,
        start_time BIGINT NOT NULL,
        end_time BIGINT NOT NULL,
        eligible_voters JSONB NOT NULL DEFAULT '[]',
        allow_vote_change BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'active',
        verification_approvals JSONB NOT NULL DEFAULT '[]',
        created_at BIGINT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_community_votes_org_id ON community_votes (org_id);

      CREATE TABLE IF NOT EXISTS community_ballots (
        vote_id TEXT NOT NULL,
        voter_id TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        PRIMARY KEY (vote_id, voter_id)
      );

      CREATE TABLE IF NOT EXISTS identity_profiles (
        address TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        bio TEXT,
        updated_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS signed_nonces (
        nonce TEXT NOT NULL,
        signer TEXT NOT NULL,
        action TEXT NOT NULL,
        expires_at BIGINT NOT NULL,
        PRIMARY KEY (nonce, signer, action)
      );

      CREATE INDEX IF NOT EXISTS idx_signed_nonces_expires ON signed_nonces (expires_at);

      CREATE TABLE IF NOT EXISTS education (
        referendum_address TEXT PRIMARY KEY,
        perspectives JSONB NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `)
  })

  migrated = true
}

export async function ensureMigrated(): Promise<void> {
  if (hasDatabase()) await migrate()
}
