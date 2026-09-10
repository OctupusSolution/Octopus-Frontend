// The library's single owner. React state over the seed, nothing more — the
// same posture as mock-reservations and every other merchant module, because
// the backend has not published a menus endpoint to write against yet.
//
// This is deliberately the ONLY place the collection is read or written. Every
// page and action goes through it, so replacing the body with localStorage, or
// with a TanStack Query cache once /menus exists, edits this file and no other.
// Callers already treat `menus` as owned elsewhere and `setMenus` as the only
// way to change it, which is exactly the contract a query hook offers.
//
// Known cost, accepted for this stage: the library resets on reload, so a menu
// saved as a draft is gone after F5. The spec's Persistence section records
// why that trade was taken rather than papering over it.

import { useCallback, useState } from "react";
import type { Menu } from "./menu";
import { SEED_MENUS } from "./seed";

export function useMenuLibrary() {
  const [menus, setMenusState] = useState<Menu[]>(SEED_MENUS);
  const setMenus = useCallback((next: Menu[]) => setMenusState(next), []);
  return { menus, setMenus };
}
