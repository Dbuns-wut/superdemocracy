"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useAccount, useSignMessage } from "wagmi"
import { AppSidebar } from "@/components/AppSidebar"
import { SaveMorphButton } from "@/components/SaveMorphButton"
import { profilePayload } from "@/lib/identity/profile-payload"
import { writeLocalEmail } from "@/lib/identity/local-email"
import { signOffchainAction } from "@/lib/sign-offchain-action"
import type { IdentityProfile } from "@/lib/identity/types"

function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read that photo."))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const size = 160
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not read that photo."))
          return
        }
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        resolve(canvas.toDataURL("image/jpeg", 0.72))
      }
      img.onerror = () => reject(new Error("Could not read that photo."))
      img.src = String(reader.result ?? "")
    }
    reader.readAsDataURL(file)
  })
}

export default function MyIdPage() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [photo, setPhoto] = useState("")
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = useCallback(async (addr: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/me?address=${encodeURIComponent(addr)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Could not load your profile")
        return
      }
      const p = data.profile as IdentityProfile | null
      setDisplayName(p?.displayName ?? "")
      setEmail(p?.email ?? "")
      setPhoto(p?.avatarUrl ?? "")
      setBio(p?.bio ?? "")
      if (p?.email) writeLocalEmail(p.email)
    } catch {
      setError("Could not load your profile")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!address) {
      setDisplayName("")
      setEmail("")
      setPhoto("")
      setBio("")
      return
    }
    void loadProfile(address)
  }, [address, loadProfile])

  const handleSave = async (): Promise<boolean> => {
    if (!address) return false
    const name = displayName.trim()
    if (!name) {
      setError("Enter your name.")
      return false
    }
    setError(null)
    const payload = profilePayload({
      displayName: name,
      avatarUrl: photo,
      bio,
      email,
    })
    try {
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
        body: JSON.stringify({ ...payload, voterId: address, ...signed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Could not save.")
        return false
      }
      const p = data.profile as IdentityProfile
      setDisplayName(p.displayName)
      setEmail(p.email ?? "")
      setPhoto(p.avatarUrl ?? "")
      setBio(p.bio ?? "")
      if (p.email) writeLocalEmail(p.email)
      else writeLocalEmail("")
      return true
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? ""
      if (/reject|denied|cancel/i.test(msg)) {
        setError("Save was canceled.")
      } else {
        setError("Could not save.")
      }
      return false
    }
  }

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <AppSidebar active="me" />

      <div className="ml-48 flex flex-1 justify-center p-8">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-semibold text-zinc-900">My ID</h1>
          <p className="mt-2 text-sm text-zinc-600">Your name and photo. This is how people see you.</p>

          {!isConnected || !address ? (
            <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
              <p className="text-sm text-zinc-600">Sign up or log in to fill this in.</p>
              <Link
                href="/"
                className="mt-4 inline-block rounded bg-[#1B4FE0] px-4 py-2 text-sm text-white hover:bg-[#1239B0]"
              >
                Get started
              </Link>
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              <div className="flex items-center gap-4">
                {photo ? (
                  <img src={photo} alt="" className="size-16 rounded-full border border-zinc-200 object-cover" />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-sm text-zinc-400">
                    Photo
                  </div>
                )}
                <div className="flex flex-col items-start gap-2">
                  <label className="inline-block cursor-pointer rounded border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50">
                    Choose photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ""
                        if (!file) return
                        void readPhoto(file)
                          .then((url) => {
                            setPhoto(url)
                            setError(null)
                          })
                          .catch(() => setError("Could not use that photo."))
                      }}
                    />
                  </label>
                  {photo && (
                    <button
                      type="button"
                      onClick={() => setPhoto("")}
                      className="text-sm text-zinc-500 hover:text-zinc-800"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">Name</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  placeholder="Your name"
                  className="w-full rounded border border-zinc-200 bg-white p-2 text-zinc-900 placeholder:text-zinc-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full rounded border border-zinc-200 bg-white p-2 text-zinc-900 placeholder:text-zinc-500"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-zinc-700">About you</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={280}
                  placeholder="A line or two, if you want"
                  className="w-full rounded border border-zinc-200 bg-white p-2 text-zinc-900 placeholder:text-zinc-500"
                />
              </label>

              {loading && <p className="text-sm text-zinc-500">Loading…</p>}
              {error && (
                <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
              )}

              <SaveMorphButton label="Save" onPress={handleSave} disabled={loading} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
