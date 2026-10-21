import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"

const DATA_DIR = path.join(process.cwd(), "data")
const FILE = path.join(DATA_DIR, "messageboard-posts.json")

export type MessageboardReaction = "like" | "love" | "laugh" | "disagree"

export type MessageboardPost = {
  id: string
  user: string
  org: string
  text: string
  timestamp: number
  reactions?: {
    like?: string[]
    love?: string[]
    laugh?: string[]
    disagree?: string[]
  }
}

async function readPosts(): Promise<MessageboardPost[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8")
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as MessageboardPost[]) : []
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return []
    throw e
  }
}

async function writePosts(posts: MessageboardPost[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(posts, null, 2), "utf8")
}

export async function listMessageboardPosts(org: string): Promise<MessageboardPost[]> {
  const key = org.trim().toLowerCase()
  if (!key) return []
  const posts = await readPosts()
  return posts
    .filter((p) => String(p.org ?? "").toLowerCase() === key)
    .sort((a, b) => b.timestamp - a.timestamp)
}

export async function createMessageboardPost(input: {
  user: string
  org: string
  text: string
}): Promise<{ ok: true; post: MessageboardPost } | { ok: false; error: string; status: number }> {
  const user = String(input.user ?? "").trim()
  const org = String(input.org ?? "").trim()
  const text = String(input.text ?? "").trim()
  if (!user) return { ok: false, error: "user required", status: 400 }
  if (!org) return { ok: false, error: "org required", status: 400 }
  if (!text) return { ok: false, error: "text required", status: 400 }
  const post: MessageboardPost = {
    id: randomUUID(),
    user,
    org,
    text,
    timestamp: Date.now(),
    reactions: { like: [], love: [], laugh: [], disagree: [] },
  }
  const posts = await readPosts()
  posts.unshift(post)
  await writePosts(posts)
  return { ok: true, post }
}

const REACTIONS: MessageboardReaction[] = ["like", "love", "laugh", "disagree"]

function isReaction(v: unknown): v is MessageboardReaction {
  return typeof v === "string" && REACTIONS.includes(v as MessageboardReaction)
}

export async function reactToMessageboardPost(input: {
  postId: string
  user: string
  reaction: unknown
  org: string
}): Promise<{ ok: true; post: MessageboardPost } | { ok: false; error: string; status: number }> {
  const postId = String(input.postId ?? "").trim()
  const user = String(input.user ?? "").trim()
  const org = String(input.org ?? "").trim().toLowerCase()
  if (!postId) return { ok: false, error: "postId required", status: 400 }
  if (!user) return { ok: false, error: "user required", status: 400 }
  if (!isReaction(input.reaction)) return { ok: false, error: "invalid reaction", status: 400 }
  const posts = await readPosts()
  const idx = posts.findIndex((p) => p.id === postId)
  if (idx < 0) return { ok: false, error: "post not found", status: 404 }
  const post = posts[idx]
  if (org && String(post.org).toLowerCase() !== org) {
    return { ok: false, error: "post not found", status: 404 }
  }
  const reactions = {
    like: [...(post.reactions?.like ?? [])],
    love: [...(post.reactions?.love ?? [])],
    laugh: [...(post.reactions?.laugh ?? [])],
    disagree: [...(post.reactions?.disagree ?? [])],
  }
  const list = reactions[input.reaction]
  const low = user.toLowerCase()
  const next = list.some((a) => a.toLowerCase() === low)
    ? list.filter((a) => a.toLowerCase() !== low)
    : [...list, user]
  reactions[input.reaction] = next
  const updated: MessageboardPost = { ...post, reactions }
  posts[idx] = updated
  await writePosts(posts)
  return { ok: true, post: updated }
}
