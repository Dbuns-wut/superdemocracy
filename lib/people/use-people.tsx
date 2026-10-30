"use client"

import { useEffect, useMemo, useRef, useState } from "react"

export type Person = { id: string; name: string; avatarUrl?: string }

type Cache = Map<string, Person>
const cache: Cache = new Map()

async function lookup(ids: string[]): Promise<Record<string, Person>> {
  const res = await fetch("/api/users/lookup", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) return {}
  const data = (await res.json().catch(() => ({}))) as { people?: Record<string, Person> }
  return data.people ?? {}
}

/**
 * Resolve participant ids to names (and photos) so screens show people, not ids.
 * Returns a lookup; unknown ids fall back to a short label.
 */
export function usePeople(ids: Iterable<string | null | undefined>): {
  people: Record<string, Person>
  nameOf: (id: string | null | undefined) => string
} {
  const wanted = useMemo(() => {
    const out: string[] = []
    for (const id of ids) {
      const k = typeof id === "string" ? id.trim().toLowerCase() : ""
      if (k && !out.includes(k)) out.push(k)
    }
    return out
  }, [ids])
  const key = wanted.join(",")
  const [version, setVersion] = useState(0)
  const inflight = useRef<Set<string>>(new Set())

  useEffect(() => {
    const missing = wanted.filter((k) => !cache.has(k) && !inflight.current.has(k))
    if (missing.length === 0) return
    for (const k of missing) inflight.current.add(k)
    let cancelled = false
    void lookup(missing)
      .then((found) => {
        for (const k of missing) {
          const p = found[k]
          if (p) cache.set(k, p)
          inflight.current.delete(k)
        }
        if (!cancelled) setVersion((v) => v + 1)
      })
      .catch(() => {
        for (const k of missing) inflight.current.delete(k)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return useMemo(() => {
    const people: Record<string, Person> = {}
    for (const k of wanted) {
      const p = cache.get(k)
      if (p) people[k] = p
    }
    const nameOf = (id: string | null | undefined) => {
      const k = typeof id === "string" ? id.trim().toLowerCase() : ""
      if (!k) return "Someone"
      return cache.get(k)?.name ?? `Member ${k.slice(0, 6)}`
    }
    return { people, nameOf }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version])
}

/** Debounced member search by name or email. */
export function usePeopleSearch(query: string, limit = 20): { results: Person[]; searching: boolean } {
  /** Results keyed by the query that produced them, so a stale answer never shows for a new query. */
  const [found, setFound] = useState<{ q: string; rows: Person[] } | null>(null)
  const q = query.trim()
  const active = q.length >= 2
  useEffect(() => {
    if (!active) return
    let cancelled = false
    const t = window.setTimeout(() => {
      void fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=${limit}`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : { accounts: [] }))
        .then((data: { accounts?: Array<{ id: string; name: string }> }) => {
          if (cancelled) return
          const rows = Array.isArray(data.accounts) ? data.accounts : []
          for (const r of rows) cache.set(r.id.toLowerCase(), { id: r.id, name: r.name })
          setFound({ q, rows: rows.map((r) => ({ id: r.id, name: r.name })) })
        })
        .catch(() => {
          if (!cancelled) setFound({ q, rows: [] })
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [q, active, limit])
  if (!active) return { results: [], searching: false }
  const fresh = found?.q === q
  return { results: fresh ? found.rows : [], searching: !fresh }
}
