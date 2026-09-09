# Merchant Menu — Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the menu library — a grid of menu cards with filters, per-card actions, a schedule modal, and the Create New Menu method chooser — on top of a new `entities/menu` model.

**Architecture:** A new `entities/menu` layer owns the types, the pure operations over a menu collection, and versioned localStorage persistence. Two pages consume it: `/menu` (the library) and `/menu/new` (the method chooser). No wizard yet — `Create From Scratch` routes to a path the next plan fills in, and `Import Menu (AI)` renders disabled.

**Tech Stack:** React 18, react-router-dom 6, TypeScript 5.5, Vitest 2, Tailwind 3, `@octopus/ui` primitives, `@i18n` flat dictionaries.

**Spec:** `docs/superpowers/specs/2026-09-09-merchant-menu-design.md`

## Global Constraints

- **Tests run with:** `cd apps/merchant && npx vitest run <path>`. The whole suite is `npm test -w @octopus/merchant`.
- **i18n:** every user-visible string is a key in **both** `packages/i18n/src/locales/en/index.ts` and `.../ar/index.ts`. `shared/i18n/keys.test.ts` fails the build if the two dictionaries disagree on key set. Namespace for this plan: `menuLib.*`.
- **FSD layers:** `entities/` may not import from `pages/` or `widgets/`. `pages/` may import from `entities/`, `widgets/`, `shared/`. No page imports another page's internals.
- **Direction:** logical CSS properties only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) — never `ml-`, `pr-`, `left-`. The app runs RTL in Arabic.
- **Money:** never hardcode a derived number. Totals, counts and percentages are computed.
- **Deviation from the spec's phase order:** the spec listed the `entities/site-draft/` extraction as phase 1. Nothing in this plan needs it — it is first needed by the Theme step — so it moves to the wizard plan, where its blast radius (`preview-model.ts` pulls in three catalogs and a cross-page import of `dnsLabel`) can be designed against a known consumer.

---

### Task 1: Menu types and derived readouts

**Files:**
- Create: `apps/merchant/src/entities/menu/menu.ts`
- Test: `apps/merchant/src/entities/menu/menu.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Weekday`, `WEEKDAYS`, `MenuStatus`, `ChannelState`, `SectionKind`, `DisplayStyle`, `ItemTag`, `Section`, `Item`, `Offer`, `ModifierGroup`, `ModifierOption`, `MenuTheme`, `MenuSchedule`, `Menu`, `channelStateFor(status: MenuStatus): ChannelState`, `sectionCount(menu: Menu): number`, `entryCount(menu: Menu): number`

The item, offer and modifier types are declared here because `Section.entries`
needs them and the library cards count them. Their editing behaviour belongs to
the wizard plan; only the shapes land now.

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/entities/menu/menu.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  WEEKDAYS,
  channelStateFor,
  entryCount,
  sectionCount,
  type Menu,
  type Section,
} from "./menu";

function section(id: string, entries: number): Section {
  return {
    id,
    kind: "items",
    name: id,
    image: null,
    description: "",
    visibility: "visible",
    displayStyle: "list",
    color: null,
    entries: Array.from({ length: entries }, (_, i) => ({
      id: `${id}-${i}`,
      name: `${id} ${i}`,
      shortName: `${id}${i}`,
      description: "",
      sku: "",
      image: null,
      video: null,
      tags: [],
      status: "active" as const,
      availability: { available: true, delivery: true, takeaway: true, dineIn: true },
      schedule: { mode: "all-day" as const },
      modifierGroups: [],
      pricing: { price: 0, vatRate: 0.15 },
      nutrition: { calories: null, protein: null, carb: null, fat: null },
      allergies: { allergens: [], note: "" },
    })),
  };
}

function menu(sections: Section[]): Menu {
  return {
    id: "m1",
    name: "All Day Menu",
    cover: null,
    status: "active",
    branchId: "jeddah-corniche",
    sections,
    theme: {
      presetId: "elegant",
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
      branchIds: ["jeddah-corniche"],
      fallbackMenuId: null,
      allowPreorderOutsideSchedule: false,
    },
    channels: { pos: "live", publicLink: "live", tableQr: "live" },
    updatedAt: "2026-05-12T10:30:00.000Z",
    publishedAt: "2026-05-12T09:15:00.000Z",
    version: 2,
  };
}

describe("WEEKDAYS", () => {
  it("runs Sunday first, matching the frame's day selector", () => {
    expect(WEEKDAYS).toEqual(["sun", "mon", "tue", "wed", "thu", "fri", "sat"]);
  });
});

describe("channelStateFor", () => {
  it("renders an active menu's channels as Live", () => {
    expect(channelStateFor("active")).toBe("live");
  });

  it("passes every other status through unchanged", () => {
    expect(channelStateFor("scheduled")).toBe("scheduled");
    expect(channelStateFor("on-hold")).toBe("on-hold");
    expect(channelStateFor("expired")).toBe("expired");
    expect(channelStateFor("pending")).toBe("pending");
    expect(channelStateFor("archived")).toBe("archived");
  });
});

