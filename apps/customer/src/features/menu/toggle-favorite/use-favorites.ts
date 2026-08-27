"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "octopus_storefront_favorites";

/** Favourites are a client-only convenience until customer accounts exist —
 *  nothing is synced anywhere. Storage is read in an effect rather than during
 *  render, so the server and the first client paint agree. */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw) as string[]);
    } catch {
      // Unreadable storage just means no favourites yet.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Skip writes until hydration has run, or the empty initial state
    // overwrites whatever was saved before this mount.
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids, hydrated]);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  return { isFavorite, toggle };
}
