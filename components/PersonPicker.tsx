"use client"

import { useState } from "react"
import { usePeople, usePeopleSearch, type Person } from "@/lib/people/use-people"

/**
 * Pick a member by name or email. Emits the account id.
 * Shows the chosen person's name instead of an id once selected.
 */
export function PersonPicker({
  value,
  onChange,
  placeholder = "Search by name or email",
  exclude = [],
  disabled,
  className,
}: {
  value: string | null
  onChange: (id: string | null, person: Person | null) => void
  placeholder?: string
  /** Ids that should not be offered (e.g. yourself). */
  exclude?: string[]
  disabled?: boolean
  className?: string
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const { results, searching } = usePeopleSearch(query)
  const { nameOf } = usePeople(value ? [value] : [])

  const excluded = new Set(exclude.map((e) => e.toLowerCase()))
  const options = results.filter((r) => !excluded.has(r.id.toLowerCase()))

  const fieldClass =
    className ??
    "w-full rounded border border-zinc-200 bg-white p-2 text-sm text-zinc-900 placeholder:text-zinc-500 disabled:opacity-50"

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800">
          {nameOf(value)}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              onChange(null, null)
            }}
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            Change
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={fieldClass}
        autoComplete="off"
      />
      {open && query.trim().length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border border-zinc-200 bg-white shadow-lg">
          {searching && options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">Searching…</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">No one found.</li>
          ) : (
            options.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery("")
                    setOpen(false)
                    onChange(p.id, p)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                >
                  {p.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
