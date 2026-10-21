"use client"

import { useEffect, useState } from "react"
import { SaveMorphButton } from "@/components/SaveMorphButton"
import { signOffchainAction } from "@/lib/sign-offchain-action"
import { defaultOrgSettings, type JoinRequirementField, type OrgSettings } from "@/lib/org-settings/types"

const UNION_CARD_PRESET: Omit<JoinRequirementField, "id">[] = [
  { label: "Member card number", type: "text", required: true },
  { label: "Photo of member card", type: "file", required: true },
]

export function OrgSettingsPanel({
  orgId,
  community,
  isAdmin,
  userAddr,
  signMessageAsync,
  onSettingsChange,
}: {
  orgId: string
  community: boolean
  isAdmin: boolean
  userAddr: string | null | undefined
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>
  onSettingsChange?: (settings: OrgSettings) => void
}) {
  const [settings, setSettings] = useState<OrgSettings>(() => defaultOrgSettings(orgId))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/org-settings/${encodeURIComponent(orgId)}`)
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok || !data.settings) {
          setLoadError(typeof data.error === "string" ? data.error : "Could not load settings")
          setLoaded(true)
          return
        }
        setSettings(data.settings as OrgSettings)
        onSettingsChange?.(data.settings as OrgSettings)
        setLoaded(true)
      } catch {
        if (!cancelled) {
          setLoadError("Could not load settings")
          setLoaded(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // Parent callback is optional notification; do not re-fetch when its identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const handleSave = async (): Promise<boolean> => {
    setSaveError(null)
    if (!userAddr) {
      setSaveError("Sign in to save.")
      return false
    }
    const payload = {
      citizenInitiativesEnabled: settings.citizenInitiativesEnabled,
      educationBeforeVote: community ? settings.educationBeforeVote : true,
      joinRequirements: community ? settings.joinRequirements : [],
    }
    try {
      const signed = await signOffchainAction({
        action: "org.settings.set",
        resourceId: orgId,
        voterId: userAddr,
        payload,
        signMessageAsync,
      })
      const res = await fetch(`/api/org-settings/${encodeURIComponent(orgId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          voterId: userAddr,
          ...signed,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.settings) {
        setSaveError(typeof data.error === "string" ? data.error : "Save failed")
        return false
      }
      setSettings(data.settings as OrgSettings)
      onSettingsChange?.(data.settings as OrgSettings)
      return true
    } catch {
      setSaveError("Save canceled or failed")
      return false
    }
  }

  const updateField = (id: string, patch: Partial<JoinRequirementField>) => {
    setSettings((prev) => ({
      ...prev,
      joinRequirements: prev.joinRequirements.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }))
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-zinc-200 bg-zinc-50 p-6">
        <h2 className="text-xl">Settings</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Feature toggles for this organization. Soft defaults follow SuperDemocracy research; the
          admin can change the ones listed here.
        </p>
        {!loaded && <p className="mt-3 text-sm text-zinc-500">Loading settings…</p>}
        {loadError && <p className="mt-3 text-sm text-red-600">{loadError}</p>}
      </div>

      <div className="rounded border border-zinc-200 bg-zinc-50 p-6">
        <h3 className="text-lg">Citizen initiatives</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Governance organizations: members can start a petition that goes to approval and then a
            vote. Off unless this organization turns it on. Community organizations keep the same
            setting; that petition flow is not available there yet.
          </p>
        <label className="mt-3 flex items-start gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            className="mt-0.5"
            disabled={!isAdmin}
            checked={settings.citizenInitiativesEnabled}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, citizenInitiativesEnabled: e.target.checked }))
            }
          />
          <span>Allow member-initiated petitions</span>
        </label>
      </div>

      <div className="rounded border border-zinc-200 bg-zinc-50 p-6">
        <h3 className="text-lg">Education Before Vote</h3>
        {community ? (
          <>
            <p className="mt-1 text-sm text-zinc-600">
              Members must open Perspectives before voting. On by default.
            </p>
            <label className="mt-3 flex items-start gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                className="mt-0.5"
                disabled={!isAdmin}
                checked={settings.educationBeforeVote}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, educationBeforeVote: e.target.checked }))
                }
              />
              <span>Require Perspectives before voting</span>
            </label>
            {!settings.educationBeforeVote && (
              <p className="mt-2 text-sm text-amber-800">
                Off: members can submit a ballot without opening Perspectives. SuperDemocracy&apos;s
                default is to put information in the path of the decision.
              </p>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-zinc-600">
            Required for this organization. Members open Perspectives before a referendum ballot is
            accepted. This cannot be turned off.
          </p>
        )}
      </div>

      {community && (
        <div className="rounded border border-zinc-200 bg-zinc-50 p-6">
          <h3 className="text-lg">Join requirements</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Extra fields for people who apply (Manual membership). This is this organization&apos;s
            check — not government ID. Example: a union card number plus a photo of the card, reviewed
            by an admin.
          </p>
          <div className="mt-3 space-y-3">
            {settings.joinRequirements.map((field) => (
              <div
                key={field.id}
                className="flex flex-wrap items-end gap-2 rounded border border-zinc-200 bg-white p-3"
              >
                <label className="min-w-[12rem] flex-1 text-sm">
                  <span className="mb-1 block text-zinc-600">Label</span>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    className="w-full rounded border border-zinc-200 p-2 text-zinc-900"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-zinc-600">Type</span>
                  <select
                    disabled={!isAdmin}
                    value={field.type}
                    onChange={(e) =>
                      updateField(field.id, { type: e.target.value === "file" ? "file" : "text" })
                    }
                    className="rounded border border-zinc-200 bg-white p-2 text-zinc-900"
                  >
                    <option value="text">Text</option>
                    <option value="file">Photo / file</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={field.required}
                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  />
                  Required
                </label>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        joinRequirements: prev.joinRequirements.filter((f) => f.id !== field.id),
                      }))
                    }
                    className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {isAdmin && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    joinRequirements: [
                      ...prev.joinRequirements,
                      {
                        id: crypto.randomUUID(),
                        label: "New field",
                        type: "text",
                        required: true,
                      },
                    ],
                  }))
                }
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                Add field
              </button>
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    joinRequirements: [
                      ...prev.joinRequirements,
                      ...UNION_CARD_PRESET.map((f) => ({ ...f, id: crypto.randomUUID() })),
                    ],
                  }))
                }
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                Add union-card fields
              </button>
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3">
          <SaveMorphButton onPress={handleSave} disabled={!loaded} />
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        </div>
      )}
      {!isAdmin && (
        <p className="text-sm text-zinc-500">Only the organization admin can change these settings.</p>
      )}
    </div>
  )
}
