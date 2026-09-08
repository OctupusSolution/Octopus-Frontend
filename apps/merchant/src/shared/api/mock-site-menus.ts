// Mock data for the Menu inspector's "Connect a Saved Menu" picker — same
// "stands in for @octopus/api-client" rule as mock-dashboard.ts and
// mock-orders.ts. Shaped like a real API response (id, name, counts, a
// thumbnail URL) so swapping this for a `useSavedMenus()` query later is a
// one-file change.

export interface SavedMenu {
  id: string;
  name: string;
  itemCount: number;
  updatedDaysAgo: number;
  thumbnail: string;
}

function placeholderThumb(fill: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="8" fill="${fill}"/></svg>`
  )}`;
}

export const savedMenus: readonly SavedMenu[] = [
  {
    id: "menu-ocean-table-main",
    name: "Ocean table main menu",
    itemCount: 86,
    updatedDaysAgo: 2,
    thumbnail: placeholderThumb("#0D6EFD"),
  },
  {
    id: "menu-ramadan-specials",
    name: "Ramadan specials menu",
    itemCount: 32,
    updatedDaysAgo: 9,
    thumbnail: placeholderThumb("#F59E0B"),
  },
  {
    id: "menu-weekend-brunch",
    name: "Weekend brunch menu",
    itemCount: 21,
    updatedDaysAgo: 15,
    thumbnail: placeholderThumb("#16a34a"),
  },
] as const;
