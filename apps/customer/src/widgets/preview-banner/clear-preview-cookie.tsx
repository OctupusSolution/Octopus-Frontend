"use client";

import { useEffect } from "react";
import { PREVIEW_EXIT_PATH } from "@/shared/lib/preview";

/**
 * Rendered when the visitor holds a preview cookie the API no longer honours (invalid, expired
 * or revoked: the API does not say which, and neither do we). A server component cannot change
 * cookies, so the page drops it with one quiet request; the visitor just sees the 404.
 */
export function ClearPreviewCookie() {
  useEffect(() => {
    void fetch(`${PREVIEW_EXIT_PATH}?quiet=1`, { method: "GET", cache: "no-store", credentials: "same-origin" }).catch(() => undefined);
  }, []);
  return null;
}
