import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"

const PURPOSE = Buffer.from("superdemocracy-account-wallet-v1")
const N = 16384
const r = 8
const p = 1

function derive(password: string, salt: Buffer): Promise<Buffer> {
  const material = Buffer.concat([PURPOSE, salt])
  return new Promise((resolve, reject) => {
    scrypt(password, material, 32, { N, r, p }, (err, key) => {
      if (err) reject(err)
      else resolve(key)
    })
  })
}

/** One address per account. The raw key is not what gets stored. */
export function newAccountWallet(): { privateKey: `0x${string}`; address: `0x${string}` } {
  const privateKey = generatePrivateKey()
  const address = privateKeyToAccount(privateKey).address
  return { privateKey, address }
}

export async function encryptPrivateKey(privateKey: string, password: string): Promise<string> {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = await derive(password, salt)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const enc = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return ["v1", salt.toString("base64"), iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join("$")
}

export async function decryptPrivateKey(stored: string, password: string): Promise<`0x${string}`> {
  const parts = stored.split("$")
  if (parts.length !== 5 || parts[0] !== "v1") {
    throw new Error("Could not open this account.")
  }
  const salt = Buffer.from(parts[1], "base64")
  const iv = Buffer.from(parts[2], "base64")
  const tag = Buffer.from(parts[3], "base64")
  const data = Buffer.from(parts[4], "base64")
  if (salt.length === 0 || iv.length === 0 || tag.length === 0 || data.length === 0) {
    throw new Error("Could not open this account.")
  }
  const key = await derive(password, salt)
  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8") as `0x${string}`
  privateKeyToAccount(plain)
  return plain
}
