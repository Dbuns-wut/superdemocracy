import { buildSignedActionMessage } from "@/lib/signed-action-message"

export type SignOffchainActionInput = {
  action: string
  resourceId: string
  voterId: string
  choices?: number[]
  payload?: unknown
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>
}

export type SignedOffchainFields = {
  nonce: string
  issuedAt: number
  expiresAt: number
  signature: string
}

/** Client helper: one straight line — build message → wallet sign → return auth fields. */
export async function signOffchainAction(
  input: SignOffchainActionInput
): Promise<SignedOffchainFields> {
  const issuedAt = Date.now()
  const expiresAt = issuedAt + 5 * 60 * 1000
  const nonce = crypto.randomUUID()
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const message = buildSignedActionMessage({
    action: input.action,
    resourceId: input.resourceId,
    voterId: input.voterId,
    choices: input.choices ?? [],
    payload: input.payload,
    nonce,
    issuedAt,
    expiresAt,
    origin,
  })
  const signature = await input.signMessageAsync({ message })
  return { nonce, issuedAt, expiresAt, signature }
}
