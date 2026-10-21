const KEY = "sd-account-email"

export function readLocalEmail(): string {
  if (typeof window === "undefined") return ""
  try {
    return window.localStorage.getItem(KEY)?.trim().toLowerCase() ?? ""
  } catch {
    return ""
  }
}

export function writeLocalEmail(email: string): void {
  if (typeof window === "undefined") return
  try {
    const value = email.trim().toLowerCase()
    if (!value) window.localStorage.removeItem(KEY)
    else window.localStorage.setItem(KEY, value)
  } catch {
    /* ignore */
  }
}
