"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { PersonPicker } from "@/components/PersonPicker";
import { useSession } from "@/lib/auth/use-session";
import type { DirectMessage } from "@/lib/messages/store";
import { usePeople } from "@/lib/people/use-people";

function MessagesComposer() {
  const searchParams = useSearchParams();
  const { account } = useSession();
  const accountId = account?.id ?? null;
  const org = searchParams.get("org") ?? "";
  const draftParam = searchParams.get("draft") ?? "";
  const toParam = searchParams.get("to") ?? "";
  const [recipient, setRecipient] = useState<string | null>(toParam || null);
  const [message, setMessage] = useState(draftParam);
  const [inbox, setInbox] = useState<DirectMessage[]>([]);
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMessage(draftParam);
  }, [draftParam]);

  const loadInbox = useCallback(async () => {
    if (!accountId) {
      setInbox([]);
      return;
    }
    const res = await fetch("/api/messages", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.messages)) setInbox(data.messages);
  }, [accountId]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  const counterparts = useMemo(() => inbox.flatMap((m) => [m.from, m.to]), [inbox]);
  const { nameOf } = usePeople(counterparts);

  const handleSend = async () => {
    if (!accountId) {
      setStatus("Sign in to send.");
      return;
    }
    if (!recipient || !message.trim()) {
      setStatus("Recipient and message are required.");
      return;
    }
    setSending(true);
    setStatus("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient, body: message.trim(), orgId: org || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(typeof data.error === "string" ? data.error : "Could not send");
        return;
      }
      setMessage("");
      setRecipient(null);
      setStatus("Sent.");
      await loadInbox();
    } catch {
      setStatus("Could not send.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <AppSidebar active="messages" />
      <div className="ml-48 flex-1 p-8 max-w-2xl">
        <h1 className="text-2xl font-semibold text-zinc-900">Messages</h1>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">To</label>
            <PersonPicker
              value={recipient}
              onChange={(id) => setRecipient(id)}
              exclude={accountId ? [accountId] : []}
              disabled={!accountId}
              placeholder="Search a member by name or email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full rounded border border-zinc-200 bg-white p-3 text-zinc-900"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sending || !accountId}
              onClick={() => void handleSend()}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send"}
            </button>
            {org ? (
              <Link
                href={`/orgs/${encodeURIComponent(org)}`}
                className="rounded border border-zinc-300 bg-white px-4 py-2 text-zinc-800 hover:bg-zinc-50"
              >
                Back
              </Link>
            ) : (
              <Link
                href="/"
                className="rounded border border-zinc-300 bg-white px-4 py-2 text-zinc-800 hover:bg-zinc-50"
              >
                Home
              </Link>
            )}
          </div>
          {status && <p className="text-sm text-zinc-600">{status}</p>}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-medium text-zinc-900">Inbox</h2>
          {!accountId ? (
            <p className="mt-3 text-sm text-zinc-500">Sign in to see your messages.</p>
          ) : inbox.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No messages yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-200 border border-zinc-200 rounded">
              {inbox.map((m) => {
                const mine = m.from.toLowerCase() === accountId.toLowerCase();
                return (
                  <li key={m.id} className="p-3">
                    <p className="text-xs text-zinc-500">
                      {mine ? `To ${nameOf(m.to)}` : `From ${nameOf(m.from)}`}
                      {" · "}
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{m.body}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-zinc-600">
          Loading…
        </div>
      }
    >
      <MessagesComposer />
    </Suspense>
  );
}
