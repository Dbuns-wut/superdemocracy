"use client"
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

import { AppSidebar } from "@/components/AppSidebar"

export default function ReferendumsPage() {
  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <AppSidebar active="referendums" />

      <div className="ml-48 flex flex-1 justify-center p-8">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-semibold text-zinc-900">Referendums</h1>

          <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
            <p className="text-sm text-gray-400">No referendums yet.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
