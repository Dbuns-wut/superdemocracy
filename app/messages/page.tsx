"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { AppSidebar } from "@/components/AppSidebar";
import { shortAddress } from "@/lib/address";
import { signOffchainAction } from "@/lib/sign-offchain-action";
import type { DirectMessage } from "@/lib/messages/store";

function MessagesComposer() {
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const org = searchParams.get("org") ?? "";
  const draftParam = searchParams.get("draft") ?? "";
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState(draftParam);
  const [inbox, setInbox] = useState<DirectMessage[]>([]);
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMessage(draftParam);
  }, [draftParam]);

  const loadInbox = useCallback(async () => {
    if (!address) {
      setInbox([]);
      return;
    }
    const res = await fetch(`/api/messages?user=${encodeURIComponent(address)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.messages)) setInbox(data.messages);
  }, [address]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  const handleSend = async () => {
    if (!address) {
      setStatus("Connect your wallet to send.");
      return;
    }
    if (!recipient.trim() || !message.trim()) {
      setStatus("Recipient and message are required.");
      return;
    }
    setSending(true);
    setStatus("");
    try {
      const body = message.trim();
      const to = recipient.trim();
      const signed = await signOffchainAction({
        action: "messages.send",
        resourceId: to,
        voterId: address,
        payload: { to, body, orgId: org || null },
        signMessageAsync,
      });
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: address,
          to,
          body,
          orgId: org || null,
          voterId: address,
          ...signed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(typeof data.error === "string" ? data.error : "Could not send");
        return;
      }
      setMessage("");
      setRecipient("");
      setStatus("Sent.");
      await loadInbox();
    } catch {
      setStatus("Send canceled or failed.");
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
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Member address"
              className="w-full rounded border border-zinc-200 bg-white p-2 text-zinc-900 placeholder:text-zinc-500"
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
              disabled={sending || !address}
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
          {!address ? (
            <p className="mt-3 text-sm text-zinc-500">Connect to see messages.</p>
          ) : inbox.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No messages yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-200 border border-zinc-200 rounded">
              {inbox.map((m) => {
                const mine = m.from.toLowerCase() === address.toLowerCase();
                return (
                  <li key={m.id} className="p-3">
                    <p className="text-xs text-zinc-500">
                      {mine ? `To ${shortAddress(m.to)}` : `From ${shortAddress(m.from)}`}
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
