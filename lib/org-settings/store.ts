import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { normalizeOrgId } from "@/lib/org-id"
import type { JoinRequirementField, OrgSettings } from "./types"
import { DEFAULT_EDUCATION_BEFORE_VOTE, defaultOrgSettings } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "org-settings.json")

type Store = Record<string, OrgSettings>

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Store
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return {}
    throw e
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8")
}

function isFieldType(v: unknown): v is JoinRequirementField["type"] {
  return v === "text" || v === "file"
}

function normalizeFields(input: unknown): JoinRequirementField[] {
  if (!Array.isArray(input)) return []
  const out: JoinRequirementField[] = []
  const seen = new Set<string>()
  for (const row of input) {
    if (!row || typeof row !== "object") continue
    const r = row as Record<string, unknown>
    const label = String(r.label ?? "").trim()
    if (!label) continue
    const type = isFieldType(r.type) ? r.type : "text"
    const required = r.required !== false
    let id = String(r.id ?? "").trim()
    if (!id) id = randomUUID()
    if (seen.has(id)) id = randomUUID()
    seen.add(id)
    out.push({ id, label, type, required })
  }
  return out
}

function fromStored(orgId: string, raw: OrgSettings | undefined): OrgSettings {
  const base = defaultOrgSettings(orgId)
  if (!raw) return base
  return {
    orgId,
    citizenInitiativesEnabled: Boolean(raw.citizenInitiativesEnabled),
    educationBeforeVote:
      raw.educationBeforeVote === undefined
        ? DEFAULT_EDUCATION_BEFORE_VOTE
        : Boolean(raw.educationBeforeVote),
    joinRequirements: normalizeFields(raw.joinRequirements),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
  }
}

export async function getOrgSettings(orgIdRaw: string): Promise<OrgSettings | null> {
  const orgId = normalizeOrgId(orgIdRaw)
  if (!orgId) return null
  const store = await readStore()
  return fromStored(orgId, store[orgId.toLowerCase()] ?? store[orgId])
}

export async function setOrgSettings(input: {
  orgId: string
  citizenInitiativesEnabled: boolean
  educationBeforeVote: boolean
  joinRequirements: unknown
  /** Governance orgs cannot disable Education Before Vote. */
  lockEducationOn?: boolean
}): Promise<{ ok: true; settings: OrgSettings } | { ok: false; error: string; status: number }> {
  const orgId = normalizeOrgId(input.orgId)
  if (!orgId) return { ok: false, error: "invalid org id", status: 400 }
  const educationBeforeVote = input.lockEducationOn ? true : Boolean(input.educationBeforeVote)
  const settings: OrgSettings = {
    orgId,
    citizenInitiativesEnabled: Boolean(input.citizenInitiativesEnabled),
    educationBeforeVote,
    joinRequirements: normalizeFields(input.joinRequirements),
    updatedAt: Date.now(),
  }
  const store = await readStore()
  store[orgId.toLowerCase()] = settings
  await writeStore(store)
  return { ok: true, settings }
}
