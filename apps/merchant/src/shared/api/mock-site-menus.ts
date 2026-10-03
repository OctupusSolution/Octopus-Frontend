// Mock data for the Menu inspector's "Connect a Saved Menu" picker — same
// "stands in for @octopus/api-client" rule as mock-dashboard.ts and
// mock-orders.ts. Shaped like a real API response (id, name, counts, a
// thumbnail URL) so swapping this for a `useSavedMenus()` query later is a
// one-file change.

import { storefrontAsset } from "@/shared/lib/storefront-assets";

export interface SavedMenu {
  id: string;
  name: string;
  itemCount: number;
  updatedDaysAgo: number;
  thumbnail: string;
}

// Real storefront photography rather than flat colour squares — the frame shows
// a dish on the connected menu, and a solid swatch read as a broken image.
export const savedMenus: readonly SavedMenu[] = [
  {
    id: "menu-ocean-table-main",
    name: "Ocean table main menu",
    itemCount: 86,
    updatedDaysAgo: 2,
    thumbnail: storefrontAsset("all.png"),
  },
  {
    id: "menu-ramadan-specials",
    name: "Ramadan specials menu",
    itemCount: 32,
    updatedDaysAgo: 9,
    thumbnail: storefrontAsset("meat.webp"),
  },
  {
    id: "menu-weekend-brunch",
    name: "Weekend brunch menu",
    itemCount: 21,
    updatedDaysAgo: 15,
    thumbnail: storefrontAsset("breakfast.webp"),
  },
] as const;
