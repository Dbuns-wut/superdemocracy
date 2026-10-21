"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { safeAddress } from "@/lib/address";
import { isOffchainOrgId, normalizeOrgId } from "@/lib/org-id";
import { signOffchainAction } from "@/lib/sign-offchain-action";
import type { JoinRequirementField } from "@/lib/org-settings/types";

type FieldValue = { text: string; fileId: string; fileName: string }

export default function ApplyPage() {
  const { address: userAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const params = useParams();
  const router = useRouter();
  const orgAddress = params?.address as string;

  const [applicationText, setApplicationText] = useState("");
  const [joinFields, setJoinFields] = useState<JoinRequirementField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const orgKey = normalizeOrgId(orgAddress);
    if (!orgKey || !isOffchainOrgId(orgKey)) return;
    let cancelled = false;
    ;(async () => {
      const res = await fetch(`/api/org-settings/${encodeURIComponent(orgKey)}`);
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      const fields = Array.isArray(data?.settings?.joinRequirements)
        ? (data.settings.joinRequirements as JoinRequirementField[])
        : [];
      setJoinFields(fields);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgAddress]);

  const uploadFile = async (fieldId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/join-files", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.file?.id) {
      throw new Error(typeof data.error === "string" ? data.error : "Upload failed");
    }
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: { text: "", fileId: data.file.id, fileName: file.name },
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      const userAddr = safeAddress(userAddress);
      if (!userAddr) {
        setError("Sign in to apply.");
        return;
      }

      const orgKey = normalizeOrgId(orgAddress);
      const isCommunityManual = orgKey && isOffchainOrgId(orgKey);

      if (isCommunityManual) {
        for (const field of joinFields) {
          const v = fieldValues[field.id];
          const filled = field.type === "file" ? Boolean(v?.fileId) : Boolean(v?.text?.trim());
          if (field.required && !filled) {
            setError(`${field.label} is required`);
            return;
          }
        }
        const answers = joinFields.map((field) => ({
          fieldId: field.id,
          label: field.label,
          type: field.type,
          value: field.type === "file" ? fieldValues[field.id]?.fileId ?? "" : fieldValues[field.id]?.text?.trim() ?? "",
        }));
        setBusy(true);
        const signed = await signOffchainAction({
          action: "community.applications.create",
          resourceId: orgKey,
          voterId: userAddr,
          payload: { message: applicationText, answers },
          signMessageAsync,
        });
        const res = await fetch("/api/community-applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: orgKey,
            user: userAddr,
            message: applicationText,
            answers,
            voterId: userAddr,
            ...signed,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 409 && data.status === "already_applied") {
          setError("Already applied");
          return;
        }

        if (res.ok && data.status === "pending") {
          router.push("/");
          return;
        }

        setError(typeof data.error === "string" ? data.error : "Failed to submit application");
        return;
      }

      const orgAddr = safeAddress(orgAddress);
      if (!orgAddr) {
        setError("Missing organization address");
        return;
      }

      setBusy(true);
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
        router.push("/");
        return;
      }

      if (data.status === "already_applied") {
        setError("Already applied");
        return;
      }
      setError("Failed to submit application");
    } catch (err) {
      console.error(err);
      setError("Failed to submit application");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 p-6">
      <h1 className="text-2xl mb-4">Apply to Organization</h1>

      {joinFields.map((field) => (
        <div key={field.id} className="mb-4">
          <label className="mb-1 block text-sm font-medium text-zinc-800">
            {field.label}
            {field.required ? " *" : ""}
          </label>
          {field.type === "file" ? (
            <div>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(field.id, file).catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : "Upload failed");
                  });
                }}
                className="block text-sm text-zinc-700"
              />
              {fieldValues[field.id]?.fileName && (
                <p className="mt-1 text-xs text-zinc-500">Attached: {fieldValues[field.id].fileName}</p>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={fieldValues[field.id]?.text ?? ""}
              onChange={(e) =>
                setFieldValues((prev) => ({
                  ...prev,
                  [field.id]: { text: e.target.value, fileId: "", fileName: "" },
                }))
              }
              className="w-full p-3 bg-white border border-zinc-200 rounded text-zinc-900"
            />
          )}
        </div>
      ))}

      <textarea
        value={applicationText}
        onChange={(e) => setApplicationText(e.target.value)}
        className="w-full h-40 p-3 bg-white border border-zinc-200 rounded mb-4 text-zinc-900 placeholder:text-zinc-500"
        placeholder="Write your application..."
      />

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={busy}
        onClick={() => void handleSubmit()}
        className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit Application"}
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
