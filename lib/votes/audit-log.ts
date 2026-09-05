import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { ensureMigrated, hasDatabase, withDbClient } from "@/lib/db"

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = path.join(DATA_DIR, "ballot-audit-log.json")

export type BallotAuditEntry = {
  id: string
  voteId: string
  actor: string
  action: "view_ballots"
  at: number
  note?: string
}

async function readJsonLog(): Promise<BallotAuditEntry[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    const parsed = JSON.parse(raw) as { entries?: BallotAuditEntry[] }
    return Array.isArray(parsed.entries) ? parsed.entries : []
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return []
    throw e
  }
}

async function writeJsonLog(entries: BallotAuditEntry[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(FILE, JSON.stringify({ entries }, null, 2), "utf8")
}

/** Append-only record of privileged ballot access. */
export async function appendBallotAudit(input: {
  voteId: string
  actor: string
  action: "view_ballots"
  note?: string
}): Promise<BallotAuditEntry> {
  const entry: BallotAuditEntry = {
    id: randomUUID(),
    voteId: input.voteId,
    actor: input.actor,
    action: input.action,
    at: Date.now(),
    note: input.note,
  }

  if (hasDatabase()) {
    await ensureMigrated()
    await withDbClient(async (client) => {
      await client.query(
        `INSERT INTO ballot_audit_log (id, vote_id, actor, action, at, note)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [entry.id, entry.voteId, entry.actor, entry.action, entry.at, entry.note ?? null]
      )
    })
    return entry
  }

  const entries = await readJsonLog()
  entries.push(entry)
  await writeJsonLog(entries)
  return entry
}
