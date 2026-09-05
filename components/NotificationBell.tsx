"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type MemberInvite = {
  id: string;
  orgSlug: string;
  orgTitle: string;
  read: boolean;
  createdAt: number;
};

export function NotificationBell() {
  const { address } = useAccount();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<MemberInvite[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!address) {
      setInvites([]);
      return;
    }
    try {
      const res = await fetch(`/api/member-invites?user=${encodeURIComponent(address)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.invites)) {
        setInvites(data.invites);
      }
    } catch {
      /* ignore */
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const id = setInterval(load, 45_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(id);
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

  const unread = invites.filter((i) => !i.read).length;

  const openApply = async (inv: MemberInvite) => {
    if (address) {
      try {
        await fetch(`/api/member-invites/${encodeURIComponent(inv.id)}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: address }),
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
          {!address ? (
            <p className="p-3 text-sm text-zinc-600">Connect a wallet to see invitations.</p>
          ) : invites.length === 0 ? (
            <p className="p-3 text-sm text-zinc-500">No invitations yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {invites.map((inv) => (
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
