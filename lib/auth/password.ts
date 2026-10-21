import { randomBytes, scrypt, timingSafeEqual } from "crypto"

const N = 16384
const r = 8
const p = 1
const KEYLEN = 32

function scryptKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, { N, r, p }, (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })
}

/** scrypt hash. The password itself is never stored. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptKey(password, salt)
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$")
  if (parts.length !== 6 || parts[0] !== "scrypt") return false
  const n = Number(parts[1])
  const rr = Number(parts[2])
  const pp = Number(parts[3])
  if (n !== N || rr !== r || pp !== p) return false
  const salt = Buffer.from(parts[4], "base64")
  const expected = Buffer.from(parts[5], "base64")
  if (salt.length === 0 || expected.length !== KEYLEN) return false
  const actual = await scryptKey(password, salt)
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
