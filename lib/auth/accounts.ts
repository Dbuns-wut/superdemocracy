import { createHash, randomBytes, randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"
import { ensureMigrated, hasDatabase, withDbClient } from "@/lib/db"
import { hashPassword, verifyPassword } from "./password"

const DATA_DIR = path.join(process.cwd(), "data")
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json")
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json")
const LOCK_FILE = path.join(DATA_DIR, "accounts.lock")

export type Account = {
  id: string
  email: string
  name: string
  passwordHash: string
  createdAt: number
}

type AccountBook = { byEmail: Record<string, Account> }
type SessionRow = { accountId: string; email: string; expiresAt: number }
type SessionBook = Record<string, SessionRow>

const SESSION_MS = 30 * 24 * 60 * 60 * 1000
const TAKEN = "An account with that email already exists. Log in."

let writeChain: Promise<void> = Promise.resolve()

function queue<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn)
  writeChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const handle = await fs.open(LOCK_FILE, "wx")
      try {
        return await fn()
      } finally {
        await handle.close()
        await fs.unlink(LOCK_FILE).catch(() => undefined)
      }
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException
      if (err.code !== "EEXIST") throw e
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
  }
  throw new Error("Could not save the account.")
}

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as unknown
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "ENOENT") return null
    throw e
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8")
  await fs.rename(tmp, file)
}

function isAccount(row: unknown): row is Account {
  if (!row || typeof row !== "object") return false
  const account = row as Account
  return typeof account.email === "string" && typeof account.passwordHash === "string" && typeof account.id === "string"
}

function accountBook(raw: unknown): AccountBook {
  if (Array.isArray(raw)) {
    const byEmail: Record<string, Account> = {}
    for (const row of raw) {
      if (!isAccount(row)) continue
      byEmail[row.email.trim().toLowerCase()] = { ...row, email: row.email.trim().toLowerCase() }
    }
    return { byEmail }
  }
  if (raw && typeof raw === "object" && "byEmail" in raw) {
    const byEmail = (raw as AccountBook).byEmail
    return { byEmail: byEmail && typeof byEmail === "object" ? byEmail : {} }
  }
  return { byEmail: {} }
}

function sessionBook(raw: unknown, accounts: AccountBook): SessionBook {
  if (Array.isArray(raw)) {
    const emailById = new Map(Object.values(accounts.byEmail).map((account) => [account.id, account.email]))
    const book: SessionBook = {}
    for (const row of raw) {
      if (!row || typeof row !== "object") continue
      const session = row as { tokenHash?: string; accountId?: string; expiresAt?: number }
      if (!session.tokenHash || !session.accountId || typeof session.expiresAt !== "number") continue
      const email = emailById.get(session.accountId)
      if (!email) continue
      book[session.tokenHash] = { accountId: session.accountId, email, expiresAt: session.expiresAt }
    }
    return book
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as SessionBook
  return {}
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url")
}

function publicAccount(row: { id: string; email: string; name: string; password_hash?: string; passwordHash?: string; created_at?: number; createdAt?: number }): Account {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash ?? row.password_hash ?? "",
    createdAt: row.createdAt ?? Number(row.created_at),
  }
}

async function insertSession(account: Account): Promise<string> {
  const token = newSessionToken()
  const hash = tokenHash(token)
  const expiresAt = Date.now() + SESSION_MS
  if (hasDatabase()) {
    await ensureMigrated()
    await withDbClient(async (client) => {
      await client.query(
        `INSERT INTO auth_sessions (token_hash, account_id, email, expires_at) VALUES ($1,$2,$3,$4)`,
        [hash, account.id, account.email, expiresAt]
      )
    })
    return token
  }
  const accounts = accountBook(await readJson(ACCOUNTS_FILE))
  const sessions = sessionBook(await readJson(SESSIONS_FILE), accounts)
  const now = Date.now()
  for (const key of Object.keys(sessions)) {
    if (sessions[key].expiresAt <= now) delete sessions[key]
  }
  sessions[hash] = { accountId: account.id, email: account.email, expiresAt }
  await writeJson(SESSIONS_FILE, sessions)
  return token
}

