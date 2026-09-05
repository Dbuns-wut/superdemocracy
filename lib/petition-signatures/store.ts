import { promises as fs } from "fs"
import path from "path"
import { getAddress, isAddress } from "viem"
import {
  normalizeOrganizationAddress,
  normalizePetitionIndex,
  petitionStorageKey,
} from "./key"
import type { PetitionSignature } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "petition-signatures.json")

type PersistedShape = Record<string, PetitionSignature[]>

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

function normalizeSigner(signer: string): `0x${string}` | null {
  if (!signer || typeof signer !== "string" || !isAddress(signer)) return null
  try {
    return getAddress(signer as `0x${string}`)
  } catch {
    return null
  }
}

export type AddSignatureResult =
  | { ok: true; signature: PetitionSignature }
  | { ok: false; error: string; status: number }

export async function addSignature(input: {
  organizationAddress: string
  petitionId: string
  signer: string
}): Promise<AddSignatureResult> {
  const key = petitionStorageKey(
    input.organizationAddress,
    input.petitionId
  )
  const org = normalizeOrganizationAddress(input.organizationAddress)
  const pid = normalizePetitionIndex(input.petitionId)

  if (!key || !org || !pid) {
    return {
      ok: false,
      error:
        "invalid organizationAddress or petitionId (expect 0x org and decimal petition index)",
      status: 400,
    }
  }

  const signer = normalizeSigner(input.signer)
  if (!signer) {
    return { ok: false, error: "invalid signer address", status: 400 }
  }

  const store = await readStore()
  const list = store[key] ?? []
  const dup = list.some((s) => s.signer.toLowerCase() === signer.toLowerCase())
  if (dup) {
    return {
      ok: false,
      error: "signer already signed this petition",
      status: 409,
    }
  }

  const signature: PetitionSignature = {
    organizationAddress: org,
    petitionId: pid,
    signer,
    timestamp: Date.now(),
  }

  store[key] = [...list, signature]
  await writeStore(store)

  return { ok: true, signature }
}

export async function getSignaturesForPetition(input: {
  organizationAddress: string
  petitionId: string
}): Promise<{ signatures: PetitionSignature[]; count: number }> {
  const key = petitionStorageKey(
    input.organizationAddress,
    input.petitionId
  )
  if (!key) {
    return { signatures: [], count: 0 }
  }
  const store = await readStore()
  const signatures = store[key] ?? []
  return { signatures, count: signatures.length }
}
