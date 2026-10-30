"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth/use-session";

type MemberInvite = {
  id: string;
  orgSlug: string;
  orgTitle: string;
  read: boolean;
  createdAt: number;
};

export function NotificationBell() {
  const { account } = useSession();
  const accountId = account?.id ?? null;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<MemberInvite[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!accountId) return;
    try {
      const res = await fetch("/api/member-invites", { credentials: "include" });
      if (!res.ok) return;
      const data: unknown = await res.json();
      const invites =
        data && typeof data === "object" && "invites" in data ? data.invites : undefined;
      if (!Array.isArray(invites)) return;
      setLoadedFor(accountId);
      setInvites(
        invites.flatMap((row) => {
          if (!row || typeof row !== "object") return [];
          const item = row as Record<string, unknown>;
          if (
            typeof item.id !== "string" ||
            typeof item.orgSlug !== "string" ||
            typeof item.orgTitle !== "string" ||
            typeof item.read !== "boolean" ||
            typeof item.createdAt !== "number"
          ) {
            return [];
          }
          return [
            {
              id: item.id,
              orgSlug: item.orgSlug,
              orgTitle: item.orgTitle,
              read: item.read,
              createdAt: item.createdAt,
            },
          ];
        })
      );
    } catch {
      /* ignore */
    }
  }, [accountId]);

  useEffect(() => {
    const kick = window.setTimeout(() => {
      void load();
    }, 0);
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => {
      void load();
    }, 45_000);
    return () => {
      window.clearTimeout(kick);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const shownInvites = accountId && loadedFor === accountId ? invites : [];
  const unread = shownInvites.filter((i) => !i.read).length;

  const openApply = async (inv: MemberInvite) => {
    if (accountId) {
      try {
        await fetch(`/api/member-invites/${encodeURIComponent(inv.id)}/read`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        /* still navigate */
      }
    }
    setInvites((prev) =>
      prev.map((i) => (i.id === inv.id ? { ...i, read: true } : i))
    );
    setOpen(false);
    router.push(`/orgs/${encodeURIComponent(inv.orgSlug)}/apply`);
  };

  return (
    <div className="fixed top-3 right-3 z-50" ref={panelRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50"
      >
        <span aria-hidden className="text-lg">
          🔔
        </span>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1.125rem] rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-tight text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900">
            Invitations
          </div>
          {!accountId ? (
            <p className="p-3 text-sm text-zinc-600">Sign in to see these.</p>
          ) : shownInvites.length === 0 ? (
            <p className="p-3 text-sm text-zinc-500">No invitations yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {shownInvites.map((inv) => (
                <li key={inv.id}>
                  <button
                    type="button"
                    onClick={() => openApply(inv)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 ${
                      inv.read ? "text-zinc-600" : "bg-blue-50/80 font-medium text-zinc-900"
                    }`}
                  >
                    <span className="block truncate">{inv.orgTitle}</span>
                    <span className="block text-xs text-zinc-500">
                      You were invited to apply to join
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
