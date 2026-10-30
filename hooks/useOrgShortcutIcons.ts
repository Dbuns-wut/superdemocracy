"use client";

import { useEffect } from "react";

const FAV_ID = "dynamic-org-shortcut-icon";
const APPLE_ID = "dynamic-org-shortcut-apple-touch";

/**
 * Sets favicon + apple-touch-icon for “Add to Home Screen” / desktop shortcuts.
 * Cleans up on unmount so other routes fall back to the app default.
 */
export function useOrgShortcutIcons(logoHref: string | null | undefined, enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    const trimmed = logoHref?.trim();
    if (!trimmed) return;

    const upsert = (rel: string, id: string) => {
      let el = document.getElementById(id) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.id = id;
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = trimmed;
    };

    upsert("icon", FAV_ID);
    upsert("apple-touch-icon", APPLE_ID);

    return () => {
      document.getElementById(FAV_ID)?.remove();
      document.getElementById(APPLE_ID)?.remove();
    };
  }, [enabled, logoHref]);
}
