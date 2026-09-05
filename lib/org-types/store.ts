import { promises as fs } from "fs"
import path from "path"
import { getAddress, isAddress } from "viem"

export type OrgType = "ON_CHAIN" | "OFF_CHAIN"

type OrgTypesMap = Record<string, OrgType>

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "org-types.json")

function normalizeOrg(orgId: string): string | null {
  const t = orgId?.trim()
  if (!t || !isAddress(t)) return null
  try {
    return getAddress(t as `0x${string}`)
  } catch {
    return null
  }
}

async function readStore(): Promise<OrgTypesMap> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as OrgTypesMap
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return {}
    throw e
  }
}

async function writeStore(store: OrgTypesMap): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8")
}

export async function setOrgType(orgId: string, type: OrgType): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const org = normalizeOrg(orgId)
  if (!org) return { ok: false, error: "invalid orgId", status: 400 }
  if (type !== "ON_CHAIN" && type !== "OFF_CHAIN") {
    return { ok: false, error: "invalid type", status: 400 }
  }
  const store = await readStore()
  store[org] = type
  await writeStore(store)
  return { ok: true }
}

export async function getOrgType(orgId: string): Promise<OrgType> {
  const org = normalizeOrg(orgId)
  if (!org) return "ON_CHAIN"
  const store = await readStore()
  return store[org] ?? "ON_CHAIN"
}

