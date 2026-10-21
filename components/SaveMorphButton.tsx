"use client"

import { useState } from "react"

type SaveMorphButtonProps = {
  label?: string
  onPress: () => Promise<boolean | void>
  size?: "default" | "compact"
  disabled?: boolean
  className?: string
  onSuccessComplete?: () => void
}

export function SaveMorphButton({
  label = "Save",
  onPress,
  size = "compact",
  disabled = false,
  className = "",
  onSuccessComplete,
}: SaveMorphButtonProps) {
  const [phase, setPhase] = useState<"idle" | "saving" | "saved">("idle")
  const pad = size === "compact" ? "px-4 py-2 text-sm" : "px-5 py-2.5 text-sm"

  const handleClick = async () => {
    if (phase !== "idle" || disabled) return
    setPhase("saving")
    try {
      const result = await onPress()
      if (result === false) {
        setPhase("idle")
        return
      }
      setPhase("saved")
      window.setTimeout(() => {
        setPhase("idle")
        onSuccessComplete?.()
      }, 1500)
    } catch {
      setPhase("idle")
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || phase === "saving"}
      onClick={() => void handleClick()}
      className={`inline-flex items-center justify-center self-start rounded bg-blue-600 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${pad} ${className}`}
    >
      {phase === "saving" ? (
        <>
          <span
            className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
            aria-hidden
          />
          Saving…
        </>
      ) : phase === "saved" ? (
        "Saved"
      ) : (
        label
      )}
    </button>
  )
}
