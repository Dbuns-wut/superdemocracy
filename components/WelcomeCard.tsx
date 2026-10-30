"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi"
import { readAccountKey, saveAccountKey, setAccountKeyUnlocked } from "@/lib/in-app-account"
import { emailLooksOk, profilePayload } from "@/lib/identity/profile-payload"
import { writeLocalEmail } from "@/lib/identity/local-email"
import { signOffchainAction } from "@/lib/sign-offchain-action"
import { PasswordInput } from "@/components/PasswordInput"

type Panel = "login" | "signup" | null
type Pending =
  | { kind: "signup"; name: string; email: string }
  | { kind: "login"; email: string }
  | null

async function saveProfile(
  address: string,
  input: { displayName: string; email?: string },
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>
): Promise<string | null> {
  const payload = profilePayload({
    displayName: input.displayName,
    email: input.email,
  })
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
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return typeof data?.error === "string" ? data.error : "Could not create the account."
  }
  if (payload.email) writeLocalEmail(payload.email)
  return null
}

export function WelcomeCard() {
  const router = useRouter()
  const { address } = useAccount()
  const { connectAsync, connectors, isPending } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const connector = connectors.find((c) => c.id === "superdemocracy")
  const pending = useRef<Pending>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function openThisAccount(walletKey: unknown): Promise<`0x${string}` | null> {
    if (typeof walletKey !== "string") return null
    try {
      return await saveAccountKey(walletKey)
    } catch {
      return null
    }
  }

  useEffect(() => {
    if (!address) return
    let cancelled = false
    void fetch(`/api/me?address=${encodeURIComponent(address)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (typeof data?.profile?.email === "string") writeLocalEmail(data.profile.email)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [address])

  useEffect(() => {
    if (!address || !pending.current) return
    const job = pending.current
    pending.current = null
    void (async () => {
      setBusy(true)
      setError("")
      try {
        if (job.kind === "signup") {
          const failed = await saveProfile(address, { displayName: job.name, email: job.email }, signMessageAsync)
          if (failed) {
            setError(failed)
            return
          }
          setPanel(null)
          router.push("/orgs")
          return
        }
        setPanel(null)
        router.push("/orgs")
      } catch {
        setError("Could not finish. Try again.")
      } finally {
        setBusy(false)
      }
    })()
  }, [address, router, signMessageAsync])

  function enterAsGuest() {
    try {
      window.sessionStorage.setItem("sd-guest", "1")
    } catch {
      /* ignore */
    }
    router.push("/orgs")
  }

  async function submitSignup() {
    setError("")
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedName) {
      setError("Enter your name.")
      return
    }
    if (!emailLooksOk(trimmedEmail)) {
      setError("Enter an email address.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Those passwords don't match.")
      return
    }
    if (!connector) {
      setError("Sign-up is not available in this browser.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        pending.current = null
        setError(typeof data?.error === "string" ? data.error : "Could not create the account.")
        setBusy(false)
        return
      }
      const accountAddress = await openThisAccount(data.walletKey)
      if (!accountAddress) {
        pending.current = null
        setError("The account was created, but this browser could not open it. Log in to try again.")
        setBusy(false)
        return
      }
      setPassword("")
      setConfirm("")
      if (address?.toLowerCase() === accountAddress.toLowerCase()) {
        const failed = await saveProfile(address, { displayName: trimmedName, email: trimmedEmail }, signMessageAsync)
        if (failed) {
          setError(failed)
          setBusy(false)
          return
        }
        setPanel(null)
        router.push("/orgs")
        setBusy(false)
        return
      }
      if (!connector || connector.id !== "superdemocracy") {
        pending.current = null
        setError("The account was created, but this browser could not open it. Log in to try again.")
        setBusy(false)
        return
      }
      pending.current = { kind: "signup", name: trimmedName, email: trimmedEmail }
      setAccountKeyUnlocked(true)
      try {
        if (address) await disconnectAsync()
        await connectAsync({ connector })
      } catch {
        setPanel(null)
        router.push("/orgs")
        setBusy(false)
      }
    } catch {
      pending.current = null
      setBusy(false)
      setError("Could not create the account.")
    }
  }

  async function submitLogin() {
    setError("")
    const trimmedEmail = email.trim().toLowerCase()
    if (!emailLooksOk(trimmedEmail)) {
      setError("Enter the email on your account.")
      return
    }
    if (!password) {
      setError("Enter your password.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          existingKey: await readAccountKey().catch(() => null),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Could not sign in.")
        setBusy(false)
        return
      }
      const accountAddress = await openThisAccount(data.walletKey)
      if (!accountAddress) {
        setError("Signed in, but this browser could not open your account.")
        setBusy(false)
        return
      }
      setPassword("")
      if (!connector || connector.id !== "superdemocracy") {
        setError("Signed in, but this browser could not finish opening your account.")
        setBusy(false)
        return
      }
      if (address?.toLowerCase() === accountAddress.toLowerCase()) {
        setPanel(null)
        router.push("/orgs")
        setBusy(false)
        return
      }
      pending.current = { kind: "login", email: trimmedEmail }
      setAccountKeyUnlocked(true)
      try {
        if (address) await disconnectAsync()
        await connectAsync({ connector })
      } catch {
        setPanel(null)
        router.push("/orgs")
        setBusy(false)
      }
    } catch {
      pending.current = null
      setBusy(false)
      setError("Could not sign in.")
    }
  }

  const fieldClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-[#0E1C36] placeholder:text-zinc-400"

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setError("")
            setPassword("")
            setConfirm("")
            setPanel("signup")
          }}
          className="rounded-full bg-[#1B4FE0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1239B0]"
        >
          Signup
        </button>
        <button
          type="button"
          onClick={() => {
            setError("")
            setPassword("")
            setConfirm("")
            setPanel("login")
          }}
          className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Login
        </button>
      </div>

      {panel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E1C36]/45 p-6">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0"
            onClick={() => {
              if (busy) return
              setPanel(null)
              setError("")
            }}
          />
          <div className="relative z-10 w-full max-w-[420px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                if (busy) return
                setPanel(null)
                setError("")
              }}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-lg text-zinc-500 hover:bg-zinc-100"
            >
              ×
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#0E1C36]">
                {panel === "signup" ? "Create your account" : "Welcome back"}
              </h2>
              {panel === "login" && (
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Use the email and password on your account.
                </p>
              )}
            </div>
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (panel === "signup") void submitSignup()
                else void submitLogin()
              }}
            >
              {panel === "signup" && (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-zinc-700">Name</span>
                  <input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setError("")
                    }}
                    autoComplete="name"
                    placeholder="Your name"
                    className={fieldClass}
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                  }}
                  autoComplete="email"
                  placeholder="you@email.com"
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Password</span>
                <PasswordInput
                  value={password}
                  onChange={(value) => {
                    setPassword(value)
                    setError("")
                  }}
                  autoComplete={panel === "signup" ? "new-password" : "current-password"}
                  placeholder={panel === "signup" ? "At least 8 characters" : "Your password"}
                />
              </label>
              {panel === "signup" && (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-zinc-700">Confirm password</span>
                  <PasswordInput
                    value={confirm}
                    onChange={(value) => {
                      setConfirm(value)
                      setError("")
                    }}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                  />
                </label>
              )}
              {error && <p className="text-center text-sm text-red-700">{error}</p>}
              {panel === "login" && (
                <button
                  type="button"
                  className="w-full text-center text-sm font-semibold text-[#1B4FE0]"
                  onClick={() => setError("Password reset by email is not available yet.")}
                >
                  Forgot password?
                </button>
              )}
              <button
                type="submit"
                disabled={busy || isPending}
                className="w-full rounded-lg bg-[#1B4FE0] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1239B0] disabled:opacity-50"
              >
                {busy || isPending ? "Working…" : panel === "signup" ? "Create account" : "Log in"}
              </button>
              {panel === "signup" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={enterAsGuest}
                  className="w-full text-center text-sm font-semibold text-zinc-500 hover:text-[#0E1C36] disabled:opacity-50"
                >
                  Enter as guest
                </button>
              )}
              <p className="text-center text-sm text-zinc-500">
                {panel === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="font-semibold text-[#1B4FE0]"
                      onClick={() => {
                        setError("")
                        setPassword("")
                        setConfirm("")
                        setPanel("login")
                      }}
                    >
                      Log in
                    </button>
                  </>
                ) : (
                  <>
                    New here?{" "}
                    <button
                      type="button"
                      className="font-semibold text-[#1B4FE0]"
                      onClick={() => {
                        setError("")
                        setPassword("")
                        setConfirm("")
                        setPanel("signup")
                      }}
                    >
                      Create account
                    </button>
                  </>
                )}
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
