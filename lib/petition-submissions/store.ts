import { promises as fs } from "fs"
import path from "path"
import { petitionStorageKey, normalizeOrganizationAddress, normalizePetitionIndex } from "@/lib/petition-signatures/key"

export type PetitionSubmission = {
  organizationAddress: `0x${string}`
  petitionId: string
  submitted: boolean
  submittedBy: `0x${string}`
  submittedAt: number
}

type PersistedShape = Record<string, PetitionSubmission>

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "petition-submissions.json")

async function readStore(): Promise<PersistedShape> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as PersistedShape
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return {}
    throw e
  }
}

async function writeStore(data: PersistedShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf8")
}

export async function submitPetition(input: {
  organizationAddress: string
  petitionId: string
  submittedBy: string
}): Promise<
  | { ok: true; submission: PetitionSubmission }
  | { ok: false; error: string; status: number }
> {
  const key = petitionStorageKey(input.organizationAddress, input.petitionId)
  const org = normalizeOrganizationAddress(input.organizationAddress)
  const pid = normalizePetitionIndex(input.petitionId)
  const by = normalizeOrganizationAddress(input.submittedBy)
  if (!key || !org || !pid || !by) {
    return {
      ok: false,
      error: "invalid organizationAddress, petitionId, or submittedBy",
      status: 400,
    }
  }

  const store = await readStore()
  if (store[key]?.submitted) {
    return { ok: false, error: "petition already submitted", status: 409 }
  }

  const submission: PetitionSubmission = {
    organizationAddress: org,
    petitionId: pid,
    submitted: true,
    submittedBy: by,
    submittedAt: Date.now(),
  }
  store[key] = submission
  await writeStore(store)
  return { ok: true, submission }
}

export async function getPetitionSubmission(input: {
  organizationAddress: string
  petitionId: string
}): Promise<PetitionSubmission | null> {
  const key = petitionStorageKey(input.organizationAddress, input.petitionId)
  if (!key) return null
  const store = await readStore()
  return store[key] ?? null
}

