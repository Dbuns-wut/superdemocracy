import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { getAddress, isAddress } from "viem"
import type {
  EvidenceItem,
  Perspective,
  QuickDebrief,
  ReferendumEducation,
  SourceItem,
} from "./types"
import { emptyQuickDebrief } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = path.join(DATA_DIR, "referendum-education.json")

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Store = Record<string, ReferendumEducation>

function normalizeSubject(input: string): string | null {
  const t = input.trim()
  if (!t) return null
  if (isAddress(t)) {
    try {
      return getAddress(t as `0x${string}`)
    } catch {
      return null
    }
  }
  if (UUID_RE.test(t)) return t.toLowerCase()
  return null
}

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    return JSON.parse(raw) as Store
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return {}
    throw e
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf8")
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

function migrateEducation(subjectId: string, raw: ReferendumEducation): ReferendumEducation {
  return {
    referendumAddress: subjectId,
    quickDebrief: asQuickDebrief(raw.quickDebrief),
    perspectives: Array.isArray(raw.perspectives) ? raw.perspectives : [],
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  }
}

function defaultEducation(subjectId: string): ReferendumEducation {
  return {
    referendumAddress: subjectId,
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

export async function getEducation(
  subjectIdRaw: string
): Promise<ReferendumEducation | null> {
  const subjectId = normalizeSubject(subjectIdRaw)
  if (!subjectId) return null
  const store = await readStore()
  const existing = store[subjectId.toLowerCase()]
  if (existing) {
    const needsMigrate =
      !existing.quickDebrief || !Array.isArray(existing.evidence) || !Array.isArray(existing.sources)
    const migrated = migrateEducation(subjectId, existing)
    if (needsMigrate) {
      store[subjectId.toLowerCase()] = migrated
      await writeStore(store)
    }
    return migrated
  }
  const seeded = defaultEducation(subjectId)
  store[subjectId.toLowerCase()] = seeded
  await writeStore(store)
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
  referendumAddress: string
  perspectives: { title: string; body: string }[]
  quickDebrief?: unknown
  evidence?: unknown
  sources?: unknown
}): Promise<
  { ok: true; education: ReferendumEducation } | { ok: false; error: string; status: number }
> {
  const subjectId = normalizeSubject(input.referendumAddress)
  if (!subjectId) return { ok: false, error: "invalid education subject", status: 400 }
  const perspectives = cleanPerspectives(input.perspectives)
  if (perspectives.length < 1) {
    return { ok: false, error: "at least one perspective required", status: 400 }
  }
  const education: ReferendumEducation = {
    referendumAddress: subjectId,
    quickDebrief: asQuickDebrief(input.quickDebrief),
    perspectives,
    evidence: cleanEvidence(input.evidence),
    sources: cleanSources(input.sources),
    updatedAt: Date.now(),
  }
  const store = await readStore()
  store[subjectId.toLowerCase()] = education
  await writeStore(store)
  return { ok: true, education }
}
