import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"

const DATA_DIR = path.join(process.cwd(), "data")
const UPLOAD_DIR = path.join(DATA_DIR, "uploads")
const INDEX_FILE = path.join(DATA_DIR, "join-files.json")

export type JoinFileRecord = {
  id: string
  originalName: string
  mime: string
  size: number
  createdAt: number
}

type Index = Record<string, JoinFileRecord>

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
])
const MAX_BYTES = 5 * 1024 * 1024

async function readIndex(): Promise<Index> {
  try {
    const raw = await fs.readFile(INDEX_FILE, "utf8")
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Index
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return {}
    throw e
  }
}

async function writeIndex(index: Index): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2), "utf8")
}

export async function saveJoinFile(input: {
  originalName: string
  mime: string
  bytes: Buffer
}): Promise<{ ok: true; file: JoinFileRecord } | { ok: false; error: string; status: number }> {
  const mime = String(input.mime || "").toLowerCase()
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false, error: "file type must be an image or PDF", status: 400 }
  }
  if (input.bytes.length < 1) {
    return { ok: false, error: "empty file", status: 400 }
  }
  if (input.bytes.length > MAX_BYTES) {
    return { ok: false, error: "file too large (max 5 MB)", status: 400 }
  }
  const id = randomUUID()
  const record: JoinFileRecord = {
    id,
    originalName: String(input.originalName || "upload").slice(0, 200),
    mime,
    size: input.bytes.length,
    createdAt: Date.now(),
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  await fs.writeFile(path.join(UPLOAD_DIR, id), input.bytes)
  const index = await readIndex()
  index[id] = record
  await writeIndex(index)
  return { ok: true, file: record }
}

export async function getJoinFile(
  id: string
): Promise<{ record: JoinFileRecord; bytes: Buffer } | null> {
  const t = id?.trim()
  if (!t) return null
  const index = await readIndex()
  const record = index[t]
  if (!record) return null
  try {
    const bytes = await fs.readFile(path.join(UPLOAD_DIR, t))
    return { record, bytes }
  } catch {
    return null
  }
}
