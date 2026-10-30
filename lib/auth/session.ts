import { NextResponse } from "next/server"
import { accountFromToken, type Account } from "./accounts"
import { readSessionToken } from "./cookie"

/** The signed-in account for this request, or null. */
export async function sessionAccount(request: Request): Promise<Account | null> {
  return accountFromToken(readSessionToken(request))
}

/**
 * The signed-in account, or a 401 response to return as-is.
 * Every write to governance data goes through this; nothing trusts an id in the body.
 */
export async function requireAccount(
  request: Request
): Promise<{ ok: true; account: Account } | { ok: false; response: NextResponse }> {
  const account = await sessionAccount(request)
  if (!account) {
    return { ok: false, response: NextResponse.json({ error: "Sign in first." }, { status: 401 }) }
  }
  return { ok: true, account }
}
