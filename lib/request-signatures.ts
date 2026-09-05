import { promises as fs } from "fs"
import path from "path"
import { getAddress, isAddress, recoverMessageAddress } from "viem"
import { buildSignedActionMessage } from "@/lib/signed-action-message"
import { ensureMigrated, hasDatabase, withDbClient } from "@/lib/db"

const DATA_DIR = path.join(process.cwd(), "data")
const NONCE_STORE_FILE = path.join(DATA_DIR, "signed-request-nonces.json")
const MAX_TTL_MS = 10 * 60 * 1000

type UsedNonce = {
  nonce: string
  signer: string
  action: string
  expiresAt: number
}

type NonceStore = {
  entries: UsedNonce[]
}

type VerifyInput = {
  action: string
  resourceId: string
  voterId: string
  choices?: unknown
  payload?: unknown
  nonce: string
  issuedAt: number
  expiresAt: number
  signature: string
  origin: string
}

export type VerifySignedActionResult =
  | { ok: true; signer: string }
  | { ok: false; error: string; status: number }

function normalizeAddress(input: string): string | null {
  if (!isAddress(input)) return null
  try {
    return getAddress(input)
  } catch {
    return null
  }
}

function normalizeNonce(input: string): string {
  return typeof input === "string" ? input.trim() : ""
}

async function readNonceStoreJson(): Promise<NonceStore> {
  try {
    const raw = await fs.readFile(NONCE_STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as NonceStore
    if (!Array.isArray(parsed.entries)) return { entries: [] }
    return parsed
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return { entries: [] }
    throw e
  }
}

async function writeNonceStoreJson(store: NonceStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(NONCE_STORE_FILE, JSON.stringify(store, null, 2), "utf8")
}

async function consumeNonceJson(input: {
  nonce: string
  signer: string
  action: string
  expiresAt: number
}): Promise<{ ok: true } | { ok: false }> {
  const now = Date.now()
  const store = await readNonceStoreJson()
  const pruned = store.entries.filter((entry) => entry.expiresAt > now)
  const nonceKey = input.nonce.toLowerCase()
  const signer = input.signer.toLowerCase()
  const action = input.action.toLowerCase()
  const used = pruned.some(
    (entry) =>
      entry.nonce.toLowerCase() === nonceKey &&
      entry.signer.toLowerCase() === signer &&
      entry.action.toLowerCase() === action
  )
  if (used) return { ok: false }

  pruned.push({
    nonce: input.nonce,
    signer: input.signer,
    action: input.action,
    expiresAt: input.expiresAt,
  })
  await writeNonceStoreJson({ entries: pruned })
  return { ok: true }
}

async function consumeNoncePg(input: {
  nonce: string
  signer: string
  action: string
  expiresAt: number
}): Promise<{ ok: true } | { ok: false }> {
  await ensureMigrated()
  return withDbClient(async (client) => {
    const now = Date.now()
    await client.query(`DELETE FROM signed_nonces WHERE expires_at <= $1`, [now])
    const existing = await client.query(
      `SELECT 1 FROM signed_nonces
       WHERE LOWER(nonce) = LOWER($1) AND LOWER(signer) = LOWER($2) AND LOWER(action) = LOWER($3)`,
      [input.nonce, input.signer, input.action]
    )
    if (existing.rowCount && existing.rowCount > 0) return { ok: false }
    await client.query(
      `INSERT INTO signed_nonces (nonce, signer, action, expires_at) VALUES ($1,$2,$3,$4)`,
      [input.nonce, input.signer, input.action, input.expiresAt]
    )
    return { ok: true }
  })
}

async function consumeNonce(input: {
  nonce: string
  signer: string
  action: string
  expiresAt: number
}): Promise<{ ok: true } | { ok: false }> {
  if (hasDatabase()) return consumeNoncePg(input)
  return consumeNonceJson(input)
}

export async function verifySignedAction(input: VerifyInput): Promise<VerifySignedActionResult> {
  const voterId = normalizeAddress(input.voterId)
  if (!voterId) return { ok: false, error: "invalid voterId", status: 400 }
  const nonce = normalizeNonce(input.nonce)
  if (!nonce || nonce.length < 8) {
    return { ok: false, error: "invalid nonce", status: 400 }
  }

  const now = Date.now()
  if (!Number.isFinite(input.issuedAt) || !Number.isFinite(input.expiresAt)) {
    return { ok: false, error: "invalid signature timestamps", status: 400 }
  }
  if (input.expiresAt <= input.issuedAt) {
    return { ok: false, error: "invalid signature window", status: 400 }
  }
  if (input.expiresAt - input.issuedAt > MAX_TTL_MS) {
    return { ok: false, error: "signature window too large", status: 400 }
  }
  if (now < input.issuedAt - 30_000 || now > input.expiresAt) {
    return { ok: false, error: "signature expired or not yet valid", status: 401 }
  }

  const message = buildSignedActionMessage({
    action: input.action,
    resourceId: input.resourceId,
    voterId,
    choices: input.choices ?? [],
    payload: input.payload,
    nonce,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    origin: input.origin,
  })

  let recovered: string
  try {
    recovered = await recoverMessageAddress({
      message,
      signature: input.signature as `0x${string}`,
    })
  } catch {
    return { ok: false, error: "invalid signature", status: 401 }
  }

  const signer = normalizeAddress(recovered)
  if (!signer || signer.toLowerCase() !== voterId.toLowerCase()) {
    return { ok: false, error: "signature does not match voterId", status: 401 }
  }

  const nonceResult = await consumeNonce({
    nonce,
    signer,
    action: input.action,
    expiresAt: input.expiresAt,
  })
  if (!nonceResult.ok) {
    return { ok: false, error: "nonce already used", status: 409 }
  }

  return { ok: true, signer }
}
