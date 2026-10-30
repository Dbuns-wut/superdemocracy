"use client"

import { useEffect } from "react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { accountKeyGeneration, clearAccountKey, readAccountAddress, setAccountKeyUnlocked } from "@/lib/in-app-account"

/** Restores this account's address. A different address is not used while signed in. */
export function InAppSession() {
  const { status, connector } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    if (status === "connecting" || status === "reconnecting") return
    const accountConnector = connectors.find((item) => item.id === "superdemocracy")
    if (!accountConnector) return
    let cancelled = false
    const seen = accountKeyGeneration()
    void (async () => {
      let expected = ""
      try {
        const session = await fetch("/api/auth/session", { credentials: "include" })
        if (session.ok) {
          const data = (await session.json()) as { account?: { address?: unknown } }
          expected = typeof data?.account?.address === "string" ? data.account.address.toLowerCase() : ""
        }
      } catch {
        expected = ""
      }
      if (cancelled) return
      const local = ((await readAccountAddress().catch(() => null)) ?? "").toLowerCase()
      if (cancelled) return
      const same = Boolean(expected) && local === expected
      if (!same) {
        if (accountKeyGeneration() !== seen) return
        setAccountKeyUnlocked(false)
        if (expected && local) await clearAccountKey().catch(() => undefined)
        if (!cancelled && status === "connected") disconnect()
        return
      }
      setAccountKeyUnlocked(true)
      if (status === "connected" && connector?.id === "superdemocracy") return
      if (status === "connected") disconnect()
      try {
        connect({ connector: accountConnector })
      } catch {
        /* the next visit tries again */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, connector, connectors, connect, disconnect])

  return null
}
