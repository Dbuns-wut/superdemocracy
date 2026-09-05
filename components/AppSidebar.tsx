"use client"

import Link from "next/link"

type AppSidebarActive =
  | "me"
  | "orgs"
  | "petitions"
  | "messages"
  | "referendums"
  | "settings"

export function AppSidebar({
  active,
  brandLogoSrc,
}: {
  active: AppSidebarActive
  /** Org profile image (data URL or path); falls back to app logo. */
  brandLogoSrc?: string | null
}) {
  const custom = Boolean(brandLogoSrc?.trim())
  const logoSrc = custom ? brandLogoSrc!.trim() : "/logo.png"

  const linkClass = (key: AppSidebarActive) =>
    `flex items-center gap-3 mb-8 p-3 rounded ${
      active === key ? "bg-zinc-200 font-medium" : "hover:bg-zinc-100"
    }`

  return (
    <div className="w-48 border-r border-zinc-200 bg-white p-6 flex flex-col fixed h-screen">
      <img
        src={logoSrc}
        alt=""
        className={`mx-auto size-[7.875rem] rounded-2xl mb-10 ${
          custom ? "object-cover" : "object-contain"
        }`}
      />

      <Link href="/me" className={linkClass("me")}>
        👤 <span>Manage My ID</span>
      </Link>

      <Link href="/" className={linkClass("orgs")}>
        👥 <span>Orgs</span>
      </Link>

      <Link href="/petitions" className={linkClass("petitions")}>
        📜 <span>Petitions</span>
      </Link>

      <Link href="/messages" className={linkClass("messages")}>
        💬 <span>Messages</span>
      </Link>

      <Link href="/referendums" className={linkClass("referendums")}>
        🗳️ <span>Referendums</span>
      </Link>

      <Link href="/settings" className={`${linkClass("settings")} mt-auto`}>
        ⚙️ <span>Settings</span>
      </Link>
    </div>
  )
}
