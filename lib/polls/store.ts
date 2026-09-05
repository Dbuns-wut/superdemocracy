import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { getAddress, isAddress } from "viem"
import { getCommunityOrgById } from "@/lib/community-orgs/store"
import { isOffchainOrgId, normalizeOrgId } from "@/lib/org-id"
import type { Poll, PollType, PollWithSummary, Vote } from "./types"

const DATA_DIR = path.join(process.cwd(), "data")
const POLLS_FILE = path.join(DATA_DIR, "polls.json")
const VOTES_FILE = path.join(DATA_DIR, "poll-votes.json")

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw) as T
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return fallback
    throw e
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8")
}

function normalizeVoterId(addr: string): `0x${string}` | null {
  const trimmed = typeof addr === "string" ? addr.trim() : ""
  if (!trimmed || !isAddress(trimmed)) return null
  try {
    return getAddress(trimmed as `0x${string}`)
  } catch {
    return null
  }
}

function normalizeOptions(options: unknown): string[] | null {
  if (!Array.isArray(options)) return null
  const cleaned = options
    .map((o) => (typeof o === "string" ? o.trim() : ""))
    .filter(Boolean)
  if (cleaned.length < 2) return null
  return cleaned
}

function validatePollType(t: unknown): t is PollType {
  return t === "single" || t === "multi"
}

export async function createPoll(input: {
  orgId: string
  title: string
  description: string
  options: unknown
  type: unknown
  startTime: number
  endTime: number
}): Promise<{ ok: true; poll: Poll } | { ok: false; error: string; status: number }> {
  const orgId = normalizeOrgId(input.orgId)
  if (!orgId) return { ok: false, error: "invalid orgId", status: 400 }
  if (isOffchainOrgId(orgId)) {
    const co = await getCommunityOrgById(orgId)
    if (!co) return { ok: false, error: "community org not found", status: 404 }
  }
  const title = input.title?.trim()
  if (!title) return { ok: false, error: "title required", status: 400 }
  const description = (input.description ?? "").trim()
  const options = normalizeOptions(input.options)
  if (!options) return { ok: false, error: "at least two options required", status: 400 }
  if (!validatePollType(input.type)) {
    return { ok: false, error: "type must be single or multi", status: 400 }
  }
  const startTime = Number(input.startTime)
  const endTime = Number(input.endTime)
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return { ok: false, error: "invalid start/end time", status: 400 }
  }

  const polls = await readJsonFile<Poll[]>(POLLS_FILE, [])
  const poll: Poll = {
    id: randomUUID(),
    orgId,
    title,
    description,
    options,
    type: input.type,
    startTime,
    endTime,
    createdAt: Date.now(),
  }
  polls.push(poll)
  await writeJsonFile(POLLS_FILE, polls)
  return { ok: true, poll }
}

export async function votePoll(input: {
  pollId: string
  voterId: string
  choices: unknown
}): Promise<{ ok: true; vote: Vote } | { ok: false; error: string; status: number }> {
  const pollId = typeof input.pollId === "string" ? input.pollId.trim() : ""
  if (!pollId) return { ok: false, error: "pollId required", status: 400 }
  const voterId = normalizeVoterId(input.voterId)
  if (!voterId) return { ok: false, error: "invalid voterId", status: 400 }

  const polls = await readJsonFile<Poll[]>(POLLS_FILE, [])
  const poll = polls.find((p) => p.id === pollId)
  if (!poll) return { ok: false, error: "poll not found", status: 404 }

  const now = Date.now()
  if (now < poll.startTime) return { ok: false, error: "poll has not started", status: 400 }
  if (now > poll.endTime) return { ok: false, error: "poll has ended", status: 400 }

  if (!Array.isArray(input.choices) || input.choices.length === 0) {
    return { ok: false, error: "choices required", status: 400 }
  }
  const choices = [...new Set(input.choices.map((n) => Number(n)))]
  const valid = choices.every((n) => Number.isInteger(n) && n >= 0 && n < poll.options.length)
  if (!valid) return { ok: false, error: "invalid choice index", status: 400 }
  if (poll.type === "single" && choices.length !== 1) {
    return { ok: false, error: "single-choice poll requires exactly one choice", status: 400 }
  }

  const votes = await readJsonFile<Vote[]>(VOTES_FILE, [])
  const existing = votes.find(
    (v) => v.pollId === pollId && v.voterId.toLowerCase() === voterId.toLowerCase()
  )
  if (existing) {
    existing.choices = choices
    existing.timestamp = now
    await writeJsonFile(VOTES_FILE, votes)
    return { ok: true, vote: existing }
  }

  const vote: Vote = {
    pollId,
    voterId,
    choices,
    timestamp: now,
  }
  votes.push(vote)
  await writeJsonFile(VOTES_FILE, votes)
  return { ok: true, vote }
}

export async function getPollById(pollId: string): Promise<{
  poll: Poll | null
  votes: Vote[]
  tally: number[]
}> {
  const id = pollId.trim()
  if (!id) return { poll: null, votes: [], tally: [] }
  const polls = await readJsonFile<Poll[]>(POLLS_FILE, [])
  const poll = polls.find((p) => p.id === id) ?? null
  if (!poll) return { poll: null, votes: [], tally: [] }
  const votes = (await readJsonFile<Vote[]>(VOTES_FILE, [])).filter((v) => v.pollId === id)
  const tally = new Array(poll.options.length).fill(0)
  for (const v of votes) {
    for (const c of v.choices) tally[c] += 1
  }
  return { poll, votes, tally }
}

export async function listPollsByOrg(orgId: string): Promise<Poll[]> {
  const org = normalizeOrgId(orgId)
  if (!org) return []
  const o = org.toLowerCase()
  const polls = await readJsonFile<Poll[]>(POLLS_FILE, [])
  return polls
    .filter((p) => p.orgId.toLowerCase() === o)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function listPollsByOrgWithSummary(
  orgId: string,
  voterIdInput?: string | null
): Promise<PollWithSummary[]> {
  const org = normalizeOrgId(orgId)
  if (!org) return []
  const voterNorm = voterIdInput ? normalizeVoterId(voterIdInput) : null
  const polls = await readJsonFile<Poll[]>(POLLS_FILE, [])
  const allVotes = await readJsonFile<Vote[]>(VOTES_FILE, [])
  const o = org.toLowerCase()
  const orgPolls = polls
    .filter((p) => p.orgId.toLowerCase() === o)
    .sort((a, b) => b.createdAt - a.createdAt)

  return orgPolls.map((poll) => {
    const pollVotesList = allVotes.filter((v) => v.pollId === poll.id)
    const tally = new Array(poll.options.length).fill(0)
    for (const v of pollVotesList) {
      for (const c of v.choices) tally[c] += 1
    }
    let currentUserChoices: number[] | null = null
    if (voterNorm) {
      const mine = pollVotesList.find((v) => v.voterId.toLowerCase() === voterNorm.toLowerCase())
      if (mine) currentUserChoices = [...mine.choices]
    }
    return {
      ...poll,
      tally,
      totalVotes: pollVotesList.length,
      currentUserChoices,
    }
  })
}

