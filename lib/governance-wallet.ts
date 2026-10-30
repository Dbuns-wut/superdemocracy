"use client"

import { createWalletClient, custom, type Abi, type Address, type Hex } from "viem"
import { anvil } from "@/lib/chain"
import { inAppProvider } from "@/lib/in-app-account"

export class GovernanceWalletError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GovernanceWalletError"
  }
}

type Snapshot = {
  address: Address | null
  available: boolean
}

type Listener = () => void

let current: Address | null = null
let bootstrapped = false
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function governanceSnapshot(): Snapshot {
  return { address: current, available: true }
}

export function subscribeGovernanceWallet(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function firstAddress(accounts: unknown): Address | null {
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") return null
  return accounts[0] as Address
}

/** The signed-in account. A browser extension is not another address for this account. */
export async function refreshGovernanceWallet(): Promise<Snapshot> {
  try {
    const accounts = await inAppProvider().request({ method: "eth_accounts" })
    current = firstAddress(accounts)
  } catch {
    current = null
  }
  emit()
  return governanceSnapshot()
}

export function bootstrapGovernanceWallet(): void {
  if (bootstrapped) return
  bootstrapped = true
  void refreshGovernanceWallet()
}

export async function connectGovernanceWallet(): Promise<Address> {
  const snap = await refreshGovernanceWallet()
  if (!snap.address) throw new GovernanceWalletError("Sign in first.")
  return snap.address
}

function walletClient(account: Address) {
  return createWalletClient({
    account,
    chain: anvil,
    transport: custom(inAppProvider()),
  })
}

export async function writeGovernanceContract(input: {
  address: Address
  abi: Abi | readonly unknown[]
  functionName: string
  args?: readonly unknown[]
  account?: Address
}): Promise<Hex> {
  const account = input.account ?? current ?? (await connectGovernanceWallet())
  const client = walletClient(account)
  return client.writeContract({
    address: input.address,
    abi: input.abi as Abi,
    functionName: input.functionName,
    args: input.args,
    account,
    chain: anvil,
  } as never)
}

export async function signGovernanceMessage(message: string): Promise<Hex> {
  const account = current ?? (await connectGovernanceWallet())
  const client = walletClient(account)
  return client.signMessage({ account, message })
}

function errorText(err: unknown): string {
  const parts: string[] = []
  const seen = new Set<unknown>()
  let cursor: unknown = err
  while (cursor && typeof cursor === "object" && !seen.has(cursor)) {
    seen.add(cursor)
    const node = cursor as {
      errorName?: string
      shortMessage?: string
      message?: string
      cause?: unknown
    }
    if (typeof node.errorName === "string") parts.push(node.errorName)
    if (typeof node.shortMessage === "string") parts.push(node.shortMessage)
    if (typeof node.message === "string") parts.push(node.message)
    cursor = node.cause
  }
  return parts.join(" ")
}

export function governanceWalletMessage(err: unknown): string {
  if (err instanceof GovernanceWalletError) return err.message
  const code = (err as { code?: number } | null)?.code
  if (code === 4001) return "The request was canceled."
  const text = errorText(err)
  const lower = text.toLowerCase()
  if (lower.includes("sign in first")) return "Sign in first."
  if (lower.includes("one address")) return "This account uses one address."
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("denied transaction") ||
    lower.includes("request rejected")
  ) {
    return "The request was canceled."
  }
  if (lower.includes("insufficient funds")) {
    return "This account does not have funds for this action."
  }
  if (lower.includes("not verified") || lower.includes("notverified")) {
    return "This account is not verified for that action yet."
  }
  if (lower.includes("already a member")) return "This account is already a member."
  if (lower.includes("approval required")) {
    return "This organization approves members before they can join."
  }
  return "That action did not go through."
}
