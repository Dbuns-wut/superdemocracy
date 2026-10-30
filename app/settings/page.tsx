"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/AppSidebar"
import { PasswordInput } from "@/components/PasswordInput"
import { useSession } from "@/lib/auth/use-session"

export default function SettingsPage() {
  const router = useRouter()
  const { account, loading, signOut } = useSession()
  const signedIn = Boolean(account)
  const [name, setName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordUpdated, setPasswordUpdated] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!account) {
      setName("")
      return
    }
    let cancelled = false
    void fetch("/api/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setName(typeof data?.profile?.displayName === "string" ? data.profile.displayName : account.name)
      })
      .catch(() => {
        if (!cancelled) setName(account.name)
      })
    return () => {
      cancelled = true
    }
  }, [account])

  async function updatePassword() {
    setPasswordError("")
    setPasswordUpdated(false)
    if (!currentPassword) {
      setPasswordError("Enter your current password.")
      return
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Those passwords don't match.")
      return
    }
    setPasswordBusy(true)
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPasswordError(typeof data?.error === "string" ? data.error : "Could not update the password.")
        return
      }
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordUpdated(true)
    } catch {
      setPasswordError("Could not update the password.")
    } finally {
      setPasswordBusy(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      router.push("/")
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <AppSidebar active="settings" />

      <div className="ml-48 flex flex-1 justify-center p-8">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>

          <section className="mt-8">
            <h2 className="text-sm font-medium text-zinc-700">Profile</h2>
            {loading ? (
              <p className="mt-1 text-sm text-zinc-500">Loading…</p>
            ) : signedIn ? (
              <p className="mt-1 text-sm text-zinc-500">{name || "Add your name so people know who you are."}</p>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">You are not signed in.</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={signedIn ? "/me" : "/"}
                className="inline-block rounded border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                {signedIn ? "My ID" : "Sign in"}
              </Link>
              {signedIn && (
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={() => void handleSignOut()}
                  className="inline-block rounded border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              )}
            </div>
          </section>

          {signedIn && (
            <section className="mt-10">
              <h2 className="text-sm font-medium text-zinc-700">Password</h2>
              <form
                className="mt-3 max-w-sm space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  void updatePassword()
                }}
              >
                <label className="block">
                  <span className="mb-1 block text-sm text-zinc-700">Current password</span>
                  <PasswordInput
                    value={currentPassword}
                    onChange={(value) => {
                      setCurrentPassword(value)
                      setPasswordUpdated(false)
                    }}
                    autoComplete="current-password"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-zinc-700">New password</span>
                  <PasswordInput
                    value={newPassword}
                    onChange={(value) => {
                      setNewPassword(value)
                      setPasswordUpdated(false)
                    }}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-zinc-700">Confirm new password</span>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(value) => {
                      setConfirmPassword(value)
                      setPasswordUpdated(false)
                    }}
                    autoComplete="new-password"
                  />
                </label>
                {passwordError && <p className="text-sm text-red-700">{passwordError}</p>}
                {passwordUpdated && <p className="text-sm text-zinc-700">Password updated.</p>}
                <button
                  type="submit"
                  disabled={passwordBusy}
                  className="rounded bg-[#1B4FE0] px-4 py-2 text-sm text-white hover:bg-[#1239B0] disabled:opacity-50"
                >
                  {passwordBusy ? "Updating…" : "Update password"}
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
