// The library's single owner. One module-level array plus useSyncExternalStore,
// which is the smallest thing that is actually shared.
//
// It began as plain useState, which was wrong in a way nothing caught until a
// second component needed the same data: useState gives every caller its own
// copy, so the menu that /menu/new/scratch created was invisible to the wizard
// that was supposed to edit it, and the builder bounced straight back to the
// library. "The single owner" has to mean one array, not one hook.
//
// Still in memory, and deliberately still the ONLY place the collection is read
// or written — the spec's Persistence section records why that trade was taken
// for this stage. Swapping this body for localStorage, or for a TanStack Query
// cache once /menus exists, edits this file and no other: callers already treat
// `menus` as owned elsewhere and `setMenus` as the only way to change it, which
// is exactly the contract a query hook offers.
//
// Known cost, accepted: the library resets on reload, so a menu saved as a
// draft is gone after F5.

import { useCallback, useSyncExternalStore } from "react";
import type { Menu } from "./menu";
import { SEED_MENUS } from "./seed";

let menus: Menu[] = SEED_MENUS;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Menu[] {
  return menus;
}

export function useMenuLibrary() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setMenus = useCallback((next: Menu[]) => {
    menus = next;
    for (const listener of listeners) listener();
  }, []);

  return { menus: value, setMenus };
}
