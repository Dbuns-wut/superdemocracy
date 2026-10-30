"use client"

import { createWalletClient, http, type EIP1193Provider, type Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import type { PrivateKeyAccount } from "viem/accounts"
import { anvil } from "@/lib/chain"

const DB_NAME = "superdemocracy"
const STORE = "account"
const KEY_ID = "primary"
const CHAIN_HEX = "0x7a6a"
const RPC = anvil.rpcUrls.default.http[0]

type Stored = { id: string; privateKey: `0x${string}` }

let keyGeneration = 0
let unlocked = false

export function accountKeyGeneration(): number {
  return keyGeneration
}

export function setAccountKeyUnlocked(on: boolean): void {
  unlocked = on
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const first = indexedDB.open(DB_NAME)
    first.onerror = () => reject(first.error)
    first.onsuccess = () => {
      const db = first.result
      if (db.objectStoreNames.contains(STORE)) {
        resolve(db)
        return
      }
      const nextVersion = db.version + 1
      db.close()
      const upgrade = indexedDB.open(DB_NAME, nextVersion)
      upgrade.onupgradeneeded = () => {
        const next = upgrade.result
        if (!next.objectStoreNames.contains(STORE)) next.createObjectStore(STORE)
      }
      upgrade.onsuccess = () => resolve(upgrade.result)
      upgrade.onerror = () => reject(upgrade.error)
    }
  })
}

async function readKey(): Promise<`0x${string}` | null> {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly")
      const req = tx.objectStore(STORE).get(KEY_ID)
      req.onsuccess = () => {
        const row = req.result as Stored | undefined
        resolve(row?.privateKey ?? null)
      }
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

async function writeKey(privateKey: `0x${string}`): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put({ id: KEY_ID, privateKey } satisfies Stored, KEY_ID)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function deleteKey(): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).delete(KEY_ID)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

/** Replaces whatever key this browser had. One signed-in account, one address. */
export async function saveAccountKey(privateKey: string): Promise<`0x${string}`> {
  const key = privateKey as `0x${string}`
  const address = privateKeyToAccount(key).address
  keyGeneration += 1
  unlocked = true
  await writeKey(key)
  return address
}

export async function clearAccountKey(): Promise<void> {
  keyGeneration += 1
  unlocked = false
  await deleteKey()
}

/** The key already on this device, so the first sign-in can keep it. */
export async function readAccountKey(): Promise<`0x${string}` | null> {
  const key = await readKey()
  if (!key) return null
  try {
    privateKeyToAccount(key)
    return key
  } catch {
    return null
  }
}

export async function readAccountAddress(): Promise<`0x${string}` | null> {
  const key = await readKey()
  if (!key) return null
  try {
    return privateKeyToAccount(key).address
  } catch {
    return null
  }
}

export async function hasInAppAccount(): Promise<boolean> {
  return Boolean(await readAccountAddress())
}

async function existingAccount(): Promise<PrivateKeyAccount | null> {
  if (!unlocked) return null
  const key = await readKey()
  if (!key) return null
  return privateKeyToAccount(key)
}

type RpcRequest = { method: string; params?: unknown[] }

function hexMessage(message: unknown): `0x${string}` | string {
  if (typeof message === "string") return message
  return String(message ?? "")
}

function asBigInt(value: unknown): bigint | undefined {
  if (value == null || value === "") return undefined
  if (typeof value === "bigint") return value
  if (typeof value === "number") return BigInt(value)
  if (typeof value === "string") return BigInt(value)
  return undefined
}

async function rpc(method: string, params?: unknown): Promise<unknown> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: params ?? [] }),
  })
  const json = (await res.json()) as { result?: unknown; error?: { message?: string } }
  if (json.error) throw new Error(json.error.message || "The action could not be sent.")
  return json.result
}

async function sendTransaction(params: unknown): Promise<Hex> {
  const account = await existingAccount()
  if (!account) throw new Error("Sign in first")
  const tx = (Array.isArray(params) ? params[0] : params) as Record<string, unknown> | undefined
  if (!tx || typeof tx !== "object") throw new Error("Sign in first")
  const from = typeof tx.from === "string" ? tx.from.toLowerCase() : ""
  if (from && from !== account.address.toLowerCase()) {
    throw new Error("This account uses one address.")
  }
  const client = createWalletClient({
    account,
    chain: anvil,
    transport: http(RPC),
  })
  const to = typeof tx.to === "string" ? (tx.to as `0x${string}`) : undefined
  const data = typeof tx.data === "string" ? (tx.data as `0x${string}`) : undefined
  return client.sendTransaction({
    account,
    chain: anvil,
    to,
    data,
    value: asBigInt(tx.value),
    gas: asBigInt(tx.gas),
  })
}

export function inAppProvider(): EIP1193Provider {
  return {
    on() {
      return undefined
    },
    removeListener() {
      return undefined
    },
    async request({ method, params }: RpcRequest) {
      if (method === "eth_chainId") return CHAIN_HEX
      if (method === "eth_accounts" || method === "eth_requestAccounts") {
        const account = await existingAccount()
        if (!account) {
          if (method === "eth_requestAccounts") throw new Error("Sign in first")
          return []
        }
        return [account.address]
      }
      if (method === "personal_sign" || method === "eth_sign") {
        const account = await existingAccount()
        if (!account) throw new Error("Sign in first")
        const message = hexMessage(params?.[0])
        if (typeof message === "string" && message.startsWith("0x")) {
          return account.signMessage({ message: { raw: message as `0x${string}` } })
        }
        return account.signMessage({ message })
      }
      if (method === "eth_sendTransaction") return sendTransaction(params)
      if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") {
        return null
      }
      if (
        method === "eth_signTransaction" ||
        method.startsWith("eth_signTypedData") ||
        method === "personal_ecRecover"
      ) {
        throw new Error("That action is not available with this account yet.")
      }
      return rpc(method, params)
    },
  } as unknown as EIP1193Provider
}
