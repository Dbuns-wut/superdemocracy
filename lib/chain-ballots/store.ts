import { createHash } from "crypto"
import { promises as fs } from "fs"
import path from "path"
import { encryptBallotChoices, decryptBallotChoices, type EncryptedBallotPayload } from "@/lib/ballot-crypto"

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = path.join(DATA_DIR, "chain-secret-ballots.json")

type SecretBox = {
  nullifiers: string[]
  ballots: EncryptedBallotPayload[]
}

type Store = Record<string, SecretBox>

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    const parsed = JSON.parse(raw) as Store
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return {}
    throw e
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(store), "utf8")
}

export function secretBallotNullifier(signature: string): string {
  return createHash("sha256").update(signature).digest("hex")
}

/** Stores the choice with no voter address. A repeated signature is rejected. */
export async function addSecretChainBallot(input: {
  referendum: string
  signature: string
  choices: number[]
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const referendum = input.referendum.trim().toLowerCase()
  if (!referendum) return { ok: false, error: "referendum required", status: 400 }
  const nullifier = secretBallotNullifier(input.signature)
  const store = await readStore()
  const box = store[referendum] ?? { nullifiers: [], ballots: [] }
  if (box.nullifiers.includes(nullifier)) {
    return { ok: false, error: "vote already counted", status: 409 }
  }
  box.nullifiers.push(nullifier)
  box.ballots.push(encryptBallotChoices(input.choices))
  store[referendum] = box
  await writeStore(store)
  return { ok: true }
}

/** Public totals only. No voter ids and no individual choices. */
export async function secretChainTally(referendum: string, optionCount: number): Promise<number[]> {
  const key = referendum.trim().toLowerCase()
  const store = await readStore()
  const counts = Array.from({ length: optionCount }, () => 0)
  const box = store[key]
  if (!box) return counts
  for (const ballot of box.ballots) {
    const choices = decryptBallotChoices(ballot)
    const first = choices[0]
    if (Number.isInteger(first) && first >= 0 && first < optionCount) counts[first] += 1
  }
  return counts
}
