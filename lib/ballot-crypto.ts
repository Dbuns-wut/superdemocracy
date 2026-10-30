import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const ALGO = "aes-256-gcm"
const IV_BYTES = 12

function resolveKeyMaterial(): Buffer {
  const raw = process.env.BALLOT_ENCRYPTION_KEY?.trim()
  if (raw) {
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex")
    return createHash("sha256").update(raw).digest()
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("BALLOT_ENCRYPTION_KEY is required in production")
  }
  return createHash("sha256").update("superdemocracy-dev-ballot-key").digest()
}

export type EncryptedBallotPayload = {
  ciphertext: string
  iv: string
  authTag: string
}

export function encryptBallotChoices(choices: number[]): EncryptedBallotPayload {
  const key = resolveKeyMaterial()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, key, iv)
  const plaintext = JSON.stringify({ choices })
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  }
}

/** Packed `iv || authTag || ciphertext` for compact storage. The choice is not plaintext. */
export function sealBallotChoices(choices: number[]): `0x${string}` {
  const payload = encryptBallotChoices(choices)
  const packed = Buffer.concat([
    Buffer.from(payload.iv, "base64"),
    Buffer.from(payload.authTag, "base64"),
    Buffer.from(payload.ciphertext, "base64"),
  ])
  return `0x${packed.toString("hex")}`
}

export function openSealedBallot(sealed: string): number[] {
  const hex = sealed.startsWith("0x") ? sealed.slice(2) : sealed
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error("sealed ballot is not hex")
  }
  const buf = Buffer.from(hex, "hex")
  if (buf.length < IV_BYTES + 16) throw new Error("sealed ballot is too short")
  return decryptBallotChoices({
    iv: buf.subarray(0, IV_BYTES).toString("base64"),
    authTag: buf.subarray(IV_BYTES, IV_BYTES + 16).toString("base64"),
    ciphertext: buf.subarray(IV_BYTES + 16).toString("base64"),
  })
}

export function decryptBallotChoices(payload: EncryptedBallotPayload): number[] {
  const key = resolveKeyMaterial()
  const iv = Buffer.from(payload.iv, "base64")
  const authTag = Buffer.from(payload.authTag, "base64")
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ])
  const parsed = JSON.parse(decrypted.toString("utf8")) as { choices?: unknown }
  if (!Array.isArray(parsed.choices)) return []
  return parsed.choices.map((c) => Number(c)).filter((c) => Number.isInteger(c))
}
