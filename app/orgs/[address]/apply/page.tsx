"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { safeAddress } from "@/lib/address";
import { isOffchainOrgId, normalizeOrgId } from "@/lib/org-id";
import { signOffchainAction } from "@/lib/sign-offchain-action";

export default function ApplyPage() {
  const { address: userAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const params = useParams();
  const router = useRouter();
  const orgAddress = params?.address as string;

  const [applicationText, setApplicationText] = useState("");

  const handleSubmit = async () => {
    try {
      const userAddr = safeAddress(userAddress);
      if (!userAddr) {
        alert("Connect a wallet to apply");
        return;
      }

      const orgKey = normalizeOrgId(orgAddress);
      const isCommunityManual = orgKey && isOffchainOrgId(orgKey);

      if (isCommunityManual) {
        const signed = await signOffchainAction({
          action: "community.applications.create",
          resourceId: orgKey,
          voterId: userAddr,
          payload: { message: applicationText },
          signMessageAsync,
        });
        const res = await fetch("/api/community-applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: orgKey,
            user: userAddr,
            message: applicationText,
            voterId: userAddr,
            ...signed,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 409 && data.status === "already_applied") {
          alert("Already applied");
          return;
        }

        if (res.ok && data.status === "pending") {
          alert("Application submitted");
          router.push("/");
          return;
        }

        alert(typeof data.error === "string" ? data.error : "Failed to submit application");
        return;
      }

      const orgAddr = safeAddress(orgAddress);
      if (!orgAddr) {
        alert("Missing organization address");
        return;
      }

      const res = await fetch("http://localhost:3001/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userAddr,
          org: orgAddr,
          message: applicationText,
        }),
      });

      const data = await res.json();

      if (data.status === "pending") {
        alert("Application submitted");
        router.push("/");
        return;
      }

      if (data.status === "already_applied") {
        alert("Already applied");
        return;
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit application");
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 p-6">
      <h1 className="text-2xl mb-4">Apply to Organization</h1>

      <textarea
        value={applicationText}
        onChange={(e) => setApplicationText(e.target.value)}
        className="w-full h-40 p-3 bg-white border border-zinc-200 rounded mb-4 text-zinc-900 placeholder:text-zinc-500"
        placeholder="Write your application..."
      />

      <button
        type="button"
        onClick={() => void handleSubmit()}
        className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
      >
        Submit Application
      </button>

      <button
        type="button"
        onClick={() => router.back()}
        className="ml-4 rounded border border-zinc-300 px-6 py-2 text-zinc-900 hover:bg-zinc-50"
      >
        Cancel
      </button>
    </div>
  );
}
