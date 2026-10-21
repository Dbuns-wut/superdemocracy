"use client"

import { useState } from "react"

type Props = {
  value: string
  onChange: (value: string) => void
  autoComplete: "new-password" | "current-password"
  placeholder?: string
  id?: string
}

export function PasswordInput({ value, onChange, autoComplete, placeholder, id }: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex items-center rounded-lg border border-zinc-300 bg-white pr-2">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full bg-transparent px-3 py-2.5 text-sm text-[#0E1C36] placeholder:text-zinc-400 focus:outline-none"
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
        className="flex size-8 shrink-0 items-center justify-center text-zinc-500 hover:text-zinc-800"
      >
        {visible ? (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M3 3l18 18" strokeLinecap="round" />
            <path d="M10.6 10.6a2 2 0 002.8 2.8" strokeLinecap="round" />
            <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 9.3 3.1 11 7-0.6 1.4-1.5 2.6-2.6 3.6M6.1 6.1C4.2 7.4 2.8 9.1 2 12c1.7 3.9 6 7 10 7 1.5 0 2.9-.3 4.2-.9" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}
