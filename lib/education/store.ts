import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { getAddress, isAddress } from "viem"
import type { ReferendumEducation } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = path.join(DATA_DIR, "referendum-education.json")

type Store = Record<string, ReferendumEducation>

function normalizeAddress(input: string): string | null {
  const t = input.trim()
  if (!t || !isAddress(t)) return null
  try {
    return getAddress(t as `0x${string}`)
  } catch {
    return null
  }
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

function defaultEducation(referendumAddress: string): ReferendumEducation {
  return {
    referendumAddress,
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
    updatedAt: Date.now(),
  }
}

export async function getEducation(
  referendumAddress: string
): Promise<ReferendumEducation | null> {
  const addr = normalizeAddress(referendumAddress)
  if (!addr) return null
  const store = await readStore()
  const existing = store[addr.toLowerCase()]
  if (existing) return existing
  const seeded = defaultEducation(addr)
  store[addr.toLowerCase()] = seeded
  await writeStore(store)
  return seeded
}

export async function setEducation(input: {
  referendumAddress: string
  perspectives: { title: string; body: string }[]
}): Promise<
  { ok: true; education: ReferendumEducation } | { ok: false; error: string; status: number }
> {
  const addr = normalizeAddress(input.referendumAddress)
  if (!addr) return { ok: false, error: "invalid referendum address", status: 400 }
  const perspectives = input.perspectives
    .map((p) => ({
      id: randomUUID(),
      title: String(p.title ?? "").trim(),
      body: String(p.body ?? "").trim(),
    }))
    .filter((p) => p.title && p.body)
  if (perspectives.length < 1) {
    return { ok: false, error: "at least one perspective required", status: 400 }
  }
  const education: ReferendumEducation = {
    referendumAddress: addr,
    perspectives,
    updatedAt: Date.now(),
  }
  const store = await readStore()
  store[addr.toLowerCase()] = education
  await writeStore(store)
  return { ok: true, education }
}