export async function createAccount(input: {
  name: string
  email: string
  password: string
}): Promise<{ ok: true; account: Account; token: string } | { ok: false; error: string; status: number }> {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  if (!name) return { ok: false, error: "Enter your name.", status: 400 }
  if (name.length > 80) return { ok: false, error: "Name is too long.", status: 400 }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter an email address.", status: 400 }
  }
  if (input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters.", status: 400 }
  }
  if (input.password.length > 200) {
    return { ok: false, error: "Password is too long.", status: 400 }
  }

  const passwordHash = await hashPassword(input.password)
  const account: Account = {
    id: randomUUID(),
    email,
    name,
    passwordHash,
    createdAt: Date.now(),
  }

  if (hasDatabase()) {
    await ensureMigrated()
    try {
      await withDbClient(async (client) => {
        await client.query(
          `INSERT INTO accounts (id, email, name, password_hash, created_at) VALUES ($1,$2,$3,$4,$5)`,
          [account.id, account.email, account.name, account.passwordHash, account.createdAt]
        )
      })
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err.code === "23505") return { ok: false, error: TAKEN, status: 409 }
      throw e
    }
    const token = await insertSession(account)
    return { ok: true, account, token }
  }

  return queue(() =>
    withLock(async () => {
      const book = accountBook(await readJson(ACCOUNTS_FILE))
      if (book.byEmail[email]) return { ok: false, error: TAKEN, status: 409 }
      book.byEmail[email] = account
      await writeJson(ACCOUNTS_FILE, book)
      const token = await insertSession(account)
      return { ok: true, account, token }
    })
  )
}

async function accountByEmail(email: string): Promise<Account | null> {
  if (hasDatabase()) {
    await ensureMigrated()
    return withDbClient(async (client) => {
      const res = await client.query(`SELECT id, email, name, password_hash, created_at FROM accounts WHERE email = $1`, [
        email,
      ])
      const row = res.rows[0]
      return row ? publicAccount(row) : null
    })
  }
  const book = accountBook(await readJson(ACCOUNTS_FILE))
  return book.byEmail[email] ?? null
}

export async function loginAccount(
  emailInput: string,
  password: string
): Promise<{ ok: true; account: Account; token: string } | { ok: false; error: string; status: number }> {
  const email = emailInput.trim().toLowerCase()
  const account = await accountByEmail(email)
  if (!account) {
    await hashPassword(password)
    return { ok: false, error: "Email or password is wrong.", status: 401 }
  }
  const match = await verifyPassword(password, account.passwordHash)
  if (!match) return { ok: false, error: "Email or password is wrong.", status: 401 }
  const token = await insertSession(account)
  return { ok: true, account, token }
}

export async function accountFromToken(token: string | undefined): Promise<Account | null> {
  if (!token) return null
  const hash = tokenHash(token)
  if (hasDatabase()) {
    await ensureMigrated()
    return withDbClient(async (client) => {
      const res = await client.query(
        `SELECT a.id, a.email, a.name, a.password_hash, a.created_at
         FROM auth_sessions s
         JOIN accounts a ON a.email = s.email
         WHERE s.token_hash = $1 AND s.expires_at > $2`,
        [hash, Date.now()]
      )
      const row = res.rows[0]
      return row ? publicAccount(row) : null
    })
  }
  const accounts = accountBook(await readJson(ACCOUNTS_FILE))
  const sessions = sessionBook(await readJson(SESSIONS_FILE), accounts)
  const session = sessions[hash]
  if (!session || session.expiresAt <= Date.now()) return null
  return accounts.byEmail[session.email] ?? null
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return
  const hash = tokenHash(token)
  if (hasDatabase()) {
    await ensureMigrated()
    await withDbClient(async (client) => {
      await client.query(`DELETE FROM auth_sessions WHERE token_hash = $1`, [hash])
    })
    return
  }
  await queue(() =>
    withLock(async () => {
      const accounts = accountBook(await readJson(ACCOUNTS_FILE))
      const sessions = sessionBook(await readJson(SESSIONS_FILE), accounts)
      delete sessions[hash]
      await writeJson(SESSIONS_FILE, sessions)
    })
  )
}

export async function changePassword(input: {
  token: string | undefined
  currentPassword: string
  newPassword: string
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (input.newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters.", status: 400 }
  }
  if (input.newPassword.length > 200) {
    return { ok: false, error: "Password is too long.", status: 400 }
  }
  const account = await accountFromToken(input.token)
  if (!account) return { ok: false, error: "Sign in again.", status: 401 }
  const currentOk = await verifyPassword(input.currentPassword, account.passwordHash)
  if (!currentOk) return { ok: false, error: "Current password is wrong.", status: 401 }
  const passwordHash = await hashPassword(input.newPassword)

  if (hasDatabase()) {
    await ensureMigrated()
    await withDbClient(async (client) => {
      await client.query(`UPDATE accounts SET password_hash = $1 WHERE email = $2`, [passwordHash, account.email])
    })
    return { ok: true }
  }

  return queue(() =>
    withLock(async () => {
      const book = accountBook(await readJson(ACCOUNTS_FILE))
      const current = book.byEmail[account.email]
      if (!current) return { ok: false, error: "Sign in again.", status: 401 }
      book.byEmail[account.email] = { ...current, passwordHash }
      await writeJson(ACCOUNTS_FILE, book)
      return { ok: true }
    })
  )
}

export const sessionCookie = {
  name: "sd_session",
  maxAge: SESSION_MS / 1000,
}
