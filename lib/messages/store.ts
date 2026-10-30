import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { isSameParticipant, normalizeParticipantId } from "@/lib/participant-id"

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = path.join(DATA_DIR, "direct-messages.json")

export type DirectMessage = {
  id: string
  /** Account ids. */
  from: string
  to: string
  body: string
  orgId: string | null
  createdAt: number
  readAt: number | null
}

type Store = { messages: DirectMessage[] }

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    const parsed = JSON.parse(raw) as Store
    return Array.isArray(parsed.messages) ? parsed : { messages: [] }
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return { messages: [] }
    throw e
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf8")
}

export async function listMessagesForUser(accountId: string): Promise<DirectMessage[]> {
  const user = normalizeParticipantId(accountId)
  if (!user) return []
  const store = await readStore()
  return store.messages
    .filter((m) => isSameParticipant(m.from, user) || isSameParticipant(m.to, user))
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function sendDirectMessage(input: {
  from: string
  to: string
  body: string
  orgId?: string | null
}): Promise<{ ok: true; message: DirectMessage } | { ok: false; error: string; status: number }> {
  const from = normalizeParticipantId(input.from)
  const to = normalizeParticipantId(input.to)
  if (!from) return { ok: false, error: "Sign in first.", status: 401 }
  if (!to) return { ok: false, error: "choose a recipient", status: 400 }
  if (isSameParticipant(from, to)) {
    return { ok: false, error: "cannot message yourself", status: 400 }
  }
  const body = input.body.trim()
  if (!body) return { ok: false, error: "message required", status: 400 }
  if (body.length > 4000) return { ok: false, error: "message too long", status: 400 }

  const message: DirectMessage = {
    id: randomUUID(),
    from,
    to,
    body,
    orgId: input.orgId?.trim() || null,
    createdAt: Date.now(),
    readAt: null,
  }
  const store = await readStore()
  store.messages.push(message)
  await writeStore(store)
  return { ok: true, message }
}