describe("counts", () => {
  it("counts sections", () => {
    expect(sectionCount(menu([section("a", 2), section("b", 3)]))).toBe(2);
  });

  it("counts entries across all sections", () => {
    expect(entryCount(menu([section("a", 2), section("b", 3)]))).toBe(5);
  });

  it("counts nothing for a menu with no sections", () => {
    expect(sectionCount(menu([]))).toBe(0);
    expect(entryCount(menu([]))).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/merchant && npx vitest run src/entities/menu/menu.test.ts`
Expected: FAIL — `Failed to resolve import "./menu"`

- [ ] **Step 3: Write the implementation**

Create `apps/merchant/src/entities/menu/menu.ts`:

```ts
// The merchant Menu model. A menu is the root entity: a restaurant owns
// several of them (All Day, Breakfast, Ramadan), each with its own sections,
// theme, schedule and channel visibility, each independently publishable.
//
// Item, Offer and ModifierGroup are declared here rather than in the wizard
// plan because `Section.entries` needs them and the library cards count them.
// Their editing behaviour arrives with the wizard.

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

/** Sunday first — the order the frames' day selectors draw. */
export const WEEKDAYS: readonly Weekday[] = [
  "sun", "mon", "tue", "wed", "thu", "fri", "sat",
];

export type MenuStatus =
  | "active" | "scheduled" | "on-hold" | "expired" | "pending" | "archived";

// Channels say "Live" where the menu says "Active"; every other word is
// shared. Keeping them separate types means the card can show a menu whose
// POS is live while its public link is still pending.
export type ChannelState =
  | "live" | "scheduled" | "on-hold" | "expired" | "pending" | "archived";

export type SectionKind = "items" | "offers";
export type DisplayStyle = "list" | "carousel" | "grid";

export type ItemTag =
  | "chef-recommended" | "top-selling" | "most-ordered" | "healthy-choice";

export interface ModifierOption {
  id: string;
  name: string;
  subLabel: string;
  priceType: "no-change" | "add-amount" | "fixed";
  price: number;
  isDefault: boolean;
  available: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  type: "single" | "multi";
  customerLabel: string;
  helpText: string;
  min: number;
  max: number;
  required: boolean;
  showAsRadio: boolean;
  options: ModifierOption[];
}

export type ItemSchedule =
  | { mode: "all-day" }
  | { mode: "custom"; start: string; end: string; days: Weekday[] };

export interface Item {
  id: string;
  name: string;
  shortName: string;
  description: string;
  sku: string;
  image: string | null;
  video: string | null;
  tags: ItemTag[];
  status: "active" | "draft" | "unavailable";
  availability: {
    available: boolean;
    delivery: boolean;
    takeaway: boolean;
    dineIn: boolean;
  };
  schedule: ItemSchedule;
  modifierGroups: ModifierGroup[];
  pricing: { price: number; vatRate: number };
  nutrition: {
    calories: number | null;
    protein: number | null;
    carb: number | null;
    fat: number | null;
  };
  allergies: { allergens: string[]; note: string };
}

export interface Offer {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  status: "active" | "inactive";
  badge: string | null;
  showSavingBadge: boolean;
  entries: { itemId: string; qty: number; price: number }[];
  customerCanChange: boolean;
  pricing: {
    role: "fixed" | "discount" | "dynamic";
    offerPrice: number;
    vatRate: number;
    excludeFromPromotions: boolean;
  };
  availability: {
    from: string | null;
    to: string | null;
    window: { days: [Weekday, Weekday]; start: string; end: string } | null;
  };
  channels: {
    dineIn: boolean;
    takeaway: boolean;
    delivery: boolean;
    kiosk: boolean;
    onlineOrdering: boolean;
    mobileApp: boolean;
  };
}

// `kind` is the load-bearing field: picking an offers section in the wizard's
// step 2 swaps the entire editor, tabs and all.
export interface Section {
  id: string;
  kind: SectionKind;
  name: string;
  image: string | null;
  description: string;
  visibility: "visible" | "hidden";
  displayStyle: DisplayStyle;
  color: string | null;
  entries: (Item | Offer)[];
}

export interface MenuTheme {
  presetId: string;
  navStyle: "top-bar" | "side-drawer" | "bottom-bar" | "pill-scroll";
  categoryStyle: "icon-text" | "text-only" | "icons-only" | "image-text";
  cardStyle: "classic" | "clean-minimal" | "image-top" | "image-left";
  itemDetails: "same-page" | "overlay" | "new-page";
  stickyAddToCart: boolean;
  showItemTags: boolean;
}

export interface MenuSchedule {
  type: "all-day" | "breakfast" | "lunch" | "dinner" | "custom";
  start: string;
  end: string;
  days: Weekday[];
  timezone: string;
  branchIds: string[];
  fallbackMenuId: string | null;
  allowPreorderOutsideSchedule: boolean;
}

export interface Menu {
  id: string;
  name: string;
  cover: string | null;
  status: MenuStatus;
  branchId: string;
  sections: Section[];
  theme: MenuTheme;
  schedule: MenuSchedule;
  channels: { pos: ChannelState; publicLink: ChannelState; tableQr: ChannelState };
  updatedAt: string;
  publishedAt: string | null;
  version: number;
}

/** An active menu reads "Live" on its channel chips; everything else keeps its word. */
export function channelStateFor(status: MenuStatus): ChannelState {
  return status === "active" ? "live" : status;
}

export function sectionCount(menu: Menu): number {
  return menu.sections.length;
}

export function entryCount(menu: Menu): number {
  return menu.sections.reduce((total, section) => total + section.entries.length, 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/merchant && npx vitest run src/entities/menu/menu.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/entities/menu/menu.ts apps/merchant/src/entities/menu/menu.test.ts
git commit -m "Add the menu entity's types and derived readouts"
```

---

### Task 2: Library operations

**Files:**
- Create: `apps/merchant/src/entities/menu/library.ts`
- Test: `apps/merchant/src/entities/menu/library.test.ts`

**Interfaces:**
- Consumes: `Menu`, `MenuStatus`, `MenuSchedule`, `channelStateFor` from `./menu`
- Produces: `LibraryFilters`, `DEFAULT_FILTERS`, `filterMenus(menus, filters): Menu[]`, `setMenuStatus(menus, id, status, now): Menu[]`, `duplicateMenu(menus, id, newId, now): Menu[]`, `deleteMenu(menus, id): Menu[]`, `setMenuSchedule(menus, id, schedule, now): Menu[]`, `fallbackCandidates(menus, id): Menu[]`

Pure functions over a `Menu[]`, not a reducer — the library has no wizard-style
step state to carry, and pure array transforms are cheaper to test. `newId` and
`now` are injected so the tests are not clock- or randomness-dependent.

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/entities/menu/library.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  deleteMenu,
  duplicateMenu,
  fallbackCandidates,
  filterMenus,
  setMenuSchedule,
  setMenuStatus,
} from "./library";
import { WEEKDAYS, type Menu, type MenuStatus } from "./menu";

const NOW = "2026-09-09T12:00:00.000Z";

function make(id: string, name: string, status: MenuStatus, updatedAt: string, branchId = "jeddah"): Menu {
  return {
    id,
    name,
    cover: null,
    status,
    branchId,
    sections: [],
    theme: {
      presetId: "elegant",
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
    channels: { pos: "live", publicLink: "live", tableQr: "live" },
    updatedAt,
    publishedAt: null,
    version: 1,
  };
}

const LIBRARY: Menu[] = [
  make("a", "All Day Menu", "active", "2026-05-12T10:30:00.000Z"),
  make("b", "Breakfast Menu", "active", "2026-05-14T10:30:00.000Z"),
  make("c", "Ramadan Menu", "scheduled", "2026-05-10T10:30:00.000Z"),
  make("d", "Adha Eid Menu", "archived", "2026-05-16T10:30:00.000Z"),
  make("e", "Riyadh Lunch", "active", "2026-05-11T10:30:00.000Z", "riyadh"),
];

describe("filterMenus", () => {
  it("hides archived menus by default", () => {
    const ids = filterMenus(LIBRARY, DEFAULT_FILTERS).map((m) => m.id);
    expect(ids).not.toContain("d");
  });

  it("shows archived menus when asked", () => {
    const ids = filterMenus(LIBRARY, { ...DEFAULT_FILTERS, includeArchived: true }).map((m) => m.id);
    expect(ids).toContain("d");
  });

  it("sorts most recently updated first by default", () => {
    const ids = filterMenus(LIBRARY, DEFAULT_FILTERS).map((m) => m.id);
    expect(ids).toEqual(["b", "a", "e", "c"]);
  });

  it("sorts by name when asked", () => {
    const names = filterMenus(LIBRARY, { ...DEFAULT_FILTERS, sort: "name" }).map((m) => m.name);
    expect(names).toEqual(["All Day Menu", "Breakfast Menu", "Ramadan Menu", "Riyadh Lunch"]);
  });

  it("matches the search query case-insensitively", () => {
    const ids = filterMenus(LIBRARY, { ...DEFAULT_FILTERS, query: "ramadan" }).map((m) => m.id);
    expect(ids).toEqual(["c"]);
  });

  it("ignores surrounding whitespace in the query", () => {
    const ids = filterMenus(LIBRARY, { ...DEFAULT_FILTERS, query: "  breakfast  " }).map((m) => m.id);
    expect(ids).toEqual(["b"]);
  });

  it("narrows to one area", () => {
    const ids = filterMenus(LIBRARY, { ...DEFAULT_FILTERS, area: "riyadh" }).map((m) => m.id);
    expect(ids).toEqual(["e"]);
  });

  it("narrows to menus live on one channel", () => {
    const held = setMenuStatus(LIBRARY, "a", "on-hold", NOW);
    const ids = filterMenus(held, { ...DEFAULT_FILTERS, channel: "pos" }).map((m) => m.id);
    expect(ids).not.toContain("a");
    expect(ids).toContain("b");
  });
});

describe("setMenuStatus", () => {
  it("cascades the new status onto every channel", () => {
    const next = setMenuStatus(LIBRARY, "a", "on-hold", NOW);
    const menu = next.find((m) => m.id === "a")!;
    expect(menu.status).toBe("on-hold");
    expect(menu.channels).toEqual({ pos: "on-hold", publicLink: "on-hold", tableQr: "on-hold" });
  });

  it("renders channels as Live when the menu goes active", () => {
    const held = setMenuStatus(LIBRARY, "c", "on-hold", NOW);
    const resumed = setMenuStatus(held, "c", "active", NOW);
    expect(resumed.find((m) => m.id === "c")!.channels.pos).toBe("live");
  });

  it("stamps updatedAt", () => {
    const next = setMenuStatus(LIBRARY, "a", "on-hold", NOW);
    expect(next.find((m) => m.id === "a")!.updatedAt).toBe(NOW);
  });

  it("leaves every other menu untouched", () => {
    const next = setMenuStatus(LIBRARY, "a", "on-hold", NOW);
    expect(next.find((m) => m.id === "b")).toEqual(LIBRARY.find((m) => m.id === "b"));
  });
});

describe("duplicateMenu", () => {
  it("inserts the copy directly after its original", () => {
    const next = duplicateMenu(LIBRARY, "a", "a-copy", NOW);
    expect(next.map((m) => m.id)).toEqual(["a", "a-copy", "b", "c", "d", "e"]);
  });

  it("names the copy and marks it unpublished", () => {
    const copy = duplicateMenu(LIBRARY, "a", "a-copy", NOW).find((m) => m.id === "a-copy")!;
    expect(copy.name).toBe("All Day Menu (Copy)");
    expect(copy.status).toBe("pending");
    expect(copy.publishedAt).toBeNull();
    expect(copy.version).toBe(1);
    expect(copy.updatedAt).toBe(NOW);
  });

  it("does not share section arrays with the original", () => {
    const source = [{ ...LIBRARY[0], sections: [
      { id: "s1", kind: "items" as const, name: "Breakfast", image: null, description: "",
        visibility: "visible" as const, displayStyle: "list" as const, color: null, entries: [] },
    ] }];
    const next = duplicateMenu(source, "a", "a-copy", NOW);
    expect(next[1].sections).not.toBe(next[0].sections);
  });

  it("returns the library unchanged for an unknown id", () => {
    expect(duplicateMenu(LIBRARY, "nope", "x", NOW)).toEqual(LIBRARY);
  });
});

describe("deleteMenu", () => {
  it("removes just that menu", () => {
    expect(deleteMenu(LIBRARY, "c").map((m) => m.id)).toEqual(["a", "b", "d", "e"]);
  });
});

describe("setMenuSchedule", () => {
  it("replaces the schedule and stamps updatedAt", () => {
    const next = setMenuSchedule(LIBRARY, "a", { ...LIBRARY[0].schedule, type: "lunch", start: "10:00", end: "12:00" }, NOW);
    const menu = next.find((m) => m.id === "a")!;
    expect(menu.schedule.type).toBe("lunch");
    expect(menu.schedule.start).toBe("10:00");
    expect(menu.updatedAt).toBe(NOW);
  });
});

describe("fallbackCandidates", () => {
  it("never offers the menu being scheduled as its own fallback", () => {
    expect(fallbackCandidates(LIBRARY, "a").map((m) => m.id)).not.toContain("a");
  });

  it("omits archived menus", () => {
    expect(fallbackCandidates(LIBRARY, "a").map((m) => m.id)).not.toContain("d");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/merchant && npx vitest run src/entities/menu/library.test.ts`
Expected: FAIL — `Failed to resolve import "./library"`

- [ ] **Step 3: Write the implementation**

Create `apps/merchant/src/entities/menu/library.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/merchant && npx vitest run src/entities/menu/library.test.ts`
Expected: PASS, 20 tests

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/entities/menu/library.ts apps/merchant/src/entities/menu/library.test.ts
git commit -m "Add pure library operations over a menu collection"
```

---

### Task 3: Versioned persistence

**Files:**
- Create: `apps/merchant/src/entities/menu/menu-storage.ts`
- Test: `apps/merchant/src/entities/menu/menu-storage.test.ts`

**Interfaces:**
- Consumes: `Menu` from `./menu`
- Produces: `MENUS_KEY`, `MENUS_VERSION`, `serializeMenus(menus): string`, `parseMenus(raw: string | null): Menu[] | null`

Mirrors `pages/public-link/_shared/site-draft-storage.ts`: a versioned envelope
and a shape guard, so a hand-edited or truncated localStorage value falls back
to the seed instead of crashing the page. localStorage rather than session
storage — a half-built menu is a business asset the merchant expects tomorrow.

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/entities/menu/menu-storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { MENUS_VERSION, parseMenus, serializeMenus } from "./menu-storage";
import { WEEKDAYS, type Menu } from "./menu";

const MENU: Menu = {
  id: "a",
  name: "All Day Menu",
  cover: null,
  status: "active",
  branchId: "jeddah",
  sections: [
    {
      id: "s1", kind: "items", name: "Breakfast", image: null, description: "",
      visibility: "visible", displayStyle: "list", color: null, entries: [],
    },
  ],
  theme: {
    presetId: "elegant", navStyle: "top-bar", categoryStyle: "icon-text",
    cardStyle: "classic", itemDetails: "same-page",
    stickyAddToCart: true, showItemTags: true,
  },
  schedule: {
    type: "all-day", start: "00:00", end: "23:59", days: [...WEEKDAYS],
    timezone: "Asia/Riyadh", branchIds: ["jeddah"],
    fallbackMenuId: null, allowPreorderOutsideSchedule: false,
  },
  channels: { pos: "live", publicLink: "live", tableQr: "live" },
  updatedAt: "2026-05-12T10:30:00.000Z",
  publishedAt: null,
  version: 1,
};

describe("serializeMenus / parseMenus", () => {
  it("round-trips a library", () => {
    expect(parseMenus(serializeMenus([MENU]))).toEqual([MENU]);
  });

  it("round-trips an empty library", () => {
    expect(parseMenus(serializeMenus([]))).toEqual([]);
  });

  it("returns null for a missing value", () => {
    expect(parseMenus(null)).toBeNull();
  });

  it("returns null for a non-JSON value", () => {
    expect(parseMenus("{{{")).toBeNull();
  });

  it("returns null for a different version", () => {
    const stale = JSON.stringify({ version: MENUS_VERSION + 1, menus: [MENU] });
    expect(parseMenus(stale)).toBeNull();
  });

  it("returns null when the payload is not an array", () => {
    expect(parseMenus(JSON.stringify({ version: MENUS_VERSION, menus: { id: "a" } }))).toBeNull();
  });

  it("returns null when a menu is missing a required field", () => {
    const { name, ...withoutName } = MENU;
    const broken = JSON.stringify({ version: MENUS_VERSION, menus: [withoutName] });
    expect(parseMenus(broken)).toBeNull();
  });

  it("returns null when sections is not an array", () => {
    const broken = JSON.stringify({ version: MENUS_VERSION, menus: [{ ...MENU, sections: "nope" }] });
    expect(parseMenus(broken)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/merchant && npx vitest run src/entities/menu/menu-storage.test.ts`
Expected: FAIL — `Failed to resolve import "./menu-storage"`

- [ ] **Step 3: Write the implementation**

Create `apps/merchant/src/entities/menu/menu-storage.ts`:

```ts
// localStorage, not sessionStorage: a half-built menu is a business asset, and
// the merchant expects to find it tomorrow.
//
// Everything is validated on the way back in. A hand-edited or truncated value
// returns null rather than a half-typed object, and the caller falls back to
// the seed — the same posture as site-draft-storage.ts.

import type { Menu } from "./menu";

export const MENUS_KEY = "octo.menus";
export const MENUS_VERSION = 1;

export function serializeMenus(menus: readonly Menu[]): string {
  return JSON.stringify({ version: MENUS_VERSION, menus });
}

function isMenuShape(value: unknown): value is Menu {
  if (typeof value !== "object" || value === null) return false;
  const menu = value as Record<string, unknown>;
  return (
    typeof menu.id === "string" &&
    typeof menu.name === "string" &&
    typeof menu.status === "string" &&
    typeof menu.branchId === "string" &&
    typeof menu.updatedAt === "string" &&
    typeof menu.version === "number" &&
    Array.isArray(menu.sections) &&
    typeof menu.theme === "object" && menu.theme !== null &&
    typeof menu.schedule === "object" && menu.schedule !== null &&
    typeof menu.channels === "object" && menu.channels !== null
  );
}

export function parseMenus(raw: string | null): Menu[] | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const envelope = parsed as Record<string, unknown>;
  if (envelope.version !== MENUS_VERSION) return null;
  if (!Array.isArray(envelope.menus)) return null;
  if (!envelope.menus.every(isMenuShape)) return null;

  return envelope.menus as Menu[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/merchant && npx vitest run src/entities/menu/menu-storage.test.ts`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/entities/menu/menu-storage.ts apps/merchant/src/entities/menu/menu-storage.test.ts
git commit -m "Persist the menu library behind a versioned, validated envelope"
```

---

### Task 4: Seed data and the library hook

**Files:**
- Create: `apps/merchant/src/entities/menu/seed.ts`
- Create: `apps/merchant/src/entities/menu/use-menu-library.ts`
- Create: `apps/merchant/src/entities/menu/index.ts`
- Test: `apps/merchant/src/entities/menu/seed.test.ts`

**Interfaces:**
- Consumes: everything from `./menu`, `./library`, `./menu-storage`
- Produces: `SEED_MENUS: Menu[]`, `SEED_BRANCHES: readonly { id: string; label: string }[]`, `useMenuLibrary(): { menus: Menu[]; setMenus: (next: Menu[]) => void }`, and the barrel `entities/menu/index.ts` re-exporting all of it

The nine seeded menus are the nine cards the frame draws, with the frame's own
statuses. Section and item counts are seeded as real (empty-bodied) sections
and items so `sectionCount` and `entryCount` report the frame's 12 and 120
rather than the numbers being stored twice.

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/entities/menu/seed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SEED_BRANCHES, SEED_MENUS } from "./seed";
import { entryCount, sectionCount } from "./menu";
import { parseMenus, serializeMenus } from "./menu-storage";

describe("SEED_MENUS", () => {
  it("seeds the nine menus the frame draws", () => {
    expect(SEED_MENUS).toHaveLength(9);
    expect(SEED_MENUS.map((m) => m.name)).toEqual([
      "All Day Menu",
      "Breakfast Menu",
      "Lunch Menu",
      "Dinner Menu",
      "Ramadan Menu",
      "Kids Menu",
      "May Dinner Menu",
      "Dessert Menu",
      "Adha Eid Menu",
    ]);
  });

  it("covers every status the cards display", () => {
    expect(new Set(SEED_MENUS.map((m) => m.status))).toEqual(
      new Set(["active", "scheduled", "on-hold", "expired", "pending", "archived"]),
    );
  });

  it("reports the frame's counts from real sections and entries", () => {
    for (const menu of SEED_MENUS) {
      expect(sectionCount(menu)).toBe(12);
      expect(entryCount(menu)).toBe(120);
    }
  });

  it("gives every menu channel states consistent with its status", () => {
    for (const menu of SEED_MENUS) {
      const expected = menu.status === "active" ? "live" : menu.status;
      expect(menu.channels.pos, menu.name).toBe(expected);
      expect(menu.channels.publicLink, menu.name).toBe(expected);
    }
  });

  it("uses unique ids", () => {
    expect(new Set(SEED_MENUS.map((m) => m.id)).size).toBe(SEED_MENUS.length);
  });

  it("survives a storage round-trip", () => {
    expect(parseMenus(serializeMenus(SEED_MENUS))).toEqual(SEED_MENUS);
  });

  it("points every menu at a known branch", () => {
    const ids = new Set(SEED_BRANCHES.map((b) => b.id));
    for (const menu of SEED_MENUS) {
      expect(ids.has(menu.branchId), menu.name).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/merchant && npx vitest run src/entities/menu/seed.test.ts`
Expected: FAIL — `Failed to resolve import "./seed"`

- [ ] **Step 3: Write the implementation**

Create `apps/merchant/src/entities/menu/seed.ts`:

```ts
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

export const SEED_BRANCHES: readonly { id: string; label: string }[] = [
  { id: "jeddah-corniche", label: "Jeddah - Corniche" },
  { id: "riyadh-olaya", label: "Riyadh - Olaya" },
  { id: "dammam-corniche", label: "Dammam - Corniche" },
];

const SECTION_NAMES = [
  "Breakfast", "Starters", "Mains", "Desserts", "Drinks", "Offers",
  "Grills", "Salads", "Sandwiches", "Pasta", "Burgers", "Sides",
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
    const id = `${menuId}-s${index}`;
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
// elsewhere: give the eleventh and twelfth sections an extra ten between them
// to keep the visible total at 120.
function balanced(sections: Section[]): Section[] {
  const offers = sections.find((s) => s.kind === "offers");
  if (!offers) return sections;
  const donor = sections[sections.length - 1];
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
      presetId: "elegant",
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/merchant && npx vitest run src/entities/menu/seed.test.ts`
Expected: PASS, 7 tests

- [ ] **Step 5: Write the hook and the barrel**

Create `apps/merchant/src/entities/menu/use-menu-library.ts`:

```ts
// Holds the library in state, hydrates it from localStorage once on mount, and
// writes back on every change. Hydration happens in an effect rather than in
// the useState initialiser so a browser with storage blocked renders the seed
// instead of throwing during render.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Menu } from "./menu";
import { MENUS_KEY, parseMenus, serializeMenus } from "./menu-storage";
import { SEED_MENUS } from "./seed";

export function useMenuLibrary() {
  const [menus, setMenusState] = useState<Menu[]>(SEED_MENUS);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const stored = parseMenus(window.localStorage.getItem(MENUS_KEY));
      if (stored) setMenusState(stored);
    } catch {
      // Storage blocked or unavailable — the seed already on screen is fine.
    }
    hydrated.current = true;
  }, []);

  const setMenus = useCallback((next: Menu[]) => {
    setMenusState(next);
    // Never write before hydration, or a slow first paint would overwrite the
    // merchant's saved library with the seed.
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(MENUS_KEY, serializeMenus(next));
    } catch {
      // Quota or private mode. The in-memory library still works this session.
    }
  }, []);

  return { menus, setMenus };
}
```

Create `apps/merchant/src/entities/menu/index.ts`:

```ts
// The menu entity's public surface. Pages and widgets import from here, never
// from the files directly.
export * from "./menu";
export * from "./library";
export * from "./menu-storage";
export * from "./seed";
export * from "./use-menu-library";
```

- [ ] **Step 6: Run the whole entity suite**

Run: `cd apps/merchant && npx vitest run src/entities/menu`
Expected: PASS, 41 tests across four files (6 + 20 + 8 + 7)

- [ ] **Step 7: Commit**

```bash
git add apps/merchant/src/entities/menu/
git commit -m "Seed the menu library and hydrate it from storage"
```

---

### Task 5: The library page

**Files:**
- Create: `apps/merchant/src/pages/menu/library/index.tsx`
- Create: `apps/merchant/src/pages/menu/library/menu-card.tsx`
- Modify: `apps/merchant/src/app/routes/registry.tsx:44-45` (repoint the `menu` route)
- Modify: `packages/i18n/src/locales/en/index.ts`, `packages/i18n/src/locales/ar/index.ts`

**Interfaces:**
- Consumes: `useMenuLibrary`, `filterMenus`, `DEFAULT_FILTERS`, `sectionCount`, `entryCount`, `SEED_BRANCHES` from `@/entities/menu`
- Produces: `MenuLibraryPage`, `MenuCard` with props `{ menu: Menu; onOpenActions: (menu: Menu) => void }`, and `type CardAction = "edit" | "schedule" | "hold" | "resume" | "duplicate" | "archive" | "delete"`

This task renders the page and its cards. `onOpenActions` is accepted and typed
now but passed a no-op; Task 6 implements the menu that it opens. The existing
hub at `pages/menu/index.tsx` stays untouched and
still serves its six children until Task 8 of the wizard plan removes them —
this route points at the new page, so both exist briefly and only the new one
is reachable.

- [ ] **Step 1: Add the i18n keys**

In `packages/i18n/src/locales/en/index.ts`, next to the existing `"menu.*"`
block, add:

```ts
  "menuLib.title": "Menu",
  "menuLib.subtitle": "Create, manage and schedule your menus across all channels.",
  "menuLib.createNew": "Create New Menu",
  "menuLib.importAi": "Import Menu (AI)",
  "menuLib.importAiSoon": "Coming soon",
  "menuLib.branchBanner": "You create your menu in {branch} branch",
  "menuLib.changeBranch": "Change Branch",
  "menuLib.search": "Search",
  "menuLib.allAreas": "All Areas",
  "menuLib.allChannels": "All Channels",
  "menuLib.sort.recent": "Recently Updated",
  "menuLib.sort.name": "Name",
  "menuLib.sort.status": "Status",
  "menuLib.sections": "Sections:",
  "menuLib.items": "Items:",
  "menuLib.schedule": "Schedule:",
  "menuLib.channels": "Channels",
  "menuLib.channel.pos": "POS",
  "menuLib.channel.publicLink": "Public Link",
  "menuLib.channel.tableQr": "Table QR",
  "menuLib.updated": "Updated:",
  "menuLib.status.active": "Active",
  "menuLib.status.scheduled": "Scheduled",
  "menuLib.status.on-hold": "On hold",
  "menuLib.status.expired": "Expired",
  "menuLib.status.pending": "Pending",
  "menuLib.status.archived": "Archived",
  "menuLib.status.live": "Live",
  "menuLib.scheduleType.all-day": "All Day",
  "menuLib.scheduleType.breakfast": "Breakfast",
  "menuLib.scheduleType.lunch": "Lunch",
  "menuLib.scheduleType.dinner": "Dinner",
  "menuLib.scheduleType.custom": "Custom",
  "menuLib.empty.title": "No menus yet",
  "menuLib.empty.body": "Build your first menu from scratch, or upload an existing one.",
  "menuLib.noMatches": "No menus match these filters.",
```

In `packages/i18n/src/locales/ar/index.ts`, the same keys:

```ts
  "menuLib.title": "القائمة",
  "menuLib.subtitle": "أنشئ قوائمك وأدرها وجدولها عبر جميع القنوات.",
  "menuLib.createNew": "إنشاء قائمة جديدة",
  "menuLib.importAi": "استيراد قائمة (ذكاء اصطناعي)",
  "menuLib.importAiSoon": "قريباً",
  "menuLib.branchBanner": "أنت تنشئ قائمتك في فرع {branch}",
  "menuLib.changeBranch": "تغيير الفرع",
  "menuLib.search": "بحث",
  "menuLib.allAreas": "كل المناطق",
  "menuLib.allChannels": "كل القنوات",
  "menuLib.sort.recent": "الأحدث تحديثاً",
  "menuLib.sort.name": "الاسم",
  "menuLib.sort.status": "الحالة",
  "menuLib.sections": "الأقسام:",
  "menuLib.items": "الأصناف:",
  "menuLib.schedule": "الجدولة:",
  "menuLib.channels": "القنوات",
  "menuLib.channel.pos": "نقطة البيع",
  "menuLib.channel.publicLink": "الرابط العام",
  "menuLib.channel.tableQr": "كود الطاولة",
  "menuLib.updated": "آخر تحديث:",
  "menuLib.status.active": "نشطة",
  "menuLib.status.scheduled": "مجدولة",
  "menuLib.status.on-hold": "موقوفة",
  "menuLib.status.expired": "منتهية",
  "menuLib.status.pending": "قيد الانتظار",
  "menuLib.status.archived": "مؤرشفة",
  "menuLib.status.live": "مباشرة",
  "menuLib.scheduleType.all-day": "طوال اليوم",
  "menuLib.scheduleType.breakfast": "الإفطار",
  "menuLib.scheduleType.lunch": "الغداء",
  "menuLib.scheduleType.dinner": "العشاء",
  "menuLib.scheduleType.custom": "مخصصة",
  "menuLib.empty.title": "لا توجد قوائم بعد",
  "menuLib.empty.body": "ابنِ قائمتك الأولى من الصفر، أو ارفع قائمة موجودة.",
  "menuLib.noMatches": "لا توجد قوائم مطابقة لهذه الفلاتر.",
```

- [ ] **Step 2: Run the dictionary test to verify both sides agree**

Run: `cd apps/merchant && npx vitest run src/shared/i18n/keys.test.ts`
Expected: PASS — if it fails on "define exactly the same keys", a key was
added to one dictionary and not the other.

- [ ] **Step 3: Write the card**

Create `apps/merchant/src/pages/menu/library/menu-card.tsx`:

```tsx
// One menu card in the library grid. Counts and channel chips are derived from
// the menu, never stored alongside it.
import { CalendarCheck2, ListTree, MoreVertical, Settings2, UtensilsCrossed } from "lucide-react";
import { Badge } from "@octopus/ui";
import { entryCount, sectionCount, type ChannelState, type Menu, type MenuStatus } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

export type CardAction =
  | "edit" | "schedule" | "hold" | "resume" | "duplicate" | "archive" | "delete";

const STATUS_TONE: Record<MenuStatus, "success" | "warning" | "error" | "info" | "neutral"> = {
  active: "success",
  scheduled: "warning",
  "on-hold": "error",
  expired: "neutral",
  pending: "warning",
  archived: "info",
};

const CHANNEL_TONE: Record<ChannelState, "success" | "warning" | "error" | "info" | "neutral"> = {
  live: "success",
  scheduled: "warning",
  "on-hold": "error",
  expired: "neutral",
  pending: "warning",
  archived: "info",
};

export function MenuCard({
  menu,
  onOpenActions,
}: {
  menu: Menu;
  onOpenActions: (menu: Menu) => void;
}) {
  const { t, locale } = useI18n();
  const updated = new Date(menu.updatedAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <article className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <div className="flex gap-3">
        <div className="h-[92px] w-[92px] shrink-0 rounded-[10px] bg-[var(--octo-hover)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15px] font-semibold text-[var(--octo-text-primary)]">
              {menu.name}
            </h3>
            <Badge tone={STATUS_TONE[menu.status]}>{t(`menuLib.status.${menu.status}`)}</Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--octo-text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <ListTree size={14} aria-hidden />
              {t("menuLib.sections")} <b className="text-[var(--octo-text-primary)]">{sectionCount(menu)}</b>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UtensilsCrossed size={14} aria-hidden />
              {t("menuLib.items")} <b className="text-[var(--octo-text-primary)]">{entryCount(menu)}</b>
            </span>
          </div>

          <p className="mt-2 inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--octo-border-card)] px-2 py-1 text-[13px] text-[var(--octo-text-secondary)]">
            <CalendarCheck2 size={14} className="text-[var(--octo-accent)]" aria-hidden />
            {t("menuLib.schedule")}{" "}
            <b className="text-[var(--octo-text-primary)]">{t(`menuLib.scheduleType.${menu.schedule.type}`)}</b>
          </p>
        </div>
      </div>

      <hr className="my-3 border-[var(--octo-border-card)]" />

      <p className="text-[13px] text-[var(--octo-text-secondary)]">{t("menuLib.channels")}</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
          {(["pos", "publicLink", "tableQr"] as const).map((channel) => (
            <span key={channel} className="inline-flex items-center gap-1.5">
              <span className="text-[var(--octo-text-secondary)]">{t(`menuLib.channel.${channel}`)}</span>
              <Badge tone={CHANNEL_TONE[menu.channels[channel]]}>
                {t(`menuLib.status.${menu.channels[channel]}`)}
              </Badge>
            </span>
          ))}
        </div>
        <button
          type="button"
          aria-label={`${menu.name} actions`}
          onClick={() => onOpenActions(menu)}
          className="shrink-0 rounded-[8px] p-1.5 text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
        >
          <MoreVertical size={18} aria-hidden />
        </button>
      </div>

      <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[var(--octo-text-secondary)]">
        <Settings2 size={13} aria-hidden />
        {t("menuLib.updated")} {updated}
      </p>
    </article>
  );
}
```

- [ ] **Step 4: Write the page**

Create `apps/merchant/src/pages/menu/library/index.tsx`:

```tsx
// The menu library: the merchant's list of menus, with the filters and the two
// creation entry points. Card actions arrive in the next task — `onOpenActions`
// is threaded through now so the card's contract does not change later.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Search, Sparkles, Plus } from "lucide-react";
import { Button, Input, Select } from "@octopus/ui";
import {
  DEFAULT_FILTERS,
  SEED_BRANCHES,
  filterMenus,
  useMenuLibrary,
  type LibraryFilters,
  type Menu,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { MenuCard } from "./menu-card";

export function MenuLibraryPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { menus } = useMenuLibrary();
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);

  const visible = useMemo(() => filterMenus(menus, filters), [menus, filters]);
  const branchLabel =
    SEED_BRANCHES.find((b) => b.id === menus[0]?.branchId)?.label ?? SEED_BRANCHES[0].label;

  function patch(next: Partial<LibraryFilters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--octo-text-primary)]">{t("menuLib.title")}</h1>
          <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">{t("menuLib.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* The AI import branch is specced but not built. Showing it disabled
              is more honest than hiding it — the frame promises it exists. */}
          <Button
            variant="secondary"
            disabled
            title={t("menuLib.importAiSoon")}
            icon={<Sparkles size={16} aria-hidden />}
          >
            {t("menuLib.importAi")}
          </Button>
          <Button onClick={() => navigate("/menu/new")} icon={<Plus size={16} aria-hidden />}>
            {t("menuLib.createNew")}
          </Button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[var(--octo-info-soft,var(--octo-hover))] px-3.5 py-2.5">
        <p className="inline-flex items-center gap-2 text-[14px] text-[var(--octo-accent)]">
          <Info size={16} aria-hidden />
          {t("menuLib.branchBanner").replace("{branch}", branchLabel)}
        </p>
        <button type="button" className="text-[14px] font-semibold text-[var(--octo-accent)] underline">
          {t("menuLib.changeBranch")}
        </button>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input
          icon={<Search size={16} aria-hidden />}
          placeholder={t("menuLib.search")}
          value={filters.query}
          onChange={(e) => patch({ query: e.target.value })}
        />
        <Select value={filters.area} onChange={(e) => patch({ area: e.target.value })}>
          <option value="all">{t("menuLib.allAreas")}</option>
          {SEED_BRANCHES.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.label}</option>
          ))}
        </Select>
        <Select
          value={filters.channel}
          onChange={(e) => patch({ channel: e.target.value as LibraryFilters["channel"] })}
        >
          <option value="all">{t("menuLib.allChannels")}</option>
          <option value="pos">{t("menuLib.channel.pos")}</option>
          <option value="publicLink">{t("menuLib.channel.publicLink")}</option>
          <option value="tableQr">{t("menuLib.channel.tableQr")}</option>
        </Select>
        <Select
          value={filters.sort}
          onChange={(e) => patch({ sort: e.target.value as LibraryFilters["sort"] })}
        >
          <option value="recent">{t("menuLib.sort.recent")}</option>
          <option value="name">{t("menuLib.sort.name")}</option>
          <option value="status">{t("menuLib.sort.status")}</option>
        </Select>
      </div>

      {visible.length === 0 ? (
        menus.length === 0 ? (
          // A first-run merchant, or one who deleted everything. The spec asks
          // for the two creation entry points here; they lead to /menu/new
          // rather than being redrawn inline, so the two cards have one home.
          <div className="mt-12 text-center">
            <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">
              {t("menuLib.empty.title")}
            </h2>
            <p className="mx-auto mt-1.5 max-w-[420px] text-[14px] text-[var(--octo-text-secondary)]">
              {t("menuLib.empty.body")}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <Button onClick={() => navigate("/menu/new")} icon={<Plus size={16} aria-hidden />}>
                {t("menuLib.createNew")}
              </Button>
              <Button
                variant="secondary"
                disabled
                title={t("menuLib.importAiSoon")}
                icon={<Sparkles size={16} aria-hidden />}
              >
                {t("menuLib.importAi")}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-10 text-center text-[14px] text-[var(--octo-text-secondary)]">
            {t("menuLib.noMatches")}
          </p>
        )
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((menu: Menu) => (
            <MenuCard key={menu.id} menu={menu} onOpenActions={() => undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Repoint the route**

In `apps/merchant/src/app/routes/registry.tsx`, change the `menu` entry (line 44-45) from:

```tsx
  { id: "menu",         path: "/menu",         section: "Menu",         page: "Categories & Items",
    element: lazy(() => import("@/pages/menu").then(m => ({ default: m.MenuPage }))) },
```

to:

```tsx
  { id: "menu",         path: "/menu",         section: "Menu",         page: "Menu",
    element: lazy(() => import("@/pages/menu/library").then(m => ({ default: m.MenuLibraryPage }))) },
```

- [ ] **Step 6: Verify it builds and the suite is green**

Run: `cd apps/merchant && npx tsc -b --noEmit && npm test`
Expected: no type errors; the full vitest suite passes.

- [ ] **Step 7: Screenshot and compare**

Start the app, sign in, navigate to `/menu`, and capture the page. Compare
against `apps/assets/Menu/Menu Design/menu.png`: header and its two buttons,
the branch banner with its Change Branch link, the four filter controls, and a
three-column card grid whose cards show name, status badge, section and item
counts, the schedule chip, three channel chips, the kebab, and the updated
timestamp. Do not proceed until it matches.

- [ ] **Step 8: Commit**

```bash
git add apps/merchant/src/pages/menu/library/ apps/merchant/src/app/routes/registry.tsx packages/i18n/src/locales/
git commit -m "Build the menu library page"
```

---

### Task 6: Card actions

**Files:**
- Create: `apps/merchant/src/pages/menu/library/actions-menu.tsx`
- Modify: `apps/merchant/src/pages/menu/library/index.tsx`
- Modify: `packages/i18n/src/locales/en/index.ts`, `packages/i18n/src/locales/ar/index.ts`

**Interfaces:**
- Consumes: `CardAction` from `./menu-card`; `setMenuStatus`, `duplicateMenu`, `deleteMenu`, `useMenuLibrary` from `@/entities/menu`
- Produces: `ActionsMenu` with props `{ menu: Menu | null; onClose: () => void; onPick: (action: CardAction) => void }`

- [ ] **Step 1: Add the i18n keys**

Add to `packages/i18n/src/locales/en/index.ts`:

```ts
  "menuLib.action.edit": "Edit",
  "menuLib.action.schedule": "Schedule",
  "menuLib.action.hold": "Hold",
  "menuLib.action.resume": "Resume",
  "menuLib.action.duplicate": "Duplicate",
  "menuLib.action.archive": "Archive",
  "menuLib.action.delete": "Delete",
  "menuLib.confirmDelete.title": "Delete this menu?",
  "menuLib.confirmDelete.body": "{name} and its sections and items are removed. This cannot be undone.",
  "menuLib.confirmDelete.cancel": "Cancel",
  "menuLib.confirmDelete.confirm": "Delete menu",
```

And to `packages/i18n/src/locales/ar/index.ts`:

```ts
  "menuLib.action.edit": "تعديل",
  "menuLib.action.schedule": "جدولة",
  "menuLib.action.hold": "إيقاف مؤقت",
  "menuLib.action.resume": "استئناف",
  "menuLib.action.duplicate": "نسخ",
  "menuLib.action.archive": "أرشفة",
  "menuLib.action.delete": "حذف",
  "menuLib.confirmDelete.title": "حذف هذه القائمة؟",
  "menuLib.confirmDelete.body": "سيتم حذف {name} وأقسامها وأصنافها. لا يمكن التراجع عن هذا.",
  "menuLib.confirmDelete.cancel": "إلغاء",
  "menuLib.confirmDelete.confirm": "حذف القائمة",
```

- [ ] **Step 2: Write the actions menu**

Create `apps/merchant/src/pages/menu/library/actions-menu.tsx`:

```tsx
// The card kebab. Held menus offer Resume where active ones offer Hold — the
// same slot, because they are the same decision in two directions.
import { useEffect, useRef } from "react";
import type { Menu } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import type { CardAction } from "./menu-card";

export function ActionsMenu({
  menu,
  onClose,
  onPick,
}: {
  menu: Menu | null;
  onClose: () => void;
  onPick: (action: CardAction) => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const held = menu.status === "on-hold";
  const actions: CardAction[] = [
    "edit",
    "schedule",
    held ? "resume" : "hold",
    "duplicate",
    "archive",
    "delete",
  ];

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-4"
    >
      <div className="w-[220px] overflow-hidden rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] shadow-lg">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            role="menuitem"
            onClick={() => onPick(action)}
            className={`block w-full border-b border-[var(--octo-border-card)] px-4 py-3 text-start text-[14px] last:border-b-0 hover:bg-[var(--octo-hover)] ${
              action === "delete" ? "text-error hover:bg-error/10" : "text-[var(--octo-text-primary)]"
            }`}
          >
            {t(`menuLib.action.${action}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire it into the page**

In `apps/merchant/src/pages/menu/library/index.tsx`, replace the imports from
`@/entities/menu` with:

```tsx
import {
  DEFAULT_FILTERS,
  SEED_BRANCHES,
  deleteMenu,
  duplicateMenu,
  filterMenus,
  setMenuStatus,
  useMenuLibrary,
  type LibraryFilters,
  type Menu,
} from "@/entities/menu";
```

add these imports:

```tsx
import { Modal } from "@octopus/ui";
import { ActionsMenu } from "./actions-menu";
import type { CardAction } from "./menu-card";
```

change `const { menus } = useMenuLibrary();` to `const { menus, setMenus } = useMenuLibrary();`,
add this state next to `filters`:

```tsx
  const [actionsFor, setActionsFor] = useState<Menu | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Menu | null>(null);
```

add this handler above the `return`:

```tsx
  function runAction(action: CardAction) {
    const menu = actionsFor;
    setActionsFor(null);
    if (!menu) return;

    const now = new Date().toISOString();
    switch (action) {
      case "edit":
        navigate(`/menu/${menu.id}/build/sections`);
        return;
      case "schedule":
        // The schedule modal arrives in the next task.
        return;
      case "hold":
        setMenus(setMenuStatus(menus, menu.id, "on-hold", now));
        return;
      case "resume":
        setMenus(setMenuStatus(menus, menu.id, "active", now));
        return;
      case "duplicate":
        setMenus(duplicateMenu(menus, menu.id, `${menu.id}-copy-${Date.now()}`, now));
        return;
      case "archive":
        setMenus(setMenuStatus(menus, menu.id, "archived", now));
        return;
      case "delete":
        setConfirmDelete(menu);
        return;
    }
  }
```

change the card render to open the menu:

```tsx
            <MenuCard key={menu.id} menu={menu} onOpenActions={(m) => setActionsFor(m)} />
```

and add, immediately before the closing `</div>` of the page:

```tsx
      <ActionsMenu menu={actionsFor} onClose={() => setActionsFor(null)} onPick={runAction} />

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={t("menuLib.confirmDelete.title")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              {t("menuLib.confirmDelete.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) setMenus(deleteMenu(menus, confirmDelete.id));
                setConfirmDelete(null);
              }}
            >
              {t("menuLib.confirmDelete.confirm")}
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-[var(--octo-text-secondary)]">
          {t("menuLib.confirmDelete.body").replace("{name}", confirmDelete?.name ?? "")}
        </p>
      </Modal>
```

- [ ] **Step 4: Verify**

Run: `cd apps/merchant && npx tsc -b --noEmit && npm test`
Expected: no type errors, suite green.

- [ ] **Step 5: Screenshot and compare**

Open `/menu`, click a card's kebab. Compare against
`apps/assets/Menu/Menu Design/menu-Actions.png`: six rows, Delete last and in
red. Then exercise each: Hold turns the card's badge and all three channel
chips to "On hold"; Duplicate inserts a "(Copy)" card right after the original
with Pending everywhere; Archive removes it from the default view; Delete asks
first. Reload the page and confirm the changes survived.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/pages/menu/library/ packages/i18n/src/locales/
git commit -m "Wire the menu card's six actions"
```

---

### Task 7: The schedule modal

**Files:**
- Create: `apps/merchant/src/pages/menu/library/schedule-modal.tsx`
- Modify: `apps/merchant/src/pages/menu/library/index.tsx`
- Modify: `packages/i18n/src/locales/en/index.ts`, `packages/i18n/src/locales/ar/index.ts`

**Interfaces:**
- Consumes: `MenuSchedule`, `WEEKDAYS`, `SEED_BRANCHES`, `fallbackCandidates`, `setMenuSchedule` from `@/entities/menu`
- Produces: `ScheduleModal` with props `{ menu: Menu | null; menus: Menu[]; onClose: () => void; onSave: (schedule: MenuSchedule) => void }`

- [ ] **Step 1: Add the i18n keys**

Add to `packages/i18n/src/locales/en/index.ts`:

```ts
  "menuLib.sched.title": "Schedule Menu",
  "menuLib.sched.availability": "1. Menu Availability",
  "menuLib.sched.chooseType": "Choose schedule type",
  "menuLib.sched.window": "2. Time Window",
  "menuLib.sched.startTime": "Start Time",
  "menuLib.sched.endTime": "End Time",
  "menuLib.sched.applyTo": "Apply to",
  "menuLib.sched.timezone": "Time Zone",
  "menuLib.sched.branches": "Applicable Branches",
  "menuLib.sched.channels": "3. Channels Availability",
  "menuLib.sched.posHint": "Visible in POS, KDS and staff ordering.",
  "menuLib.sched.publicLinkHint": "Visible on your restaurant public menu.",
  "menuLib.sched.tableQrHint": "Visible on table QR ordering for guests.",
  "menuLib.sched.additional": "4. Additional Options",
  "menuLib.sched.fallback": "Fallback Menu",
  "menuLib.sched.fallbackHint": "When this menu is not active",
  "menuLib.sched.fallbackNone": "None",
  "menuLib.sched.preorder": "Allow pre-order outside schedule?",
  "menuLib.sched.save": "Save",
  "menuLib.day.sun": "Sun",
  "menuLib.day.mon": "Mon",
  "menuLib.day.tue": "Tue",
  "menuLib.day.wed": "Wed",
  "menuLib.day.thu": "Thu",
  "menuLib.day.fri": "Fri",
  "menuLib.day.sat": "Sat",
```

Add to `packages/i18n/src/locales/ar/index.ts`:

```ts
  "menuLib.sched.title": "جدولة القائمة",
  "menuLib.sched.availability": "١. توفر القائمة",
  "menuLib.sched.chooseType": "اختر نوع الجدولة",
  "menuLib.sched.window": "٢. النافذة الزمنية",
  "menuLib.sched.startTime": "وقت البدء",
  "menuLib.sched.endTime": "وقت الانتهاء",
  "menuLib.sched.applyTo": "تطبيق على",
  "menuLib.sched.timezone": "المنطقة الزمنية",
  "menuLib.sched.branches": "الفروع المشمولة",
  "menuLib.sched.channels": "٣. توفر القنوات",
  "menuLib.sched.posHint": "ظاهرة في نقطة البيع وشاشة المطبخ وطلبات الموظفين.",
  "menuLib.sched.publicLinkHint": "ظاهرة في قائمة مطعمك العامة.",
  "menuLib.sched.tableQrHint": "ظاهرة في الطلب عبر كود الطاولة للضيوف.",
  "menuLib.sched.additional": "٤. خيارات إضافية",
  "menuLib.sched.fallback": "القائمة البديلة",
  "menuLib.sched.fallbackHint": "عندما تكون هذه القائمة غير نشطة",
  "menuLib.sched.fallbackNone": "بدون",
  "menuLib.sched.preorder": "السماح بالطلب المسبق خارج الجدولة؟",
  "menuLib.sched.save": "حفظ",
  "menuLib.day.sun": "أحد",
  "menuLib.day.mon": "إثنين",
  "menuLib.day.tue": "ثلاثاء",
  "menuLib.day.wed": "أربعاء",
  "menuLib.day.thu": "خميس",
  "menuLib.day.fri": "جمعة",
  "menuLib.day.sat": "سبت",
```

- [ ] **Step 2: Write the modal**

Create `apps/merchant/src/pages/menu/library/schedule-modal.tsx`:

```tsx
// The four numbered blocks of the frame's Schedule Menu modal. Edits are held
// locally and only committed on Save, so closing without saving changes
// nothing. The channel toggles here set the menu's channel visibility; the
// menu's own status is not touched — a scheduled menu can still be POS-only.
import { useEffect, useState } from "react";
import { Modal, Button, Select, Checkbox } from "@octopus/ui";
import {
  WEEKDAYS,
  SEED_BRANCHES,
  fallbackCandidates,
  type Menu,
  type MenuSchedule,
  type Weekday,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

const TYPES: MenuSchedule["type"][] = ["all-day", "breakfast", "lunch", "dinner", "custom"];

export function ScheduleModal({
  menu,
  menus,
  onClose,
  onSave,
}: {
  menu: Menu | null;
  menus: Menu[];
  onClose: () => void;
  onSave: (schedule: MenuSchedule) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<MenuSchedule | null>(null);

  // Re-seed whenever a different menu opens the modal, so yesterday's edits
  // never leak into today's menu.
  useEffect(() => {
    setDraft(menu ? { ...menu.schedule, days: [...menu.schedule.days] } : null);
  }, [menu]);

  if (!menu || !draft) return null;

  function patch(next: Partial<MenuSchedule>) {
    setDraft((current) => (current ? { ...current, ...next } : current));
  }

  function toggleDay(day: Weekday) {
    patch({
      days: draft!.days.includes(day)
        ? draft!.days.filter((d) => d !== day)
        : [...draft!.days, day],
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t("menuLib.sched.title")}
      footer={
        <Button className="w-full" onClick={() => onSave(draft)}>
          {t("menuLib.sched.save")}
        </Button>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuLib.sched.availability")}
          </h3>
          <p className="mt-1 text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuLib.sched.chooseType")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => patch({ type })}
                className={`rounded-[8px] border px-3 py-1.5 text-[14px] ${
                  draft.type === type
                    ? "border-[var(--octo-accent)] text-[var(--octo-accent)]"
                    : "border-[var(--octo-border-card)] text-[var(--octo-text-primary)]"
                }`}
              >
                {t(`menuLib.scheduleType.${type}`)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuLib.sched.window")}
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="text-[13px] text-[var(--octo-text-secondary)]">
              {t("menuLib.sched.startTime")}
              <input
                type="time"
                value={draft.start}
                onChange={(e) => patch({ start: e.target.value })}
                className="mt-1 w-full rounded-[9px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2 text-[14px] text-[var(--octo-text-primary)]"
              />
            </label>
            <label className="text-[13px] text-[var(--octo-text-secondary)]">
              {t("menuLib.sched.endTime")}
              <input
                type="time"
                value={draft.end}
                onChange={(e) => patch({ end: e.target.value })}
                className="mt-1 w-full rounded-[9px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2 text-[14px] text-[var(--octo-text-primary)]"
              />
            </label>
          </div>

          <p className="mt-3 text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuLib.sched.applyTo")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={draft.days.includes(day)}
                onClick={() => toggleDay(day)}
                className={`rounded-full px-3 py-1 text-[13px] ${
                  draft.days.includes(day)
                    ? "bg-[var(--octo-accent)] text-white"
                    : "border border-[var(--octo-border-card)] text-[var(--octo-text-secondary)]"
                }`}
              >
                {t(`menuLib.day.${day}`)}
              </button>
            ))}
          </div>

          <label className="mt-3 block text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuLib.sched.timezone")}
            <Select
              className="mt-1"
              value={draft.timezone}
              onChange={(e) => patch({ timezone: e.target.value })}
            >
              <option value="Asia/Riyadh">(GMT+ 03:00) Asia/Riyadh</option>
            </Select>
          </label>

          <label className="mt-3 block text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuLib.sched.branches")}
            <Select
              className="mt-1"
              value={draft.branchIds[0] ?? ""}
              onChange={(e) => patch({ branchIds: [e.target.value] })}
            >
              {SEED_BRANCHES.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.label}</option>
              ))}
            </Select>
          </label>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuLib.sched.additional")}
          </h3>
          <label className="mt-2 block text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuLib.sched.fallback")}{" "}
            <span className="text-[var(--octo-text-secondary)]">({t("menuLib.sched.fallbackHint")})</span>
            <Select
              className="mt-1"
              value={draft.fallbackMenuId ?? ""}
              onChange={(e) => patch({ fallbackMenuId: e.target.value || null })}
            >
              <option value="">{t("menuLib.sched.fallbackNone")}</option>
              {/* A menu cannot fall back to itself. */}
              {fallbackCandidates(menus, menu.id).map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
              ))}
            </Select>
          </label>

          <Checkbox
            className="mt-3"
            checked={draft.allowPreorderOutsideSchedule}
            onChange={(e) => patch({ allowPreorderOutsideSchedule: e.target.checked })}
            label={t("menuLib.sched.preorder")}
          />
        </section>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Wire it into the page**

In `apps/merchant/src/pages/menu/library/index.tsx`, add to the entity import
list: `setMenuSchedule`, `type MenuSchedule`. Add the import
`import { ScheduleModal } from "./schedule-modal";` and this state:

```tsx
  const [scheduleFor, setScheduleFor] = useState<Menu | null>(null);
```

Replace the `case "schedule":` body in `runAction` with:

```tsx
      case "schedule":
        setScheduleFor(menu);
        return;
```

and render it beside the other overlays:

```tsx
      <ScheduleModal
        menu={scheduleFor}
        menus={menus}
        onClose={() => setScheduleFor(null)}
        onSave={(schedule: MenuSchedule) => {
          if (scheduleFor) {
            setMenus(setMenuSchedule(menus, scheduleFor.id, schedule, new Date().toISOString()));
          }
          setScheduleFor(null);
        }}
      />
```

- [ ] **Step 4: Verify**

Run: `cd apps/merchant && npx tsc -b --noEmit && npm test`
Expected: no type errors, suite green.

- [ ] **Step 5: Screenshot and compare**

Open a card's kebab, pick Schedule. Compare against
`apps/assets/Menu/Menu Design/schedule menu.png`: four numbered blocks, the
five type chips, two time fields, the seven day pills, timezone and branches,
the fallback dropdown, the pre-order checkbox, and a full-width Save. Confirm
the menu being scheduled is absent from its own fallback list. Save, reload,
and confirm the schedule chip on the card reflects the new type.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/pages/menu/library/ packages/i18n/src/locales/
git commit -m "Add the Schedule Menu modal"
```

---

### Task 8: The Create New Menu chooser

**Files:**
- Create: `apps/merchant/src/pages/menu/new/index.tsx`
- Modify: `apps/merchant/src/app/routes/registry.tsx` (add the `menu-new` route)
- Modify: `packages/i18n/src/locales/en/index.ts`, `packages/i18n/src/locales/ar/index.ts`
- Copy: the two illustrations into `apps/merchant/public/images/menu/`

**Interfaces:**
- Consumes: `SEED_BRANCHES` from `@/entities/menu`
- Produces: `CreateMenuPage`

`Create From Scratch` navigates to `/menu/new/scratch`, which the wizard plan
implements. Until then that path has no route and lands on the app's not-found
handling — acceptable for one plan, and named here so the next plan knows the
contract.

- [ ] **Step 1: Copy the illustrations**

```bash
mkdir -p apps/merchant/public/images/menu
cp "apps/assets/Menu/Create Menu.png" apps/merchant/public/images/menu/create-from-scratch.png
cp "apps/assets/Menu/Upload Menu.png" apps/merchant/public/images/menu/upload-with-ai.png
```

- [ ] **Step 2: Add the i18n keys**

Add to `packages/i18n/src/locales/en/index.ts`:

```ts
  "menuNew.title": "Create New Menu",
  "menuNew.subtitle": "Choose how you want to build your menu.",
  "menuNew.restaurant": "Restaurant",
  "menuNew.branch": "Branch",
  "menuNew.timezone": "Timezone",
  "menuNew.currency": "Currency",
  "menuNew.recommended": "Recommended",
  "menuNew.scratch.title": "Create From Scratch",
  "menuNew.scratch.body": "Build your menu step by step. Add sections, items, prices, photos, nutrition, modifiers and more.",
  "menuNew.scratch.p1": "Full control over every detail.",
  "menuNew.scratch.p2": "Perfect for new menus or seasonal updates.",
  "menuNew.scratch.p3": "Advanced options for pricing, tax and modifiers.",
  "menuNew.scratch.cta": "Create From Scratch",
  "menuNew.ai.title": "Upload Menu & Create With AI",
  "menuNew.ai.body": "Upload your existing menu (PDF or image) and our AI will turn it into a beautiful, clickable digital menu.",
  "menuNew.ai.p1": "AI detects sections, items and prices.",
  "menuNew.ai.p2": "Keeps your design and branding.",
  "menuNew.ai.p3": "Review, edit and publish in minutes.",
  "menuNew.ai.cta": "Upload Menu & Create with AI",
  "menuNew.switchHint": "You can switch method anytime. Your progress will be saved as draft.",
```

Add to `packages/i18n/src/locales/ar/index.ts`:

```ts
  "menuNew.title": "إنشاء قائمة جديدة",
  "menuNew.subtitle": "اختر الطريقة التي تريد بناء قائمتك بها.",
  "menuNew.restaurant": "المطعم",
  "menuNew.branch": "الفرع",
  "menuNew.timezone": "المنطقة الزمنية",
  "menuNew.currency": "العملة",
  "menuNew.recommended": "موصى به",
  "menuNew.scratch.title": "البناء من الصفر",
  "menuNew.scratch.body": "ابنِ قائمتك خطوة بخطوة. أضف الأقسام والأصناف والأسعار والصور والقيم الغذائية والإضافات وغيرها.",
  "menuNew.scratch.p1": "تحكم كامل في كل التفاصيل.",
  "menuNew.scratch.p2": "مثالي للقوائم الجديدة أو التحديثات الموسمية.",
  "menuNew.scratch.p3": "خيارات متقدمة للتسعير والضريبة والإضافات.",
  "menuNew.scratch.cta": "البناء من الصفر",
  "menuNew.ai.title": "رفع قائمة وإنشاؤها بالذكاء الاصطناعي",
  "menuNew.ai.body": "ارفع قائمتك الحالية (PDF أو صورة) وسيحولها الذكاء الاصطناعي إلى قائمة رقمية جميلة وقابلة للنقر.",
  "menuNew.ai.p1": "يكتشف الذكاء الاصطناعي الأقسام والأصناف والأسعار.",
  "menuNew.ai.p2": "يحافظ على تصميمك وهويتك البصرية.",
  "menuNew.ai.p3": "راجع وعدّل وانشر في دقائق.",
  "menuNew.ai.cta": "رفع قائمة وإنشاؤها بالذكاء الاصطناعي",
  "menuNew.switchHint": "يمكنك تغيير الطريقة في أي وقت. سيتم حفظ تقدمك كمسودة.",
```

- [ ] **Step 3: Write the page**

Create `apps/merchant/src/pages/menu/new/index.tsx`:

```tsx
// The method chooser. Two cards; the AI one is disabled until its branch is
// built, which is why its illustration is dimmed and its button inert rather
// than the card being hidden — the frame promises the capability exists.
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, Coins, Info, MapPin, Store } from "lucide-react";
import { Button } from "@octopus/ui";
import { SEED_BRANCHES } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3">
      <span className="text-[var(--octo-accent)]" aria-hidden>{icon}</span>
      <span>
        <span className="block text-[12px] text-[var(--octo-text-secondary)]">{label}</span>
        <span className="block text-[14px] font-semibold text-[var(--octo-text-primary)]">{value}</span>
      </span>
    </div>
  );
}

function Point({ children, tone }: { children: string; tone: string }) {
  return (
    <li className="flex items-start gap-2 text-[14px] text-[var(--octo-text-secondary)]">
      <CheckCircle2 size={18} className={`mt-px shrink-0 ${tone}`} aria-hidden />
      {children}
    </li>
  );
}

export function CreateMenuPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header>
        <h1 className="text-[22px] font-semibold text-[var(--octo-text-primary)]">{t("menuNew.title")}</h1>
        <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">{t("menuNew.subtitle")}</p>
      </header>

      <div className="mt-4 grid divide-y divide-[var(--octo-border-card)] rounded-[12px] border border-[var(--octo-border-card)] sm:grid-cols-4 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
        <Fact icon={<Store size={18} />} label={t("menuNew.restaurant")} value="Ocean View Restaurant" />
        <Fact icon={<MapPin size={18} />} label={t("menuNew.branch")} value={SEED_BRANCHES[0].label} />
        <Fact icon={<Clock size={18} />} label={t("menuNew.timezone")} value="(GMT+03:00) ASIA/ RIYADH" />
        <Fact icon={<Coins size={18} />} label={t("menuNew.currency")} value="SAR (Saudi Riyal)" />
      </div>

      <div className="mx-auto mt-6 grid max-w-[1200px] gap-6 lg:grid-cols-2">
        <section className="relative rounded-[16px] border-2 border-[#7c3aed] bg-[#7c3aed]/5 p-6">
          <span className="absolute end-6 top-6 rounded-full bg-[#7c3aed] px-3 py-1 text-[13px] font-semibold text-white">
            {t("menuNew.recommended")}
          </span>
          <img src="/images/menu/create-from-scratch.png" alt="" className="mx-auto h-[220px] object-contain" />
          <h2 className="mt-5 text-[20px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuNew.scratch.title")}
          </h2>
          <p className="mt-2 text-[14px] text-[var(--octo-text-secondary)]">{t("menuNew.scratch.body")}</p>
          <ul className="mt-4 space-y-2.5">
            <Point tone="text-[#7c3aed]">{t("menuNew.scratch.p1")}</Point>
            <Point tone="text-[#7c3aed]">{t("menuNew.scratch.p2")}</Point>
            <Point tone="text-[#7c3aed]">{t("menuNew.scratch.p3")}</Point>
          </ul>
          <Button
            className="mt-5 w-full bg-[#7c3aed] hover:bg-[#6d28d9]"
            onClick={() => navigate("/menu/new/scratch")}
          >
            {t("menuNew.scratch.cta")}
          </Button>
        </section>

        <section className="rounded-[16px] border-2 border-[#16a34a] bg-[#16a34a]/5 p-6 opacity-70">
          <img src="/images/menu/upload-with-ai.png" alt="" className="mx-auto h-[220px] object-contain" />
          <h2 className="mt-5 text-[20px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuNew.ai.title")}
          </h2>
          <p className="mt-2 text-[14px] text-[var(--octo-text-secondary)]">{t("menuNew.ai.body")}</p>
          <ul className="mt-4 space-y-2.5">
            <Point tone="text-[#16a34a]">{t("menuNew.ai.p1")}</Point>
            <Point tone="text-[#16a34a]">{t("menuNew.ai.p2")}</Point>
            <Point tone="text-[#16a34a]">{t("menuNew.ai.p3")}</Point>
          </ul>
          <Button className="mt-5 w-full" disabled title={t("menuLib.importAiSoon")}>
            {t("menuNew.ai.cta")}
          </Button>
        </section>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 rounded-[10px] bg-[var(--octo-hover)] px-4 py-3 text-[14px] text-[var(--octo-accent)]">
        <Info size={16} aria-hidden />
        {t("menuNew.switchHint")}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Add the route**

In `apps/merchant/src/app/routes/registry.tsx`, directly after the `menu` entry, add:

```tsx
  { id: "menu-new",     path: "/menu/new",     section: "Menu",         page: "Create New Menu",
    element: lazy(() => import("@/pages/menu/new").then(m => ({ default: m.CreateMenuPage }))) },
```

- [ ] **Step 5: Verify**

Run: `cd apps/merchant && npx tsc -b --noEmit && npm test`
Expected: no type errors, suite green.

- [ ] **Step 6: Screenshot and compare**

Open `/menu`, click Create New Menu. Compare against
`apps/assets/Menu/Menu Design/ADD NEW MENU - For first time or adding.png`:
the four-fact strip, two cards side by side, the purple Recommended pill, the
two illustrations, three ticks each, and the switch-method hint. Confirm the AI
card's button does not respond to clicks.

- [ ] **Step 7: Commit**

```bash
git add apps/merchant/src/pages/menu/new/ apps/merchant/public/images/menu/ apps/merchant/src/app/routes/registry.tsx packages/i18n/src/locales/
git commit -m "Add the Create New Menu method chooser"
```

---

## What this plan does not do

Named so the next plan's author does not go looking:

- **The wizard.** `/menu/new/scratch` and `/menu/:menuId/build/*` have no
  routes yet. Task 6's `edit` action and Task 8's scratch button both navigate
  to paths the wizard plan creates.
- **The `entities/site-draft/` extraction.** Moved to the wizard plan, where
  the Theme step is its first consumer.
- **`pricing.ts` and `validation.ts`.** They belong to the offer editor and the
  Review step.
- **Removing the six old pages.** They stay routed at `/menu/items` and its
  siblings, unreachable from the sidebar's Menu entry only once the wizard
  plan's final task removes their `ITEM_PATHS` rows. Until then both the old
  pages and the new library exist; only `/menu` changed hands.
- **The AI branch.** Disabled in two places, specced but not built.
