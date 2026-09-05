"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useAccount, useConnect, useSignMessage } from "wagmi"
import { AppSidebar } from "@/components/AppSidebar"
import { shortAddress } from "@/lib/address"
import { signOffchainAction } from "@/lib/sign-offchain-action"
import type { IdentityProfile } from "@/lib/identity/types"

export default function ManageMyIdPage() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending: connectPending } = useConnect()
  const { signMessageAsync } = useSignMessage()

  const [profile, setProfile] = useState<IdentityProfile | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const loadProfile = useCallback(async (addr: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/me?address=${encodeURIComponent(addr)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Could not load profile")
        return
      }
      const p = data.profile as IdentityProfile | null
      setProfile(p)
      setDisplayName(p?.displayName ?? "")
      setAvatarUrl(p?.avatarUrl ?? "")
      setBio(p?.bio ?? "")
    } catch {
      setError("Could not load profile")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!address) {
      setProfile(null)
      setDisplayName("")
      setAvatarUrl("")
      setBio("")
      return
    }
    void loadProfile(address)
  }, [address, loadProfile])

  const handleSave = async () => {
    if (!address) return
    const name = displayName.trim()
    if (!name) {
      setError("Display name is required")
      return
    }

    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const payload = {
        displayName: name,
        avatarUrl: avatarUrl.trim() || undefined,
        bio: bio.trim() || undefined,
      }
      const signed = await signOffchainAction({
        action: "identity.profile.update",
        resourceId: address,
        voterId: address,
        payload,
        signMessageAsync,
      })
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          voterId: address,
          ...signed,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Save failed")
        return
      }
      const p = data.profile as IdentityProfile
      setProfile(p)
      setDisplayName(p.displayName)
      setAvatarUrl(p.avatarUrl ?? "")
      setBio(p.bio ?? "")
      setSaved(true)
    } catch (e: unknown) {
      const err = e as { message?: string }
      const msg = err?.message ?? ""
      if (/reject|denied|cancel/i.test(msg)) {
        setError("Save not submitted. Confirmation was canceled.")
      } else {
        setError("Save failed")
      }
    } finally {
      setSaving(false)
    }
  }

  const connector = connectors[0]

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <AppSidebar active="me" />

      <div className="ml-48 flex flex-1 justify-center p-8">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-semibold text-zinc-900">Manage My ID</h1>

          {!isConnected || !address ? (
            <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
              <p className="text-sm text-zinc-600">
                Connect your account to set how you appear to other members.
              </p>
              {connector ? (
                <button
                  type="button"
                  onClick={() => connect({ connector })}
                  disabled={connectPending}
                  className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {connectPending ? "Connecting…" : "Connect"}
                </button>
              ) : (
                <p className="mt-4 text-sm text-amber-800">
                  No wallet connector available.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              <div className="flex items-center gap-4">
                {avatarUrl.trim() ? (
                  <img
                    src={avatarUrl.trim()}
                    alt=""
                    className="size-16 rounded-full border border-zinc-200 object-cover"
                  />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-2xl text-zinc-400">
                    👤
                  </div>
                )}
                <div>
                  <p className="font-medium text-zinc-900">
                    {displayName.trim() || profile?.displayName || "Your name"}
                  </p>
                  <p className="text-sm text-zinc-500">{shortAddress(address)}</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value)
                    setSaved(false)
                  }}
                  maxLength={80}
                  placeholder="How others see you"
                  className="w-full rounded border border-zinc-200 bg-white p-2 text-zinc-900 placeholder:text-zinc-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => {
                    setAvatarUrl(e.target.value)
                    setSaved(false)
                  }}
                  placeholder="https://… (optional)"
                  className="w-full rounded border border-zinc-200 bg-white p-2 text-zinc-900 placeholder:text-zinc-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Short bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value)
                    setSaved(false)
                  }}
                  rows={3}
                  maxLength={280}
                  placeholder="A line about you (optional)"
                  className="w-full rounded border border-zinc-200 bg-white p-2 text-zinc-900 placeholder:text-zinc-500"
                />
              </div>

              {loading && (
                <p className="text-sm text-zinc-500">Loading profile…</p>
              )}
              {error && (
                <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </p>
              )}
              {saved && (
                <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  Profile saved.
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || loading}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </div>
          )}

          <div className="mt-10">
            <Link
              href="/settings"
              className="text-sm text-zinc-600 underline hover:text-zinc-900"
            >
              Account settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
