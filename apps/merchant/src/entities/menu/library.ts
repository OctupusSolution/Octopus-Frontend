// Pure operations over a menu collection. The library page has no wizard-style
// step state to carry, so these are array transforms rather than a reducer —
// cheaper to test and impossible to leave in a half-applied state.
//
// `newId` and `now` are injected rather than read from `crypto` and `Date` so
// the tests are neither random nor clock-dependent.

import { channelStateFor, type Menu, type MenuSchedule, type MenuStatus } from "./menu";

export type LibrarySort = "recent" | "name" | "status";
export type LibraryChannel = "all" | "pos" | "publicLink" | "tableQr";

export interface LibraryFilters {
  query: string;
  area: string; // "all" or a branch id
  channel: LibraryChannel;
  sort: LibrarySort;
  includeArchived: boolean;
}

export const DEFAULT_FILTERS: LibraryFilters = {
  query: "",
  area: "all",
  channel: "all",
  sort: "recent",
  includeArchived: false,
};

const STATUS_ORDER: readonly MenuStatus[] = [
  "active", "scheduled", "pending", "on-hold", "expired", "archived",
];

export function filterMenus(menus: readonly Menu[], filters: LibraryFilters): Menu[] {
  const query = filters.query.trim().toLowerCase();

  const kept = menus.filter((menu) => {
    if (!filters.includeArchived && menu.status === "archived") return false;
    if (query && !menu.name.toLowerCase().includes(query)) return false;
    if (filters.area !== "all" && menu.branchId !== filters.area) return false;
    if (filters.channel !== "all" && menu.channels[filters.channel] !== "live") return false;
    return true;
  });

  return [...kept].sort((a, b) => {
    switch (filters.sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "status":
        return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      case "recent":
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });
}

// Status is not a card-local flag: holding a menu takes it off every channel
// it was serving. The frame draws this — a held menu shows "On hold" on both
// POS and Public Link, an archived one shows "Archived" on both.
export function setMenuStatus(
  menus: readonly Menu[],
  id: string,
  status: MenuStatus,
  now: string,
): Menu[] {
  const channel = channelStateFor(status);
  return menus.map((menu) =>
    menu.id === id
      ? {
          ...menu,
          status,
          channels: { pos: channel, publicLink: channel, tableQr: channel },
          updatedAt: now,
        }
      : menu,
  );
}

export function duplicateMenu(
  menus: readonly Menu[],
  id: string,
  newId: string,
  now: string,
): Menu[] {
  const index = menus.findIndex((menu) => menu.id === id);
  if (index === -1) return [...menus];

  const source = menus[index];
  const copy: Menu = {
    ...source,
    id: newId,
    name: `${source.name} (Copy)`,
    status: "pending",
    channels: { pos: "pending", publicLink: "pending", tableQr: "pending" },
    // A copy is a separate document: cloning the section array keeps an edit
    // to one from reaching the other.
    sections: source.sections.map((section) => ({ ...section, entries: [...section.entries] })),
    schedule: { ...source.schedule, days: [...source.schedule.days], branchIds: [...source.schedule.branchIds] },
    theme: { ...source.theme },
    updatedAt: now,
    publishedAt: null,
    version: 1,
  };

  return [...menus.slice(0, index + 1), copy, ...menus.slice(index + 1)];
}

export function deleteMenu(menus: readonly Menu[], id: string): Menu[] {
  return menus.filter((menu) => menu.id !== id);
}

export function setMenuSchedule(
  menus: readonly Menu[],
  id: string,
  schedule: MenuSchedule,
  now: string,
): Menu[] {
  return menus.map((menu) =>
    menu.id === id ? { ...menu, schedule, updatedAt: now } : menu,
  );
}

/** A menu cannot fall back to itself, and an archived menu cannot serve. */
export function fallbackCandidates(menus: readonly Menu[], id: string): Menu[] {
  return menus.filter((menu) => menu.id !== id && menu.status !== "archived");
}
