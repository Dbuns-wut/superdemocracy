import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import type {
  EvidenceItem,
  Perspective,
  QuickDebrief,
  SourceItem,
  VoteEducation,
} from "./types"
import { emptyQuickDebrief } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = path.join(DATA_DIR, "vote-education.json")
const ACK_FILE = path.join(DATA_DIR, "vote-education-acks.json")

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Store = Record<string, VoteEducation>
/** voteId -> account ids that acknowledged the education for that vote. */
type AckStore = Record<string, string[]>

function normalizeSubject(input: string): string | null {
  const t = input.trim()
  if (!t) return null
  if (UUID_RE.test(t)) return t.toLowerCase()
  return null
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8")
    return JSON.parse(raw) as T
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return fallback
    throw e
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8")
}

function asQuickDebrief(raw: unknown): QuickDebrief {
  const base = emptyQuickDebrief()
  if (!raw || typeof raw !== "object") return base
  const r = raw as Record<string, unknown>
  return {
    what: String(r.what ?? ""),
    why: String(r.why ?? ""),
    known: String(r.known ?? ""),
    disputed: String(r.disputed ?? ""),
    uncertain: String(r.uncertain ?? ""),
  }
}

function migrateEducation(voteId: string, raw: VoteEducation): VoteEducation {
  return {
    voteId,
    quickDebrief: asQuickDebrief(raw.quickDebrief),
    perspectives: Array.isArray(raw.perspectives) ? raw.perspectives : [],
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  }
}

function defaultEducation(voteId: string): VoteEducation {
  return {
    voteId,
    quickDebrief: {
      what: "What is being decided is listed in the title and options on this page.",
      why: "Your choice helps the organization pick a direction on this issue.",
      known: "The options and description on this decision are the starting facts.",
      disputed: "Members may disagree about costs, benefits, and which option is better.",
      uncertain: "Open Evidence and Sources below when you want more than this short debrief.",
    },
    perspectives: [
      {
        id: randomUUID(),
        title: "For",
        body: "Arguments in favor of this proposal. Add org-specific perspectives when you publish the vote.",
      },
      {
        id: randomUUID(),
        title: "Against",
        body: "Arguments against this proposal. Members should read both sides before acknowledging.",
      },
    ],
    evidence: [],
    sources: [],
    updatedAt: Date.now(),
  }
}

export async function getEducation(voteIdRaw: string): Promise<VoteEducation | null> {
  const voteId = normalizeSubject(voteIdRaw)
  if (!voteId) return null
  const store = await readJson<Store>(FILE, {})
  const existing = store[voteId]
  if (existing) {
    const needsMigrate =
      !existing.quickDebrief || !Array.isArray(existing.evidence) || !Array.isArray(existing.sources)
    const migrated = migrateEducation(voteId, existing)
    if (needsMigrate) {
      store[voteId] = migrated
      await writeJson(FILE, store)
    }
    return migrated
  }
  const seeded = defaultEducation(voteId)
  store[voteId] = seeded
  await writeJson(FILE, store)
  return seeded
}

function cleanPerspectives(input: unknown): Perspective[] {
  if (!Array.isArray(input)) return []
  return input
    .map((p) => {
      const row = p as { title?: string; body?: string }
      return {
        id: randomUUID(),
        title: String(row.title ?? "").trim(),
        body: String(row.body ?? "").trim(),
      }
    })
    .filter((p) => p.title && p.body)
}

function cleanEvidence(input: unknown): EvidenceItem[] {
  if (!Array.isArray(input)) return []
  return input
    .map((p) => {
      const row = p as { title?: string; body?: string }
      return {
        id: randomUUID(),
        title: String(row.title ?? "").trim(),
        body: String(row.body ?? "").trim(),
      }
    })
    .filter((p) => p.title && p.body)
}

function cleanSources(input: unknown): SourceItem[] {
  if (!Array.isArray(input)) return []
  return input
    .map((p) => {
      const row = p as { title?: string; url?: string; note?: string }
      return {
        id: randomUUID(),
        title: String(row.title ?? "").trim(),
        url: String(row.url ?? "").trim(),
        note: String(row.note ?? "").trim(),
      }
    })
    .filter((p) => p.title || p.url)
}

export async function setEducation(input: {
  voteId: string
  perspectives: { title: string; body: string }[]
  quickDebrief?: unknown
  evidence?: unknown
  sources?: unknown
}): Promise<{ ok: true; education: VoteEducation } | { ok: false; error: string; status: number }> {
  const voteId = normalizeSubject(input.voteId)
  if (!voteId) return { ok: false, error: "invalid vote id", status: 400 }
  const perspectives = cleanPerspectives(input.perspectives)
  if (perspectives.length < 1) {
    return { ok: false, error: "at least one perspective required", status: 400 }
  }
  const education: VoteEducation = {
    voteId,
    quickDebrief: asQuickDebrief(input.quickDebrief),
    perspectives,
    evidence: cleanEvidence(input.evidence),
    sources: cleanSources(input.sources),
    updatedAt: Date.now(),
  }
  const store = await readJson<Store>(FILE, {})
  store[voteId] = education
  await writeJson(FILE, store)
  return { ok: true, education }
}

/** Record that a signed-in person read the education for a vote. Idempotent. */
export async function acknowledgeEducation(voteIdRaw: string, accountId: string): Promise<boolean> {
  const voteId = normalizeSubject(voteIdRaw)
  if (!voteId) return false
  const acks = await readJson<AckStore>(ACK_FILE, {})
  const list = acks[voteId] ?? []
  const key = accountId.toLowerCase()
  if (!list.includes(key)) {
    list.push(key)
    acks[voteId] = list
    await writeJson(ACK_FILE, acks)
  }
  return true
}

export async function hasAcknowledgedEducation(voteIdRaw: string, accountId: string): Promise<boolean> {
  const voteId = normalizeSubject(voteIdRaw)
  if (!voteId) return false
  const acks = await readJson<AckStore>(ACK_FILE, {})
  return (acks[voteId] ?? []).includes(accountId.toLowerCase())
}
