"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import Link from "next/link"
import { useAccount, useDisconnect } from "wagmi"
import { AppSidebar } from "@/components/AppSidebar"
import { shortAddress } from "@/lib/address"

export default function SettingsPage() {
  const { address, isConnected } = useAccount()
  const { disconnect, isPending } = useDisconnect()

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <AppSidebar active="settings" />

      <div className="ml-48 flex flex-1 justify-center p-8">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>

          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-sm font-medium text-zinc-700">Your account</h2>
              {isConnected && address ? (
                <p className="mt-1 text-sm text-zinc-500">{shortAddress(address)}</p>
              ) : (
                <p className="mt-1 text-sm text-zinc-500">Not connected</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/me"
                  className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
                >
                  Manage My ID
                </Link>
                {isConnected && (
                  <button
                    type="button"
                    onClick={() => disconnect()}
                    disabled={isPending}
                    className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {isPending ? "Disconnecting…" : "Disconnect"}
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
