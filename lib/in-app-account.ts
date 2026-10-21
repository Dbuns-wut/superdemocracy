"use client"

import type { EIP1193Provider } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import type { PrivateKeyAccount } from "viem/accounts"

const DB_NAME = "superdemocracy"
const STORE = "account"
const KEY_ID = "primary"
const CHAIN_HEX = "0x7a6a"

type Stored = { id: string; privateKey: `0x${string}` }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function readKey(): Promise<`0x${string}` | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).get(KEY_ID)
    req.onsuccess = () => {
      const row = req.result as Stored | undefined
      resolve(row?.privateKey ?? null)
    }
    req.onerror = () => reject(req.error)
  })
}

async function writeKey(privateKey: `0x${string}`): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put({ id: KEY_ID, privateKey } satisfies Stored, KEY_ID)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function hasInAppAccount(): Promise<boolean> {
  const key = await readKey()
  return Boolean(key)
}

async function existingAccount(): Promise<PrivateKeyAccount | null> {
  const key = await readKey()
  if (!key) return null
  return privateKeyToAccount(key)
}

async function accountOrCreate(): Promise<PrivateKeyAccount> {
  const existing = await existingAccount()
  if (existing) return existing
  const privateKey = generatePrivateKey()
  await writeKey(privateKey)
  return privateKeyToAccount(privateKey)
}

type RpcRequest = { method: string; params?: unknown[] }

function hexMessage(message: unknown): `0x${string}` | string {
  if (typeof message === "string") return message
  return String(message ?? "")
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
      if (method === "eth_accounts") {
        const account = await existingAccount()
        return account ? [account.address] : []
      }
      if (method === "eth_requestAccounts") {
        const account = await accountOrCreate()
        return [account.address]
      }
      if (method === "personal_sign") {
        const account = await existingAccount()
        if (!account) throw new Error("Sign in first")
        const message = hexMessage(params?.[0])
        if (typeof message === "string" && message.startsWith("0x")) {
          return account.signMessage({ message: { raw: message as `0x${string}` } })
        }
        return account.signMessage({ message })
      }
      if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") {
        return null
      }
      throw new Error("That action is not available with this account yet.")
    },
  } as unknown as EIP1193Provider
}
