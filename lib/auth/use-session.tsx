"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { PublicAccount } from "@/lib/auth/account-types"

type SessionState = {
  /** The signed-in person, or null. */
  account: PublicAccount | null
  /** True until the first session check completes. */
  loading: boolean
  /** Re-read the session from the server (after login, signup, or profile edits). */
  refresh: () => Promise<PublicAccount | null>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

async function fetchSession(): Promise<PublicAccount | null> {
  try {
    const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
    if (!res.ok) return null
    const data = (await res.json()) as { account?: PublicAccount | null }
    return data.account ?? null
  } catch {
    return null
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<PublicAccount | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const next = await fetchSession()
    setAccount(next)
    setLoading(false)
    return next
  }, [])

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } finally {
      setAccount(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(() => ({ account, loading, refresh, signOut }), [account, loading, refresh, signOut])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error("useSession must be used inside SessionProvider")
  }
  return ctx
}
