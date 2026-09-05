import { promises as fs } from "fs"
import path from "path"
import { getAddress, isAddress } from "viem"
import { normalizeCreator } from "@/lib/community-orgs/store"

const DATA_DIR = path.join(process.cwd(), "data")

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

function pushAddr(set: Set<string>, raw: string | undefined | null) {
  const n = normalizeCreator(String(raw ?? ""))
  if (n) set.add(n)
}

/**
 * Best-effort directory of wallet addresses seen in local dev data (for invite search).
 */
export async function searchKnownWallets(query: string, limit: number): Promise<string[]> {
  const q = query.trim().toLowerCase()
  const max = Math.min(Math.max(limit, 1), 100)
  const seen = new Set<string>()

  const orgs = await readJson<unknown[]>(path.join(DATA_DIR, "community-orgs.json"), [])
  for (const o of orgs) {
    if (!o || typeof o !== "object") continue
    const c = (o as { creatorAddress?: string }).creatorAddress
    pushAddr(seen, c)
  }

  const members = await readJson<Record<string, unknown>>(
    path.join(DATA_DIR, "community-org-members.json"),
    {}
  )
  for (const list of Object.values(members)) {
    if (!Array.isArray(list)) continue
    for (const a of list) pushAddr(seen, String(a))
  }

  const apps = await readJson<unknown[]>(
    path.join(DATA_DIR, "community-applications.json"),
    []
  )
  for (const a of apps) {
    if (!a || typeof a !== "object") continue
    const u = (a as { user?: string }).user
    pushAddr(seen, u)
  }

  const invites = await readJson<unknown[]>(path.join(DATA_DIR, "member-invites.json"), [])
  for (const i of invites) {
    if (!i || typeof i !== "object") continue
    const row = i as { invitee?: string; inviter?: string }
    pushAddr(seen, row.invitee)
    pushAddr(seen, row.inviter)
  }

  const sorted = [...seen].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  )
  const filtered = q
    ? sorted.filter(
        (addr) =>
          addr.toLowerCase().includes(q) ||
          addr.replace(/^0x/i, "").toLowerCase().includes(q.replace(/^0x/i, ""))
      )
    : sorted

  let out = filtered.slice(0, max)

  if (q) {
    const tryAddr = q.startsWith("0x") ? q : `0x${q}`
    if (isAddress(tryAddr as `0x${string}`)) {
      try {
        const a = getAddress(tryAddr as `0x${string}`)
        if (!out.some((x) => x.toLowerCase() === a.toLowerCase())) {
          out = [a, ...out].slice(0, max)
        }
      } catch {
        /* ignore */
      }
    }
  }

  return out
}
