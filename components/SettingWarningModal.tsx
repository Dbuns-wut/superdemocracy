"use client"

/**
 * Shown before changing a setting that affects security, integrity, how voters see information,
 * or the vote itself (decision 43). Says what changes, the pros and cons, and asks to confirm.
 */
export type SettingWarning = {
  title: string
  affects: string
  pros: string[]
  cons: string[]
  confirmLabel: string
}

export function SettingWarningModal({
  warning,
  onCancel,
  onConfirm,
  busy,
}: {
  warning: SettingWarning | null
  onCancel: () => void
  onConfirm: () => void
  busy?: boolean
}) {
  if (!warning) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-zinc-900">{warning.title}</h2>
        <p className="mt-2 text-sm text-zinc-700">{warning.affects}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <h3 className="text-sm font-medium text-zinc-900">Pros</h3>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-zinc-700">
              {warning.pros.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
            <h3 className="text-sm font-medium text-amber-950">Cons</h3>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-amber-950">
              {warning.cons.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-sm text-zinc-700">Are you sure you want to proceed?</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-900 disabled:opacity-50"
          >
            {busy ? "Working…" : warning.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
