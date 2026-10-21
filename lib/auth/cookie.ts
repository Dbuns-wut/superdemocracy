import { sessionCookie } from "./accounts"

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  return `${sessionCookie.name}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionCookie.maxAge}${secure}`
}

export function clearSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  return `${sessionCookie.name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
}

export function readSessionToken(request: Request): string | undefined {
  const raw = request.headers.get("cookie") ?? ""
  const parts = raw.split(";").map((p) => p.trim())
  const hit = parts.find((p) => p.startsWith(`${sessionCookie.name}=`))
  if (!hit) return undefined
  const value = hit.slice(sessionCookie.name.length + 1)
  return value || undefined
}
