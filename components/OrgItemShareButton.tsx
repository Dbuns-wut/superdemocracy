"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type OrgShareKind = "event" | "poll" | "vote" | "petition" | "referendum";

const KIND_PIN_LABEL: Record<OrgShareKind, string> = {
  event: "📅 Event",
  poll: "📊 Poll",
  vote: "🗳️ Community vote",
  petition: "📜 Petition",
  referendum: "⚖️ Referendum",
};

function buildDeepLink(
  origin: string,
  orgPathSegment: string,
  kind: OrgShareKind,
  resourceId: string,
  overrideSharePath?: string
): string {
  if (overrideSharePath?.trim()) {
    const p = overrideSharePath.trim();
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    const path = p.startsWith("/") ? p : `/${p}`;
    return `${origin}${path}`;
  }
  const base = `${origin}/orgs/${encodeURIComponent(orgPathSegment)}`;
  return `${base}?share=${encodeURIComponent(kind)}&shareId=${encodeURIComponent(resourceId)}`;
}

function buildShareBody(title: string, url: string, description?: string): string {
  const lines = [title, "", url];
  const d = description?.trim();
  if (d) lines.push("", d.length > 800 ? `${d.slice(0, 800)}…` : d);
  return lines.join("\n");
}

function buildPinnedNote(kind: OrgShareKind, title: string, url: string, description?: string): string {
  const head = `${KIND_PIN_LABEL[kind]}: ${title}`;
  const d = description?.trim();
  const body = d ? (d.length > 400 ? `${d.slice(0, 400)}…` : d) : "";
  return [head, url, body].filter(Boolean).join("\n");
}

function buildShareBlurb(title: string, url: string, description?: string): string {
  const d = description?.trim();
  const snippet = d ? (d.length > 180 ? `${d.slice(0, 180)}…` : d) : "";
  return snippet ? `${title}\n\n${snippet}\n\n${url}` : `${title}\n\n${url}`;
}

function openExternal(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

/** SMS / Messages deep links only work on most phones; desktop browsers usually ignore them. */
function isPhoneLikeUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

/** 14×14 brand / UI marks (names per user request: logo after label). */
function IconFacebook() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.446 18.627 0 12 0S0 5.446 0 12.073c0 5.988 4.391 10.952 10.124 11.854v-8.385H7.077v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.532-4.669 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.955.925-1.955 1.874V12.9h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      {/* Solid mark avoids duplicate gradient IDs when many Share menus mount. */}
      <path
        fill="#E4405F"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
      />
    </svg>
  );
}

function IconX() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path fill="#000" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#25D366"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

function IconSms() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
      />
    </svg>
  );
}

function IconLink() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
      />
    </svg>
  );
}

function IconDm() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function IconPin() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-blue-700" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 17v5M8 21h8M12 3l7 7H5l7-7zM5 10h14"
      />
    </svg>
  );
}

function MenuRow({
  label,
  icon,
  onClick,
  pin,
}: {
  label: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  pin?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-1 px-2 py-1.5 text-left text-[11px] leading-tight hover:bg-zinc-100 ${
        pin ? "font-medium text-blue-800 hover:bg-blue-50" : "text-zinc-800"
      }`}
    >
      <span className="min-w-0 flex-1 break-words">{label}</span>
      {icon}
    </button>
  );
}

export type OrgItemShareButtonProps = {
  orgPathSegment: string;
  kind: OrgShareKind;
  resourceId: string;
  title: string;
  description?: string;
  overrideSharePath?: string;
  isAdmin?: boolean;
  onPinToHomepage?: (pinnedText: string) => void;
  className?: string;
  menuAlign?: "left" | "right";
};

export function OrgItemShareButton({
  orgPathSegment,
  kind,
  resourceId,
  title,
  description,
  overrideSharePath,
  isAdmin,
  onPinToHomepage,
  className = "",
  menuAlign = "right",
}: OrgItemShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [showSmsShare, setShowSmsShare] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setShowSmsShare(isPhoneLikeUserAgent());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = buildDeepLink(origin, orgPathSegment, kind, resourceId, overrideSharePath);
  const body = buildShareBody(title, url, description);
  const shareBlurb = buildShareBlurb(title, url, description);
  const showPin = Boolean(isAdmin && onPinToHomepage);

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const xText =
    shareBlurb.length > 240 ? `${title.slice(0, 120)}${title.length > 120 ? "…" : ""}\n\n${url}` : shareBlurb;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(body)}`;

  const close = () => setOpen(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy link:", url);
    }
    close();
  };

  const copyForInstagram = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy link for Instagram:", url);
    }
    close();
  };

  const openDm = () => {
    const q = new URLSearchParams();
    if (orgPathSegment) q.set("org", orgPathSegment);
    q.set("kind", kind);
    q.set("shareId", resourceId);
    q.set("draft", body.slice(0, 1800));
    router.push(`/messages?${q.toString()}`);
    close();
  };

  const openSms = () => {
    const maxLen = 900;
    const smsBody = body.length > maxLen ? `${title}\n\n${url}` : body;
    const href = `sms:?body=${encodeURIComponent(smsBody)}`;
    try {
      const a = document.createElement("a");
      a.href = href;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.location.href = href;
    }
    close();
  };

  const pin = () => {
    if (!onPinToHomepage) return;
    onPinToHomepage(buildPinnedNote(kind, title, url, description));
    close();
  };

  /** ~50% of previous 17rem cap → 8.5rem */
  const menuWidthClass = "w-[min(8.5rem,calc(100vw-2rem))]";

  return (
    <div className={`relative inline-block ${className}`} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
      >
        Share
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-1 max-h-[min(24rem,70vh)] ${menuWidthClass} overflow-y-auto rounded-md border border-zinc-200 bg-white py-0.5 text-left shadow-lg ${
            menuAlign === "right" ? "right-0" : "left-0"
          }`}
          role="menu"
        >
          <MenuRow label="Copy link" icon={<IconLink />} onClick={copyLink} />
          <div className="my-0.5 border-t border-zinc-100" />
          <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-zinc-500 leading-none">
            Share with
          </p>
          <MenuRow
            label="Facebook"
            icon={<IconFacebook />}
            onClick={() => {
              openExternal(facebookHref);
              close();
            }}
          />
          <MenuRow label="Instagram" icon={<IconInstagram />} onClick={copyForInstagram} />
          <MenuRow
            label="X"
            icon={<IconX />}
            onClick={() => {
              openExternal(xHref);
              close();
            }}
          />
          <MenuRow
            label="WhatsApp"
            icon={<IconWhatsApp />}
            onClick={() => {
              openExternal(whatsappHref);
              close();
            }}
          />
          {showSmsShare && <MenuRow label="SMS" icon={<IconSms />} onClick={openSms} />}
          <MenuRow label="DM" icon={<IconDm />} onClick={openDm} />
          {showPin && (
            <>
              <div className="my-0.5 border-t border-zinc-100" />
              <MenuRow label="Pin to org homepage" icon={<IconPin />} onClick={pin} pin />
            </>
          )}
        </div>
      )}
    </div>
  );
}
