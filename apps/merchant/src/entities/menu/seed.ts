// The nine menus the library frame draws, with its statuses. Stands in for
// @octopus/api-client until the backend publishes a spec, the same posture as
// the rest of the merchant app.
//
// Section and item counts are not stored — the cards read them through
// sectionCount() and entryCount() over real (empty-bodied) rows, so the
// numbers cannot drift from the data.

import {
  WEEKDAYS,
  channelStateFor,
  type Item,
  type Menu,
  type MenuStatus,
  type Section,
} from "./menu";
import { OFFERS_SECTION_ID } from "./draft";

export const SEED_BRANCHES: readonly { id: string; label: string }[] = [
  { id: "jeddah-corniche", label: "Jeddah - Corniche" },
  { id: "riyadh-olaya", label: "Riyadh - Olaya" },
  { id: "dammam-corniche", label: "Dammam - Corniche" },
];

// Offers comes last and keeps the id "offers": every menu's built-in offers
// section is found by that id and must stay at the end (see draft.ts). Seeding
// it mid-list under a generated id made it draggable, deletable and invisible
// to the offers editor.
const SECTION_NAMES = [
  "Breakfast", "Starters", "Mains", "Desserts", "Drinks",
  "Grills", "Salads", "Sandwiches", "Pasta", "Burgers", "Sides", "Offers",
] as const;

function seedItem(sectionId: string, index: number): Item {
  return {
    id: `${sectionId}-i${index}`,
    name: `Item ${index + 1}`,
    shortName: `Item ${index + 1}`,
    description: "",
    sku: "",
    image: null,
    video: null,
    tags: [],
    status: "active",
    availability: { available: true, delivery: true, takeaway: true, dineIn: true },
    schedule: { mode: "all-day" },
    modifierGroups: [],
    pricing: { price: 90, vatRate: 0.15 },
    nutrition: { calories: null, protein: null, carb: null, fat: null },
    allergies: { allergens: [], note: "" },
  };
}

// Twelve sections, ten items each — the 12 and 120 the cards show.
function seedSections(menuId: string): Section[] {
  return SECTION_NAMES.map((name, index) => {
    const id = name === "Offers" ? OFFERS_SECTION_ID : `${menuId}-s${index}`;
    return {
      id,
      kind: name === "Offers" ? "offers" : "items",
      name,
      image: null,
      description: "",
      visibility: "visible",
      displayStyle: "list",
      color: null,
      entries: name === "Offers" ? [] : Array.from({ length: 10 }, (_, i) => seedItem(id, i)),
    };
  });
}

// The Offers section carries no seeded entries, so its ten are made up
// elsewhere: the last item section takes an extra ten to keep the visible
// total at 120.
function balanced(sections: Section[]): Section[] {
  const items = sections.filter((s) => s.kind !== "offers");
  if (items.length === sections.length) return sections;
  const donor = items[items.length - 1];
  return sections.map((section) =>
    section.id === donor.id
      ? { ...section, entries: [...section.entries, ...Array.from({ length: 10 }, (_, i) => seedItem(donor.id, 10 + i))] }
      : section,
  );
}

function seedMenu(
  id: string,
  name: string,
  status: MenuStatus,
  updatedAt: string,
  branchId: string,
): Menu {
  const channel = channelStateFor(status);
  return {
    id,
    name,
    cover: null,
    status,
    branchId,
    sections: balanced(seedSections(id)),
    theme: {
      presetId: "ocean",
      navStyle: "top-bar",
      categoryStyle: "icon-text",
      cardStyle: "classic",
      itemDetails: "same-page",
      stickyAddToCart: true,
      showItemTags: true,
    },
    schedule: {
      type: "all-day",
      start: "00:00",
      end: "23:59",
      days: [...WEEKDAYS],
      timezone: "Asia/Riyadh",
      branchIds: [branchId],
      fallbackMenuId: null,
      allowPreorderOutsideSchedule: false,
    },
    channels: { pos: channel, publicLink: channel, tableQr: channel },
    updatedAt,
    publishedAt: status === "active" ? updatedAt : null,
    version: 1,
  };
}

const J = "jeddah-corniche";
const R = "riyadh-olaya";

export const SEED_MENUS: Menu[] = [
  seedMenu("all-day",   "All Day Menu",    "active",    "2026-05-12T10:30:00.000Z", J),
  seedMenu("breakfast", "Breakfast Menu",  "active",    "2026-05-12T10:30:00.000Z", J),
  seedMenu("lunch",     "Lunch Menu",      "active",    "2026-05-12T10:30:00.000Z", J),
  seedMenu("dinner",    "Dinner Menu",     "active",    "2026-05-12T10:30:00.000Z", J),
  seedMenu("ramadan",   "Ramadan Menu",    "scheduled", "2026-05-12T10:30:00.000Z", J),
  seedMenu("kids",      "Kids Menu",       "on-hold",   "2026-05-12T10:30:00.000Z", R),
  seedMenu("may-dinner","May Dinner Menu", "expired",   "2026-05-12T10:30:00.000Z", R),
  seedMenu("dessert",   "Dessert Menu",    "pending",   "2026-05-12T10:30:00.000Z", J),
  seedMenu("adha-eid",  "Adha Eid Menu",   "archived",  "2026-05-12T10:30:00.000Z", J),
];
