function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "")
}

function serializeChoices(choices: unknown): string {
  if (!Array.isArray(choices)) return "[]"
  const normalized = [...new Set(choices.map((c) => Number(c)))]
    .filter((c) => Number.isInteger(c))
    .sort((a, b) => a - b)
  return JSON.stringify(normalized)
}

/** Stable JSON for bindable create/admin payloads (empty string omits Payload line). */
export function serializeActionPayload(payload: unknown): string {
  if (payload == null) return ""
  if (typeof payload === "string") return payload
  try {
    return JSON.stringify(payload)
  } catch {
    return ""
  }
}

export function buildSignedActionMessage(input: {
  action: string
  resourceId: string
  voterId: string
  choices?: unknown
  payload?: unknown
  nonce: string
  issuedAt: number
  expiresAt: number
  origin: string
}): string {
  const lines = [
    "SuperDemocracy Signed Action",
    `Domain: ${normalizeOrigin(input.origin)}`,
    `Action: ${input.action}`,
    `Resource: ${input.resourceId}`,
    `Voter: ${input.voterId}`,
    `Choices: ${serializeChoices(input.choices)}`,
  ]
  const payload = serializeActionPayload(input.payload)
  if (payload) {
    lines.push(`Payload: ${payload}`)
  }
  lines.push(
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expires At: ${input.expiresAt}`
  )
  return lines.join("\n")
}
