"use client"

import type { ReferendumEducation } from "@/lib/education/types"

export function PerspectivesPanel({
  open,
  education,
  loading,
  onClose,
  acknowledgeLabel,
  acknowledgePending,
  onAcknowledge,
  showAcknowledge,
}: {
  open: boolean
  education: ReferendumEducation | null
  loading: boolean
  onClose: () => void
  showAcknowledge: boolean
  acknowledgeLabel: string
  acknowledgePending: boolean
  onAcknowledge: () => void
}) {
  if (!open) return null

  const debrief = education?.quickDebrief
  const perspectives = education?.perspectives ?? []
  const evidence = education?.evidence ?? []
  const sources = education?.sources ?? []
  const forRow = perspectives.find((p) => /^for$/i.test(p.title) || /^pro/i.test(p.title))
  const againstRow = perspectives.find((p) => /^against$/i.test(p.title) || /^con/i.test(p.title))
  const binaryPair = forRow && againstRow
  const otherPerspectives = binaryPair
    ? perspectives.filter((p) => p.id !== forRow.id && p.id !== againstRow.id)
    : perspectives

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-zinc-900">Perspectives</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Quick Debrief, Pros vs Cons, then Evidence and Sources.
          </p>
        </div>
        <div className="flex-1 overflow-auto px-6 py-4 space-y-8">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : (
            <>
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Quick Debrief
                </h3>
                <dl className="mt-3 space-y-3 text-sm text-zinc-800">
                  <div>
                    <dt className="font-medium text-zinc-900">What are we deciding?</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-zinc-700">
                      {debrief?.what?.trim() || "See the title and options on this decision."}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-zinc-900">Why it matters</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-zinc-700">
                      {debrief?.why?.trim() || "Your vote helps the organization choose a direction."}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-zinc-900">Known</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-zinc-700">
                      {debrief?.known?.trim() || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-zinc-900">Disputed</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-zinc-700">
                      {debrief?.disputed?.trim() || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-zinc-900">Uncertain</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-zinc-700">
                      {debrief?.uncertain?.trim() || "—"}
                    </dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Pros vs Cons
                </h3>
                {binaryPair ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                      <h4 className="font-medium text-zinc-900">{forRow.title}</h4>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{forRow.body}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                      <h4 className="font-medium text-zinc-900">{againstRow.title}</h4>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{againstRow.body}</p>
                    </div>
                  </div>
                ) : null}
                {otherPerspectives.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {otherPerspectives.map((p) => (
                      <section key={p.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                        <h4 className="font-medium text-zinc-900">{p.title}</h4>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{p.body}</p>
                      </section>
                    ))}
                  </div>
                ) : !binaryPair ? (
                  <p className="mt-2 text-sm text-zinc-500">No perspectives published.</p>
                ) : null}
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Evidence
                </h3>
                {evidence.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">
                    No evidence items yet. Claims, studies, and expert statements belong here.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {evidence.map((item) => (
                      <section key={item.id}>
                        <h4 className="font-medium text-zinc-900">{item.title}</h4>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{item.body}</p>
                      </section>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Sources
                </h3>
                {sources.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">
                    No source documents linked yet. Legislation, reports, and original documents belong
                    here.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {sources.map((s) => (
                      <li key={s.id}>
                        {s.url ? (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-blue-700 hover:underline"
                          >
                            {s.title || s.url}
                          </a>
                        ) : (
                          <span className="font-medium text-zinc-900">{s.title}</span>
                        )}
                        {s.note ? (
                          <p className="mt-0.5 text-zinc-600">{s.note}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-zinc-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-50"
          >
            Close
          </button>
          {showAcknowledge && (
            <button
              type="button"
              disabled={acknowledgePending || loading}
              onClick={onAcknowledge}
              className="rounded bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {acknowledgePending ? "Confirming…" : acknowledgeLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
