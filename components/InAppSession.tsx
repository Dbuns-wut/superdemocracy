"use client"

import { useEffect, useRef } from "react"
import { useAccount, useConnect } from "wagmi"
import { hasInAppAccount } from "@/lib/in-app-account"

/** Restores an account this browser already has. Does not create one for a new visitor. */
export function InAppSession() {
  const { status } = useAccount()
  const { connect, connectors } = useConnect()
  const started = useRef(false)

  useEffect(() => {
    if (status === "connected" || status === "connecting" || status === "reconnecting") return
    if (started.current) return
    const connector = connectors.find((c) => c.id === "superdemocracy")
    if (!connector) return
    let cancelled = false
    started.current = true
    void hasInAppAccount()
      .then((exists) => {
        if (cancelled || !exists) {
          if (!exists) started.current = false
          return
        }
        try {
          connect({ connector })
        } catch {
          started.current = false
        }
      })
      .catch(() => {
        started.current = false
      })
    return () => {
      cancelled = true
    }
  }, [status, connectors, connect])

  return null
}
