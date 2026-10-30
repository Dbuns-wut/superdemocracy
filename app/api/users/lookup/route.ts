import { NextResponse } from "next/server"
import { publicAccountsByIds } from "@/lib/auth/accounts"
import { requireAccount } from "@/lib/auth/session"
import { getProfilesByAccountIds } from "@/lib/identity/store"

/**
 * Names and photos for a list of participant ids, so screens can show people instead of ids.
 * Signed-in only. Returns only display fields.
 */
export async function POST(request: Request) {
  const auth = await requireAccount(request)
  if (!auth.ok) return auth.response
  let body: { ids?: unknown }
  try {
    body = (await request.json()) as { ids?: unknown }
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 500) : []
  const [accounts, profiles] = await Promise.all([publicAccountsByIds(ids), getProfilesByAccountIds(ids)])
  const people: Record<string, { id: string; name: string; avatarUrl?: string }> = {}
  for (const [key, account] of Object.entries(accounts)) {
    const profile = profiles[key]
    people[key] = {
      id: account.id,
      name: profile?.displayName || account.name,
      ...(profile?.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
    }
  }
  return NextResponse.json({ people })
}
