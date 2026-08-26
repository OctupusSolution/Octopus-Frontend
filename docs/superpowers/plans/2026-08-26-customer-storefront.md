# Customer Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the four designed customer-facing storefront screens — home, menu index, category listing with filters, and product details — on top of an extended menu contract, in `apps/customer`.

**Architecture:** Next.js 14 App Router with Feature-Sliced Design. Pages are server components that read mock data from `@octopus/api-client` and pass it to view components; only the pieces that need state (`"use client"`) are client components. Filter and chip state lives in the URL query string so listings stay server-rendered and shareable. All new UI lives inside `apps/customer`; `packages/ui` and `packages/config` are not touched.

**Tech Stack:** Next.js 14.2, React 18.3, TypeScript 5.5, Tailwind 3.4 (via `packages/config/tailwind/preset`), `lucide-react` icons, `clsx`, vitest (new, dev-only, `apps/customer` only).

**Spec:** `docs/superpowers/specs/2026-08-26-customer-storefront-design.md`

## Global Constraints

- **RTL is mandatory.** Logical Tailwind classes only: `ms- me- ps- pe- text-start text-end border-s border-e`. Never `ml- mr- pl- pr- text-left text-right border-l border-r`.
- **TypeScript only.** No `.js`/`.jsx`. No `any`.
- **FSD import direction is strictly downward.** `app → views → widgets → features → entities → shared`. A layer never imports from a layer above it. Every slice exposes exactly one `index.ts`; never deep-import another slice's internals.
- **Define components at module scope**, never inside another component's render body.
- **No new runtime dependencies.** vitest is dev-only and installed in Task 2 only.
- **Do not touch** `packages/ui/src/index.ts`, `packages/ui/src/primitives/index.ts`, `packages/i18n/src/index.ts`, `apps/merchant/**`, `apps/admin/**`, `apps/website/**`, root `package.json`, `turbo.json`, `tsconfig.base.json`.
- **Colours come from the shared palette** (AGENTS.md §5) plus exactly four new storefront surface tokens defined in Task 4. Never invent another hex value.
- **Typography:** Latin Inter, Arabic Readex Pro, already wired in `layout.tsx`. Never hardcode a font per locale.
- **Mock data lives in its own file**, exported as typed `readonly` consts.
- **Currency:** amounts render as `153.00` with the currency word supplied separately from the `store.currency` i18n key. Never call `formatSar` in new storefront UI.
- **Every task ends with `npx tsc --noEmit` clean from `apps/customer`.**

---

## File Structure

| File | Responsibility |
|---|---|
| `packages/api-client/src/contracts/menu.ts` | Extended `MenuItem` / `MenuCategory`, new `MenuGroup`, expanded mock data |
| `packages/i18n/src/locales/{ar,en}/index.ts` | `store.*` UI chrome keys |
| `apps/customer/vitest.config.ts` | Test runner config |
| `apps/customer/src/shared/lib/storefront.ts` | Pure logic: discount, filtering, derivation |
| `apps/customer/src/shared/lib/storefront.test.ts` | Its tests |
| `apps/customer/src/shared/i18n/keys.test.ts` | ar/en key-parity guard |
| `apps/customer/src/shared/lib/pricing.ts` | `formatAmount` added |
| `apps/customer/src/app/globals.css` | `--octo-store-*` tokens |
| `apps/customer/src/app/providers/i18n-provider.tsx` | SSR-safe `t()` for the storefront |
| `apps/customer/src/shared/ui/*` | Presentational primitives |
| `apps/customer/src/widgets/*` | Composed page blocks |
| `apps/customer/src/features/menu/*` | Filtering and favourites |
| `apps/customer/src/views/*` | One per route |
| `apps/customer/src/app/**/page.tsx` | Route entry points |

---

## Task 1: Extend the menu contract and mock data

**Files:**
- Modify: `packages/api-client/src/contracts/menu.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `MenuGroupId`, `AllergenId`, `DietaryId`, `MenuItemBadge`, `MenuGroup`, `MENU_GROUPS: readonly MenuGroup[]`, extended `MenuItem` and `MenuCategory`, `getMenuForTenant(tenantId: string): { categories: MenuCategory[]; items: MenuItem[] }` (unchanged signature), `getMenuGroups(): MenuGroup[]`

- [ ] **Step 1: Add the new type unions above `MenuItemModifierOption`**

```ts
export type MenuGroupId =
  | "all" | "chicken" | "meat" | "burger" | "pizza"
  | "sides" | "appetizers" | "salads";

export type AllergenId =
  | "gluten" | "dairy" | "eggs" | "nuts" | "soy" | "seafood";

export type DietaryId =
  | "vegetarian" | "vegan" | "gluten_free" | "spicy" | "healthy";

export type MenuItemBadge = "best_seller" | "offer" | "new";

// Labels are UI chrome, resolved through i18n (`store.group.<id>`), so a group
// carries no name of its own — unlike a category, which a merchant names.
export interface MenuGroup {
  id: MenuGroupId;
  imageUrl: string;
}
```

- [ ] **Step 2: Add `display` to `MenuItemModifierGroup`**

Add as the last property of the existing interface:

```ts
  // The product page draws short single-choice groups as radio pills and long
  // or optional ones as collapsed accordions. An explicit flag beats counting
  // options, which would silently relayout when a merchant adds a sauce.
  display?: "pills" | "accordion";
```

- [ ] **Step 3: Add the optional display fields to `MenuItem`**

Add as the last properties of the existing interface. Every one is optional so
`add-to-cart-modal`, the cart, checkout and order tracking keep compiling:

```ts
  images?: string[];
  compareAtPriceSar?: number;
  priceFrom?: boolean;
  rating?: number;
  calories?: number;
  allergens?: AllergenId[];
  badges?: MenuItemBadge[];
  group?: MenuGroupId;
  dietary?: DietaryId[];
  inStock?: boolean;
```

- [ ] **Step 4: Add `slug` to `MenuCategory`**

`slug` is required, not optional: it is the URL segment, every category needs
one, and this file is the only place categories are constructed.

```ts
export interface MenuCategory {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
}
```

- [ ] **Step 5: Replace the `CATEGORIES` const**

```ts
const IMG = "/images/storefront";

const CATEGORIES: readonly MenuCategory[] = [
  { id: "cat-main", slug: "main", name: "الأطباق الرئيسية", imageUrl: `${IMG}/cat-mains.webp` },
  { id: "cat-breakfast", slug: "breakfast", name: "الإفطار", imageUrl: `${IMG}/cat-breakfast.webp` },
  { id: "cat-lunch", slug: "lunch", name: "الغداء", imageUrl: `${IMG}/dish-3.webp` },
  { id: "cat-desserts", slug: "desserts", name: "الحلويات", imageUrl: `${IMG}/cat-desserts.webp` },
  { id: "cat-drinks", slug: "drinks", name: "المشروبات", imageUrl: `${IMG}/cat-drinks.webp` },
];
```

- [ ] **Step 6: Add `MENU_GROUPS` below `CATEGORIES`**

Order matters — it is the chip rail's reading order from the start edge.
Only eight real photographs exist, so chips repeat them; that repetition is
deliberate and visible rather than invented variety.

```ts
const MENU_GROUPS: readonly MenuGroup[] = [
  { id: "all", imageUrl: `${IMG}/cat-mains.webp` },
  { id: "chicken", imageUrl: `${IMG}/dish-1.webp` },
  { id: "meat", imageUrl: `${IMG}/dish-3.webp` },
  { id: "burger", imageUrl: `${IMG}/dish-1.webp` },
  { id: "pizza", imageUrl: `${IMG}/cat-desserts.webp` },
  { id: "sides", imageUrl: `${IMG}/cat-breakfast.webp` },
  { id: "appetizers", imageUrl: `${IMG}/cat-mains.webp` },
  { id: "salads", imageUrl: `${IMG}/cat-drinks.webp` },
];

export function getMenuGroups(): MenuGroup[] {
  return [...MENU_GROUPS];
}
```

- [ ] **Step 7: Rewrite the `ITEMS` array**

Keep every existing item id — the cart persists `menuItemId` in `localStorage`
and renaming ids would orphan live carts. Enrich the existing eighteen and add
six more so the eight chips and six filters all have something to match.
Every item gets `group`, `rating`, `calories`, `inStock`; items with a
`compareAtPriceSar` must satisfy `priceSar < compareAtPriceSar`.

Use this shape (shown for the first item; apply the same treatment to all):

```ts
  {
    id: "item-classic-chicken-burger",
    categoryId: "cat-main",
    name: "برجر دجاج كلاسيك",
    description: "قطعة دجاج مقرمشة وذهبية، تعلوها جبنة ذائبة وخس طازج مع صوص كلاسيك غني داخل خبز بريوش طري.",
    priceSar: 153,
    compareAtPriceSar: 170,
    imageUrl: `${IMG}/dish-1.webp`,
    images: [`${IMG}/dish-1.webp`, `${IMG}/dish-1.webp`, `${IMG}/dish-1.webp`],
    available: true,
    inStock: true,
    availableFor: ALL_CHANNELS,
    rating: 4.5,
    calories: 900,
    allergens: ["gluten", "dairy", "eggs"],
    badges: ["best_seller", "offer"],
    group: "burger",
    dietary: ["spicy"],
    modifierGroups: [ /* see Step 8 */ ],
  },
```

Group assignment for the existing items: `item-mashawi-table` → `meat`,
`item-beef-burger` → `burger`, `item-grilled-chicken-platter` → `chicken`,
`item-shawarma-plate` → `chicken`, the four `cat-breakfast` items → `sides`,
`item-kabsa` and `item-mandi` → `meat`, `item-grilled-fish` → `meat`, the three
desserts → `pizza`, the three drinks → `salads`.

Six new items, so `pizza`, `sides`, `appetizers` and `salads` are not carried by
repurposed dishes alone: `item-margherita-pizza` (cat-main, pizza, 96),
`item-pepperoni-pizza` (cat-main, pizza, 112), `item-loaded-fries` (cat-main,
sides, 38), `item-mozzarella-sticks` (cat-main, appetizers, 44),
`item-caesar-salad` (cat-lunch, salads, 55, `dietary: ["healthy"]`),
`item-fattoush` (cat-lunch, salads, 42, `dietary: ["vegetarian", "healthy"]`).

At least one item must carry `inStock: false` (use `item-mashawi-table`) so the
«متوفر» filter is demonstrably doing something, and one must carry
`priceFrom: true` with no `compareAtPriceSar` — rename `item-molten-cake` to
name «كيك مناسبات مخصوص» with `priceSar: 153`, `priceFrom: true`,
`imageUrl: ${IMG}/dish-2.webp`, matching the card in the design.

Mark six items `badges: ["best_seller"]` and six `badges: ["offer"]` (with
overlap allowed) so both home rows fill.

- [ ] **Step 8: Give `item-classic-chicken-burger` the five modifier groups the product page draws**

```ts
    modifierGroups: [
      {
        id: "grp-size", label: "إختر الحجم", required: true, multiple: false, display: "pills",
        options: [
          { id: "opt-size-small", label: "صغير", priceDeltaSar: 0 },
          { id: "opt-size-medium", label: "متوسط", priceDeltaSar: 15 },
          { id: "opt-size-large", label: "كبير", priceDeltaSar: 30 },
          { id: "opt-size-family", label: "عائلي", priceDeltaSar: 55 },
        ],
      },
      {
        id: "grp-bread", label: "نوع الخبز", required: true, multiple: false, display: "pills",
        options: [
          { id: "opt-bread-white", label: "خبز ابيض", priceDeltaSar: 0 },
          { id: "opt-bread-brown", label: "خبز اسمر", priceDeltaSar: 0 },
          { id: "opt-bread-none", label: "بدون خبز", priceDeltaSar: 0 },
        ],
      },
      {
        id: "grp-spice", label: "مستوى التوابل", required: true, multiple: false, display: "pills",
        options: [
          { id: "opt-spice-hot", label: "حار", priceDeltaSar: 0 },
          { id: "opt-spice-medium", label: "متوسط", priceDeltaSar: 0 },
          { id: "opt-spice-plain", label: "عادي", priceDeltaSar: 0 },
        ],
      },
      {
        id: "grp-extras", label: "الإضافات", required: false, multiple: true, display: "accordion",
        options: [
          { id: "opt-extra-cheese", label: "جبنة إضافية", priceDeltaSar: 12 },
          { id: "opt-extra-bacon", label: "بيكون", priceDeltaSar: 18 },
          { id: "opt-extra-spicy", label: "صلصة حارة", priceDeltaSar: 5 },
        ],
      },
      {
        id: "grp-doneness", label: "مستوى الطهي", required: false, multiple: false, display: "accordion",
        options: [
          { id: "opt-done-medium", label: "وسط", priceDeltaSar: 0 },
          { id: "opt-done-well", label: "ناضج تماماً", priceDeltaSar: 0 },
        ],
      },
    ],
```

- [ ] **Step 9: Verify the typecheck**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add packages/api-client/src/contracts/menu.ts
git commit -m "feat(api-client): extend the menu contract for the storefront"
```

---

## Task 2: Storefront logic and its tests

**Files:**
- Create: `apps/customer/vitest.config.ts`
- Create: `apps/customer/src/shared/lib/storefront.ts`
- Create: `apps/customer/src/shared/lib/storefront.test.ts`
- Modify: `apps/customer/package.json` (add `vitest` devDependency and a `test` script)
- Modify: `apps/customer/src/shared/lib/pricing.ts` (add `formatAmount`)

**Interfaces:**
- Consumes: `MenuItem`, `MenuGroupId`, `AllergenId`, `DietaryId` from Task 1
- Produces:
  - `discountPercent(item: MenuItem): number | null`
  - `MenuFilters` interface and `parseFilters(params: URLSearchParams): MenuFilters`
  - `filterItems(items: MenuItem[], filters: MenuFilters): MenuItem[]`
  - `bestSellers(items: MenuItem[], limit?: number): MenuItem[]`
  - `offers(items: MenuItem[], limit?: number): MenuItem[]`
  - `relatedItems(items: MenuItem[], to: MenuItem, limit?: number): MenuItem[]`
  - `formatAmount(n: number): string` from `pricing.ts`

- [ ] **Step 1: Install vitest**

Run from the repo root:
`npm install --save-dev --workspace @octopus/customer vitest@^2.1.1`

- [ ] **Step 2: Add the test script**

In `apps/customer/package.json`, add to `"scripts"`:

```json
    "test": "vitest run"
```

- [ ] **Step 3: Create the vitest config**

`apps/customer/vitest.config.ts` — the path aliases must mirror `tsconfig.json`
or the test file cannot resolve `@octopus/api-client`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@octopus/api-client": fileURLToPath(new URL("../../packages/api-client/src/index.ts", import.meta.url)),
      "@i18n": fileURLToPath(new URL("../../packages/i18n/src", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 4: Write the failing tests**

`apps/customer/src/shared/lib/storefront.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { MenuItem } from "@octopus/api-client";
import {
  bestSellers, discountPercent, filterItems, offers, parseFilters, relatedItems,
} from "./storefront";

function item(overrides: Partial<MenuItem> & { id: string }): MenuItem {
  return {
    categoryId: "cat-main", name: "x", description: "", priceSar: 100,
    imageUrl: "", available: true, availableFor: ["delivery"], modifierGroups: [],
    ...overrides,
  } as MenuItem;
}

describe("discountPercent", () => {
  it("derives the design's 10% from 153 against 170", () => {
    expect(discountPercent(item({ id: "a", priceSar: 153, compareAtPriceSar: 170 }))).toBe(10);
  });

  it("is null without a compare-at price", () => {
    expect(discountPercent(item({ id: "a", priceSar: 153 }))).toBeNull();
  });

  it("is null when the compare-at price is not higher, rather than reporting a negative discount", () => {
    expect(discountPercent(item({ id: "a", priceSar: 170, compareAtPriceSar: 170 }))).toBeNull();
    expect(discountPercent(item({ id: "a", priceSar: 180, compareAtPriceSar: 170 }))).toBeNull();
  });

  it("rounds to a whole percent", () => {
    expect(discountPercent(item({ id: "a", priceSar: 66, compareAtPriceSar: 100 }))).toBe(34);
  });
});

describe("parseFilters", () => {
  it("reads every supported parameter", () => {
    const f = parseFilters(new URLSearchParams("group=burger&best=1&available=1&price=50-150&diet=spicy&allergen=nuts"));
    expect(f).toEqual({
      group: "burger", bestSellersOnly: true, availableOnly: true,
      minPriceSar: 50, maxPriceSar: 150, dietary: ["spicy"], excludeAllergens: ["nuts"],
    });
  });

  it("defaults to an empty filter set", () => {
    expect(parseFilters(new URLSearchParams())).toEqual({
      group: null, bestSellersOnly: false, availableOnly: false,
      minPriceSar: null, maxPriceSar: null, dietary: [], excludeAllergens: [],
    });
  });

  it("ignores a group that is not a known id", () => {
    expect(parseFilters(new URLSearchParams("group=sandwiches")).group).toBeNull();
  });

  it("treats the all chip as no group filter", () => {
    expect(parseFilters(new URLSearchParams("group=all")).group).toBeNull();
  });

  it("ignores a malformed price range instead of filtering everything out", () => {
    const f = parseFilters(new URLSearchParams("price=cheap"));
    expect(f.minPriceSar).toBeNull();
    expect(f.maxPriceSar).toBeNull();
  });
});

describe("filterItems", () => {
  const items = [
    item({ id: "burger", group: "burger", priceSar: 153, badges: ["best_seller"], inStock: true, allergens: ["gluten"], dietary: ["spicy"] }),
    item({ id: "salad", group: "salads", priceSar: 42, inStock: true, dietary: ["healthy", "vegetarian"] }),
    item({ id: "sold-out", group: "meat", priceSar: 210, inStock: false }),
  ];
  const none = parseFilters(new URLSearchParams());

  it("returns everything when nothing is set", () => {
    expect(filterItems(items, none).map((i) => i.id)).toEqual(["burger", "salad", "sold-out"]);
  });

  it("filters by group", () => {
    expect(filterItems(items, { ...none, group: "salads" }).map((i) => i.id)).toEqual(["salad"]);
  });

  it("filters by best seller badge", () => {
    expect(filterItems(items, { ...none, bestSellersOnly: true }).map((i) => i.id)).toEqual(["burger"]);
  });

  it("filters out items that are not in stock", () => {
    expect(filterItems(items, { ...none, availableOnly: true }).map((i) => i.id)).toEqual(["burger", "salad"]);
  });

  it("treats a missing inStock as in stock", () => {
    const legacy = [item({ id: "legacy", priceSar: 10 })];
    expect(filterItems(legacy, { ...none, availableOnly: true })).toHaveLength(1);
  });

  it("filters by price range inclusively", () => {
    expect(filterItems(items, { ...none, minPriceSar: 42, maxPriceSar: 153 }).map((i) => i.id)).toEqual(["burger", "salad"]);
  });

  it("filters by dietary preference", () => {
    expect(filterItems(items, { ...none, dietary: ["healthy"] }).map((i) => i.id)).toEqual(["salad"]);
  });

  it("excludes items containing an unwanted allergen", () => {
    expect(filterItems(items, { ...none, excludeAllergens: ["gluten"] }).map((i) => i.id)).toEqual(["salad", "sold-out"]);
  });

  it("combines filters as AND", () => {
    expect(filterItems(items, { ...none, availableOnly: true, maxPriceSar: 100 }).map((i) => i.id)).toEqual(["salad"]);
  });
});

describe("derivations", () => {
  const items = [
    item({ id: "a", badges: ["best_seller"], categoryId: "cat-main", group: "burger" }),
    item({ id: "b", badges: ["offer"], compareAtPriceSar: 200, categoryId: "cat-main", group: "burger" }),
    item({ id: "c", categoryId: "cat-lunch", group: "salads" }),
  ];

  it("picks out best sellers", () => {
    expect(bestSellers(items).map((i) => i.id)).toEqual(["a"]);
  });

  it("picks out offers", () => {
    expect(offers(items).map((i) => i.id)).toEqual(["b"]);
  });

  it("honours the limit", () => {
    const many = Array.from({ length: 9 }, (_, n) => item({ id: `x${n}`, badges: ["best_seller"] }));
    expect(bestSellers(many, 4)).toHaveLength(4);
  });

  it("relates by group and never includes the item itself", () => {
    const related = relatedItems(items, items[0]);
    expect(related.map((i) => i.id)).toEqual(["b"]);
  });

  it("falls back to the same category when the group has nothing else", () => {
    const related = relatedItems(items, items[2]);
    expect(related.map((i) => i.id)).not.toContain("c");
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run from `apps/customer`: `npx vitest run`
Expected: FAIL — `Failed to resolve import "./storefront"`.

- [ ] **Step 6: Implement `storefront.ts`**

```ts
import type { AllergenId, DietaryId, MenuGroupId, MenuItem } from "@octopus/api-client";

const GROUP_IDS: readonly MenuGroupId[] = [
  "all", "chicken", "meat", "burger", "pizza", "sides", "appetizers", "salads",
];
const DIETARY_IDS: readonly DietaryId[] = [
  "vegetarian", "vegan", "gluten_free", "spicy", "healthy",
];
const ALLERGEN_IDS: readonly AllergenId[] = [
  "gluten", "dairy", "eggs", "nuts", "soy", "seafood",
];

/** Derived, never stored — a stored percentage can disagree with its prices. */
export function discountPercent(item: MenuItem): number | null {
  const was = item.compareAtPriceSar;
  if (was === undefined || was <= item.priceSar) return null;
  return Math.round((1 - item.priceSar / was) * 100);
}

export interface MenuFilters {
  group: MenuGroupId | null;
  bestSellersOnly: boolean;
  availableOnly: boolean;
  minPriceSar: number | null;
  maxPriceSar: number | null;
  dietary: DietaryId[];
  excludeAllergens: AllergenId[];
}

function readList<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]): T[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export function parseFilters(params: URLSearchParams): MenuFilters {
  const rawGroup = params.get("group");
  // "all" is the default chip, not a group items belong to.
  const group =
    rawGroup && rawGroup !== "all" && (GROUP_IDS as readonly string[]).includes(rawGroup)
      ? (rawGroup as MenuGroupId)
      : null;

  let minPriceSar: number | null = null;
  let maxPriceSar: number | null = null;
  const price = params.get("price");
  if (price) {
    const [lo, hi] = price.split("-").map((n) => Number.parseFloat(n));
    // A malformed range must not silently filter the whole grid away.
    if (Number.isFinite(lo)) minPriceSar = lo;
    if (Number.isFinite(hi)) maxPriceSar = hi;
  }

  return {
    group,
    bestSellersOnly: params.get("best") === "1",
    availableOnly: params.get("available") === "1",
    minPriceSar,
    maxPriceSar,
    dietary: readList(params, "diet", DIETARY_IDS),
    excludeAllergens: readList(params, "allergen", ALLERGEN_IDS),
  };
}

export function filterItems(items: MenuItem[], filters: MenuFilters): MenuItem[] {
  return items.filter((item) => {
    if (filters.group && item.group !== filters.group) return false;
    if (filters.bestSellersOnly && !item.badges?.includes("best_seller")) return false;
    // An item predating the field is in stock; absence is not a stock-out.
    if (filters.availableOnly && item.inStock === false) return false;
    if (filters.minPriceSar !== null && item.priceSar < filters.minPriceSar) return false;
    if (filters.maxPriceSar !== null && item.priceSar > filters.maxPriceSar) return false;
    if (filters.dietary.length > 0 && !filters.dietary.every((d) => item.dietary?.includes(d))) return false;
    if (filters.excludeAllergens.some((a) => item.allergens?.includes(a))) return false;
    return true;
  });
}

export function bestSellers(items: MenuItem[], limit = 4): MenuItem[] {
  return items.filter((i) => i.badges?.includes("best_seller")).slice(0, limit);
}

export function offers(items: MenuItem[], limit = 4): MenuItem[] {
  return items.filter((i) => i.badges?.includes("offer")).slice(0, limit);
}

/** Same group first, then the same category, so the row always fills. */
export function relatedItems(items: MenuItem[], to: MenuItem, limit = 4): MenuItem[] {
  const others = items.filter((i) => i.id !== to.id);
  const sameGroup = others.filter((i) => to.group !== undefined && i.group === to.group);
  const sameCategory = others.filter(
    (i) => i.categoryId === to.categoryId && !sameGroup.includes(i),
  );
  return [...sameGroup, ...sameCategory].slice(0, limit);
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run from `apps/customer`: `npx vitest run`
Expected: PASS, 24 tests.

- [ ] **Step 8: Add `formatAmount` to `pricing.ts`**

Append to `apps/customer/src/shared/lib/pricing.ts`. `formatSar` from
`@octopus/api-client` renders `"SAR 153.00"`; the storefront shows the number
and the currency word separately at different sizes, and `money.ts` is shared
with the merchant console so it is not changed.

```ts
/** "153.00" — the currency word comes from the `store.currency` i18n key. */
export function formatAmount(n: number): string {
  return n.toFixed(2);
}
```

- [ ] **Step 9: Verify the typecheck**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add apps/customer/vitest.config.ts apps/customer/package.json apps/customer/src/shared/lib/
git commit -m "feat(customer): add storefront filtering and pricing logic with tests"
```

---

## Task 3: Storefront i18n keys

**Files:**
- Modify: `packages/i18n/src/locales/ar/index.ts`
- Modify: `packages/i18n/src/locales/en/index.ts`
- Create: `apps/customer/src/shared/i18n/keys.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: the `store.*` key namespace, consumed by every task from 5 onward

- [ ] **Step 1: Write the failing parity test**

`apps/customer/src/shared/i18n/keys.test.ts` — the ar file already warns that
its keys must stay in sync with en and asks for exactly this guard:

```ts
import { describe, expect, it } from "vitest";
import { ar, en } from "@i18n/index";

describe("locale dictionaries", () => {
  it("define exactly the same keys", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it("cover every storefront key in both languages", () => {
    const storeKeys = Object.keys(en).filter((k) => k.startsWith("store."));
    expect(storeKeys.length).toBeGreaterThan(0);
    for (const key of storeKeys) {
      expect((ar as Record<string, string>)[key], key).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run it to see where the dictionaries stand**

Run from `apps/customer`: `npx vitest run src/shared/i18n/keys.test.ts`
Expected: FAIL on the second test — no `store.` keys exist yet. If the first
test also fails, the pre-existing dictionaries are already out of sync; fix
that drift as part of this task before adding new keys.

- [ ] **Step 3: Append the `store.*` block to the Arabic dictionary**

Add before the closing brace of `export const ar = {`:

```ts
  /* --------------------------------------------------------------- storefront */
  "store.currency": "ر.س",
  "store.nav.home": "الرئيسية",
  "store.nav.menu": "القائمة",
  "store.nav.products": "المنتجات",
  "store.nav.bestSellers": "الاكثر مبيعا",
  "store.nav.offers": "اقوى العروض",
  "store.nav.booking": "إحجز طاولة",
  "store.nav.trackOrder": "تتبع الطلب",
  "store.nav.language": "العربية",
  "store.nav.cart": "السلة",
  "store.nav.openMenu": "فتح القائمة",

  "store.hero.title": "نكهة تُصنع بشغف، وتُحفظ في الذاكرة",
  "store.hero.subtitle":
    "من أول لقمة لآخر تفصيلة، نقدم لك تجربة تجمع بين المكونات المختارة بعناية، النكهات المميزة، ولمستنا الخاصة — لأن كل وجبة تستحق أن تكون تجربة.",
  "store.hero.viewMenu": "عرض القائمة",
  "store.hero.bookTable": "إحجز طاولة",

  "store.section.menu": "القائمة",
  "store.section.bestSellers": "الأكثر مبيعا",
  "store.section.offers": "أقوى العروض",
  "store.section.related": "جربها مع",
  "store.section.availableMeals": "الوجبات المتاحة",
  "store.section.productDetails": "تفاصيل المنتج",

  "store.card.bestSeller": "الاكثر مبيعا",
  "store.card.priceFrom": "السعر يبدأ من",
  "store.card.addToCart": "أضف إلى السلة",
  "store.card.favorite": "أضف إلى المفضلة",
  "store.card.unfavorite": "إزالة من المفضلة",

  "store.filter.toggle": "تصفية",
  "store.filter.bestSellers": "الاكثر مبيعا",
  "store.filter.price": "السعر",
  "store.filter.allergens": "مسببات للحساسية",
  "store.filter.dietary": "التفضيلات الغذائية",
  "store.filter.mealType": "نوع الوجبة",
  "store.filter.available": "متوفر",
  "store.filter.clear": "مسح الفلاتر",
  "store.filter.empty": "لا توجد أصناف مطابقة لاختيارك.",

  "store.group.all": "الكل",
  "store.group.chicken": "وجبات الدجاج",
  "store.group.meat": "اللحوم",
  "store.group.burger": "البرجر",
  "store.group.pizza": "البيتزا",
  "store.group.sides": "الجانبيات",
  "store.group.appetizers": "المقبلات",
  "store.group.salads": "السلطات",

  "store.dietary.vegetarian": "نباتي",
  "store.dietary.vegan": "نباتي صرف",
  "store.dietary.gluten_free": "خالٍ من الجلوتين",
  "store.dietary.spicy": "حار",
  "store.dietary.healthy": "صحي",

  "store.allergen.gluten": "جلوتين",
  "store.allergen.dairy": "ألبان",
  "store.allergen.eggs": "بيض",
  "store.allergen.nuts": "مكسرات",
  "store.allergen.soy": "صويا",
  "store.allergen.seafood": "مأكولات بحرية",

  "store.product.calories": "{n} سعر حراري",
  "store.product.discount": "خصم {n}%",
  "store.product.customize": "خصص طلبك",
  "store.product.quantity": "العدد",
  "store.product.addToCart": "إضافة إلي السلة",
  "store.product.decrease": "إنقاص الكمية",
  "store.product.increase": "زيادة الكمية",
  "store.product.outOfStock": "غير متوفر حالياً",

  "store.allergy.title": "معلومات الحساسية",
  "store.allergy.body":
    "يرجى مراجعة مكونات المنتج والتأكد من توافقها مع احتياجاتك الغذائية قبل الطلب. إذا كان لديك حساسية شديدة تجاه أي مكوّن، يرجى إبلاغ المطعم قبل الطلب.",
  "store.allergy.contains": "المنتج يحتوي على:",

  "store.footer.tagline":
    "نقدم لك تجربة طعام مميزة تجمع بين النكهات الغنية، المكونات الطازجة، ولمستنا الخاصة في كل طبق.",
  "store.footer.followUs": "تابعنا",
  "store.footer.explore": "استكشف",
  "store.footer.info": "معلومات",
  "store.footer.contactUs": "تواصل معنا",
  "store.footer.privacy": "سياسة الخصوصية",
  "store.footer.terms": "الشروط والأحكام",
  "store.footer.visitUs": "زورونا",
  "store.footer.address": "الرياض، المملكة العربية السعودية",
  "store.footer.hours": "يومياً 11:00 ص – 12:00 ص",
  "store.footer.newsletterTitle": "انضم إلينا اليوم واستمتع بمزايا حصرية!",
  "store.footer.newsletterPlaceholder": "ادخل البريد الالكتروني",
  "store.footer.newsletterSubmit": "إرسال",
  "store.footer.newsletterThanks": "شكراً لك، تم تسجيل بريدك.",
  "store.footer.newsletterInvalid": "من فضلك أدخل بريداً إلكترونياً صحيحاً.",
```

- [ ] **Step 4: Append the matching English block**

Same keys, in the same order, in `packages/i18n/src/locales/en/index.ts`:

```ts
  /* --------------------------------------------------------------- storefront */
  "store.currency": "SAR",
  "store.nav.home": "Home",
  "store.nav.menu": "Menu",
  "store.nav.products": "Products",
  "store.nav.bestSellers": "Best sellers",
  "store.nav.offers": "Top offers",
  "store.nav.booking": "Book a table",
  "store.nav.trackOrder": "Track order",
  "store.nav.language": "English",
  "store.nav.cart": "Cart",
  "store.nav.openMenu": "Open menu",

  "store.hero.title": "Flavour made with passion, remembered for life",
  "store.hero.subtitle":
    "From the first bite to the last detail, we bring you carefully chosen ingredients, distinctive flavours and our own signature touch — because every meal deserves to be an experience.",
  "store.hero.viewMenu": "View menu",
  "store.hero.bookTable": "Book a table",

  "store.section.menu": "Menu",
  "store.section.bestSellers": "Best sellers",
  "store.section.offers": "Top offers",
  "store.section.related": "Try it with",
  "store.section.availableMeals": "Available meals",
  "store.section.productDetails": "Product details",

  "store.card.bestSeller": "Best seller",
  "store.card.priceFrom": "Starting from",
  "store.card.addToCart": "Add to cart",
  "store.card.favorite": "Add to favourites",
  "store.card.unfavorite": "Remove from favourites",

  "store.filter.toggle": "Filter",
  "store.filter.bestSellers": "Best sellers",
  "store.filter.price": "Price",
  "store.filter.allergens": "Allergens",
  "store.filter.dietary": "Dietary preferences",
  "store.filter.mealType": "Meal type",
  "store.filter.available": "In stock",
  "store.filter.clear": "Clear filters",
  "store.filter.empty": "No items match your selection.",

  "store.group.all": "All",
  "store.group.chicken": "Chicken",
  "store.group.meat": "Meat",
  "store.group.burger": "Burgers",
  "store.group.pizza": "Pizza",
  "store.group.sides": "Sides",
  "store.group.appetizers": "Appetizers",
  "store.group.salads": "Salads",

  "store.dietary.vegetarian": "Vegetarian",
  "store.dietary.vegan": "Vegan",
  "store.dietary.gluten_free": "Gluten free",
  "store.dietary.spicy": "Spicy",
  "store.dietary.healthy": "Healthy",

  "store.allergen.gluten": "Gluten",
  "store.allergen.dairy": "Dairy",
  "store.allergen.eggs": "Eggs",
  "store.allergen.nuts": "Nuts",
  "store.allergen.soy": "Soy",
  "store.allergen.seafood": "Seafood",

  "store.product.calories": "{n} calories",
  "store.product.discount": "{n}% off",
  "store.product.customize": "Customise your order",
  "store.product.quantity": "Quantity",
  "store.product.addToCart": "Add to cart",
  "store.product.decrease": "Decrease quantity",
  "store.product.increase": "Increase quantity",
  "store.product.outOfStock": "Out of stock",

  "store.allergy.title": "Allergy information",
  "store.allergy.body":
    "Please review the product's ingredients and make sure they suit your dietary needs before ordering. If you have a severe allergy to any ingredient, tell the restaurant before you order.",
  "store.allergy.contains": "This product contains:",

  "store.footer.tagline":
    "We bring you a distinctive dining experience — rich flavours, fresh ingredients and our own signature touch in every dish.",
  "store.footer.followUs": "Follow us",
  "store.footer.explore": "Explore",
  "store.footer.info": "Information",
  "store.footer.contactUs": "Contact us",
  "store.footer.privacy": "Privacy policy",
  "store.footer.terms": "Terms and conditions",
  "store.footer.visitUs": "Visit us",
  "store.footer.address": "Riyadh, Saudi Arabia",
  "store.footer.hours": "Daily 11:00 AM – 12:00 AM",
  "store.footer.newsletterTitle": "Join us today and enjoy exclusive perks!",
  "store.footer.newsletterPlaceholder": "Enter your email",
  "store.footer.newsletterSubmit": "Send",
  "store.footer.newsletterThanks": "Thank you, your email is registered.",
  "store.footer.newsletterInvalid": "Please enter a valid email address.",
```

- [ ] **Step 5: Run the test to verify it passes**

Run from `apps/customer`: `npx vitest run`
Expected: PASS, all tests.

- [ ] **Step 6: Commit**

```bash
git add packages/i18n/src/locales apps/customer/src/shared/i18n/keys.test.ts
git commit -m "feat(i18n): add storefront keys with an ar/en parity test"
```

---

## Task 4: Storefront foundations — assets, tokens, i18n provider

**Files:**
- Create: `apps/customer/public/images/storefront/*` (8 copied files)
- Delete: `apps/customer/public/images/categories/`, `apps/customer/public/images/menu/` (23 empty 287-byte stubs)
- Modify: `apps/customer/src/app/globals.css`
- Create: `apps/customer/src/app/providers/i18n-provider.tsx`
- Create: `apps/customer/src/app/providers/index.ts`

**Interfaces:**
- Consumes: `store.*` keys from Task 3
- Produces: `<StoreI18nProvider locale={locale}>`, `useI18n(): { locale, t, dir }` where `t(key: string, vars?: Record<string, string | number>): string`

- [ ] **Step 1: Copy the real assets**

```bash
mkdir -p apps/customer/public/images/storefront
cp apps/assets/public-link/*.webp apps/customer/public/images/storefront/
```

- [ ] **Step 2: Delete the empty stubs**

Every file under these two directories is a 287-byte placeholder, and Task 1
repointed all mock image paths at `/images/storefront`. Leaving them behind
means broken images that look like real ones.

```bash
rm -rf apps/customer/public/images/categories apps/customer/public/images/menu
```

- [ ] **Step 3: Add the storefront surface tokens**

In `apps/customer/src/app/globals.css`, inside the existing `:root` block, after
the `--octo-track` line:

```css
  /* Storefront surfaces. The shared palette targets the merchant console,
     whose page background (#e9eaec) is far darker than the storefront design.
     Brand, text and semantic colours still come from the shared palette. */
  --octo-store-page: #F7F8FA;
  --octo-store-soft: #F1F3F5;
  --octo-store-footer: #E7EDF4;
  --octo-store-notice: #FFF6E8;
```

- [ ] **Step 4: Repoint the body background**

Replace the existing `body` rule:

```css
body {
  @apply bg-[var(--octo-store-page)] text-[var(--octo-text-primary)] antialiased;
}
```

- [ ] **Step 5: Create the i18n provider**

`apps/customer/src/app/providers/i18n-provider.tsx`. Unlike the merchant
provider, locale is a prop, not `localStorage`: the customer app resolves it
from a cookie on the server so the first paint is already in the right language
and direction. Reading storage on the client would flash the wrong one.

```tsx
"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ar, en, getDirection, type Locale } from "@i18n/index";

const dictionaries: Record<Locale, Record<string, string>> = { en, ar };

interface I18nContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function StoreI18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[locale];
    return {
      locale,
      dir: getDirection(locale),
      t: (key, vars) => {
        const template = dict[key] ?? key;
        if (!vars) return template;
        return Object.entries(vars).reduce(
          (out, [name, v]) => out.replaceAll(`{${name}}`, String(v)),
          template,
        );
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within StoreI18nProvider");
  return ctx;
}
```

- [ ] **Step 6: Create the slice barrel**

`apps/customer/src/app/providers/index.ts`:

```ts
export { StoreI18nProvider, useI18n } from "./i18n-provider";
```

- [ ] **Step 7: Verify the typecheck**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add apps/customer/public apps/customer/src/app
git commit -m "feat(customer): add storefront assets, surface tokens and i18n provider"
```

---

## Task 5: Shared UI primitives

**Files:**
- Create: `apps/customer/src/shared/ui/doodle-pattern.tsx`
- Create: `apps/customer/src/shared/ui/rating-stars.tsx`
- Create: `apps/customer/src/shared/ui/price-block.tsx`
- Create: `apps/customer/src/shared/ui/option-pill.tsx`
- Create: `apps/customer/src/shared/ui/accordion-row.tsx`
- Rewrite: `apps/customer/src/shared/ui/section-heading.tsx`
- Rewrite: `apps/customer/src/shared/ui/quantity-stepper.tsx`
- Rewrite: `apps/customer/src/shared/ui/product-card.tsx`
- Modify: `apps/customer/src/shared/ui/index.ts`

**Interfaces:**
- Consumes: `useI18n` (Task 4), `discountPercent` and `formatAmount` (Task 2), `MenuItem` (Task 1)
- Produces:
  - `<DoodlePattern className?: string />`
  - `<RatingStars value: number; count?: 1 | 5; size?: number />`
  - `<PriceBlock item: MenuItem; size?: "card" | "hero" />`
  - `<OptionPill label: string; selected: boolean; onSelect: () => void />`
  - `<AccordionRow label: string; children: ReactNode />`
  - `<SectionHeading title: string; id?: string />`
  - `<QuantityStepper value: number; onChange: (n: number) => void; min?: number />`
  - `<ProductCard item: MenuItem; href: string; onAdd: (item: MenuItem) => void />`

- [ ] **Step 1: `doodle-pattern.tsx` — the tile backdrop**

An inline SVG `<pattern>` of food line art, tinted with `currentColor` so it
works on any surface and in either theme. No external file, no extra request.

```tsx
export function DoodlePattern({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <defs>
        <pattern id="octo-doodle" width="88" height="88" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
            <circle cx="18" cy="18" r="8" />
            <path d="M12 18h12M18 12v12" />
            <path d="M58 10v18M62 10v18M54 10c0 8 8 8 8 0" />
            <path d="M20 58c0-7 6-12 13-12s13 5 13 12z" />
            <path d="M18 62h30" />
            <path d="M66 52a9 9 0 1 0 .01 0M70 58l6 6" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#octo-doodle)" />
    </svg>
  );
}
```

Callers place it absolutely: `<DoodlePattern className="absolute inset-0 h-full w-full text-[#dfe3e8] opacity-60" />`.

- [ ] **Step 2: `rating-stars.tsx`**

Cards show one star and the number; the product page shows five filled stars and
the number in parentheses.

```tsx
import { Star } from "lucide-react";

export interface RatingStarsProps {
  value: number;
  count?: 1 | 5;
  size?: number;
}

export function RatingStars({ value, count = 1, size = 13 }: RatingStarsProps) {
  const label = value.toFixed(1);
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${label} / 5`}>
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} size={size} className="fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />
      ))}
      <span className="text-[11.5px] font-semibold text-[var(--octo-text-secondary)]">
        {count === 5 ? `(${label})` : label}
      </span>
    </span>
  );
}
```

For the product page the number sits before the stars in reading order; pass
`count={5}` and let `flex-row-reverse` on the caller handle it if the design
demands — do not add a prop for it.

- [ ] **Step 3: `price-block.tsx`**

```tsx
"use client";

import type { MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { formatAmount } from "@/shared/lib/pricing";

export interface PriceBlockProps {
  item: MenuItem;
  size?: "card" | "hero";
}

export function PriceBlock({ item, size = "card" }: PriceBlockProps) {
  const { t } = useI18n();
  const currency = t("store.currency");
  const main = size === "hero" ? "text-[34px]" : "text-[14px]";
  const unit = size === "hero" ? "text-[15px]" : "text-[9.5px]";

  return (
    <div className="flex flex-col items-end leading-tight">
      {item.priceFrom && (
        <span className="text-[9.5px] text-[var(--octo-text-muted)]">{t("store.card.priceFrom")}</span>
      )}
      <span className={`${main} font-bold text-[#0D6EFD]`}>
        {formatAmount(item.priceSar)}
        <span className={`${unit} ms-1 font-semibold`}>{currency}</span>
      </span>
      {item.compareAtPriceSar !== undefined && item.compareAtPriceSar > item.priceSar && (
        <span className="text-[10px] text-[var(--octo-text-faint)] line-through">
          {formatAmount(item.compareAtPriceSar)}
          <span className="ms-0.5 text-[8.5px]">{currency}</span>
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `option-pill.tsx` — the radio pill**

A real `<button role="radio">`, not a div, so keyboard and screen-reader users
get the control the design draws.

```tsx
"use client";

export interface OptionPillProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
}

export function OptionPill({ label, selected, onSelect }: OptionPillProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] transition-colors ${
        selected
          ? "border-[#0D6EFD] bg-[var(--octo-selected)] font-semibold text-[var(--octo-text-primary)]"
          : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
      }`}
    >
      <span
        className={`grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full border ${
          selected ? "border-[#0D6EFD]" : "border-[var(--octo-border-input)]"
        }`}
        aria-hidden="true"
      >
        {selected && <span className="h-[7px] w-[7px] rounded-full bg-[#0D6EFD]" />}
      </span>
      {label}
    </button>
  );
}
```

- [ ] **Step 5: `accordion-row.tsx`**

```tsx
"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

export interface AccordionRowProps {
  label: string;
  children: ReactNode;
}

export function AccordionRow({ label, children }: AccordionRowProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[10px] border border-[var(--octo-border-input)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-[12.5px] text-[var(--octo-text-secondary)]"
      >
        {label}
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="border-t border-[var(--octo-divider)] px-3.5 py-3">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 6: Rewrite `section-heading.tsx`**

```tsx
export interface SectionHeadingProps {
  title: string;
  id?: string;
}

export function SectionHeading({ title, id }: SectionHeadingProps) {
  return (
    <h2 id={id} className="flex items-center gap-3 scroll-mt-20">
      <span className="h-[26px] w-[4px] rounded-full bg-[#0D6EFD]" aria-hidden="true" />
      <span className="text-[28px] font-bold text-[var(--octo-text-primary)]">{title}</span>
    </h2>
  );
}
```

- [ ] **Step 7: Rewrite `quantity-stepper.tsx`**

The plus is a filled blue circle at the start edge; the minus is a bare glyph at
the end, matching the design.

```tsx
"use client";

import { Minus, Plus } from "lucide-react";
import { useI18n } from "@/app/providers";

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
}

export function QuantityStepper({ value, onChange, min = 1 }: QuantityStepperProps) {
  const { t } = useI18n();
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1.5">
      <button
        type="button"
        aria-label={t("store.product.increase")}
        onClick={() => onChange(value + 1)}
        className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#0D6EFD] text-white transition-opacity hover:opacity-90"
      >
        <Plus size={16} />
      </button>
      <span className="min-w-[22px] text-center text-[13px] font-semibold">{value}</span>
      <button
        type="button"
        aria-label={t("store.product.decrease")}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="grid h-[30px] w-[30px] place-items-center rounded-full text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)] disabled:opacity-40"
      >
        <Minus size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 8: Rewrite `product-card.tsx`**

The whole card is a link to the product page; the bag button and the heart are
buttons inside it, so neither swallows the other's click.

```tsx
"use client";

import { Flame, Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import type { MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useFavorites } from "@/features/menu/toggle-favorite";
import { PriceBlock } from "./price-block";
import { RatingStars } from "./rating-stars";

export interface ProductCardProps {
  item: MenuItem;
  href: string;
  onAdd: (item: MenuItem) => void;
}

export function ProductCard({ item, href, onAdd }: ProductCardProps) {
  const { t } = useI18n();
  const { isFavorite, toggle } = useFavorites();
  const favorite = isFavorite(item.id);

  return (
    <article className="relative flex flex-col rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3 transition-shadow hover:shadow-[0_6px_20px_rgba(15,23,42,0.07)]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={favorite ? t("store.card.unfavorite") : t("store.card.favorite")}
          aria-pressed={favorite}
          onClick={() => toggle(item.id)}
          className="relative z-10 grid h-7 w-7 place-items-center rounded-full border border-[var(--octo-border-card)] bg-[var(--octo-card)]"
        >
          <Heart size={13} className={favorite ? "fill-[#EF4444] text-[#EF4444]" : "text-[var(--octo-text-faint)]"} />
        </button>

        {item.badges?.includes("best_seller") && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--octo-selected)] py-0.5 pe-2 ps-0.5 text-[9px] font-semibold text-[var(--octo-text-secondary)]">
            <span className="grid h-[15px] w-[15px] place-items-center rounded-full bg-[#0D6EFD]">
              <Flame size={9} className="text-white" />
            </span>
            {t("store.card.bestSeller")}
          </span>
        )}
      </div>

      <Link href={href} className="flex flex-1 flex-col">
        {/* The card is one big link; `after` covers the card so the whole
            surface is clickable without nesting interactive elements. */}
        <span className="absolute inset-0 rounded-2xl" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl} alt="" className="mx-auto mt-2 h-[110px] w-auto object-contain" loading="lazy" />

        <div className="mt-3 flex items-center justify-between gap-2">
          <h3 className="truncate text-[13px] font-bold text-[var(--octo-text-primary)]">{item.name}</h3>
          {item.rating !== undefined && <RatingStars value={item.rating} />}
        </div>

        <p className="mt-1 line-clamp-2 text-[11px] leading-[1.6] text-[var(--octo-text-muted)]">
          {item.description}
        </p>
      </Link>

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <button
          type="button"
          aria-label={t("store.card.addToCart")}
          onClick={() => onAdd(item)}
          className="relative z-10 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-[#0D6EFD] text-white transition-opacity hover:opacity-90"
        >
          <ShoppingBag size={16} />
        </button>
        <PriceBlock item={item} />
      </div>
    </article>
  );
}
```

- [ ] **Step 9: Update the barrel**

Replace `apps/customer/src/shared/ui/index.ts` so it exports every primitive
above alongside the untouched `Breadcrumb`. Keep one `export { X } from "./x"`
plus one `export type { XProps } from "./x"` per component, matching the file's
existing style.

- [ ] **Step 10: Verify**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: one error only — `@/features/menu/toggle-favorite` does not exist yet.
It is created in Task 6; leave it until then.

- [ ] **Step 11: Commit**

```bash
git add apps/customer/src/shared/ui
git commit -m "feat(customer): rebuild the storefront UI primitives"
```

---

## Task 6: Favourites feature, header and footer

**Files:**
- Create: `apps/customer/src/features/menu/toggle-favorite/use-favorites.ts`
- Create: `apps/customer/src/features/menu/toggle-favorite/index.ts`
- Rewrite: `apps/customer/src/widgets/site-header/site-header.tsx`
- Rewrite: `apps/customer/src/widgets/site-footer/site-footer.tsx`
- Create: `apps/customer/src/widgets/site-footer/newsletter-form.tsx`
- Modify: `apps/customer/src/app/layout.tsx`
- Modify: `apps/customer/src/features/session/switch-locale/switch-locale.tsx`

**Interfaces:**
- Consumes: `useI18n` (Task 4), `store.nav.*` and `store.footer.*` keys (Task 3)
- Produces: `useFavorites(): { isFavorite: (id: string) => boolean; toggle: (id: string) => void }`, `<SiteHeader locale={locale} />`, `<SiteFooter tenant={tenant} />`

- [ ] **Step 1: Implement `use-favorites.ts`**

Favourites are a client-only convenience until customer accounts exist. Reading
`localStorage` during render would break SSR hydration, so the initial state is
empty and the stored set arrives in an effect.

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "octopus_storefront_favorites";

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
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids, hydrated]);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  return { isFavorite, toggle };
}
```

`index.ts`: `export { useFavorites } from "./use-favorites";`

- [ ] **Step 2: Rewrite the header**

`site-header.tsx`. Seven links; the active one is blue with a 2px underline.
Below `md` the links move into a drawer. The language pill replaces the
`Segmented` control.

Structure, from the start edge:
- `<Link href="/">` with the 30px logo.
- `<nav>` — `hidden md:flex`, `gap-[26px]`, `text-[13.5px]`, one `<Link>` per
  entry of a module-scope `NAV` array of `{ href, key }`:
  `/` `store.nav.home` · `/menu` `store.nav.menu` · `/menu#products`
  `store.nav.products` · `/#best-sellers` `store.nav.bestSellers` ·
  `/#offers` `store.nav.offers` · `/booking` `store.nav.booking` ·
  `/orders` `store.nav.trackOrder`. Active when `usePathname()` equals `href`,
  styled `text-[#0D6EFD]` with `after:absolute after:inset-x-0 after:-bottom-[17px] after:h-[2px] after:bg-[#0D6EFD]`.
- End cluster: `<SwitchLocale locale={locale} />` then the cart link — a 38px
  `rounded-[11px] bg-[#0D6EFD]` grid with a white `ShoppingBag` size 17 and the
  existing count badge.
- A `md:hidden` hamburger button (`Menu` icon, `aria-label={t("store.nav.openMenu")}`)
  toggling a `useState` drawer that renders the same `NAV` array as a column.

Wrapper: `sticky top-0 z-30 border-b border-[var(--octo-border-card)] bg-[var(--octo-card)]`,
inner `mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6`.

- [ ] **Step 3: Restyle the locale switch as a pill**

Rewrite `switch-locale.tsx` to render one button, not a `Segmented`: a
`rounded-full border border-[var(--octo-border-input)] px-3 py-1.5 text-[12px]`
button holding a `Languages` icon (size 14) and `t("store.nav.language")`.
Clicking it writes the *other* locale to the cookie and calls `router.refresh()`,
keeping the existing cookie name and transition. It must stay a client
component and keep exporting `SwitchLocale` with the same props.

- [ ] **Step 4: Create the newsletter form**

`newsletter-form.tsx` — client component. Controlled `<input type="email">` with
`t("store.footer.newsletterPlaceholder")` and a fused blue submit reading
`t("store.footer.newsletterSubmit")`. On submit: `preventDefault`, validate with
`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, then set a status message to
`store.footer.newsletterThanks` or `store.footer.newsletterInvalid` rendered in
an `aria-live="polite"` paragraph. There is no endpoint and it must not pretend
to reach one.

- [ ] **Step 5: Rewrite the footer**

`site-footer.tsx`. Wrapper `mt-16 bg-[var(--octo-store-footer)]`, inner
`mx-auto grid max-w-[1200px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,0.8fr)_1.6fr]`.
Five columns in the order the spec §6.2 lists: brand (logo, `store.footer.tagline`,
`store.footer.followUs`, three `rounded-full border` social circles with
`Instagram`, `Facebook`, `Linkedin` icons), استكشف, معلومات, زورونا (a `MapPin`
row and a `Clock` row), and the newsletter column ending with `<NewsletterForm />`.
Column headings: `text-[13px] font-bold`. Links: `text-[12px]
text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]`.
Keep the existing `tenant` prop even though the copy is currently static — the
signature already exists and the layout passes it.

- [ ] **Step 6: Wire the provider into the layout**

In `apps/customer/src/app/layout.tsx`, wrap the existing tree — the
`OrderingSessionProvider` and everything inside it — in
`<StoreI18nProvider locale={locale}>`, imported from `@/app/providers`. Change
nothing else: `locale`, `slug`, `tenant`, `dir` and the font variables all stay
as they are.

- [ ] **Step 7: Verify**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: no output. Task 5's dangling import now resolves.

- [ ] **Step 8: Commit**

```bash
git add apps/customer/src
git commit -m "feat(customer): rebuild the storefront header, footer and favourites"
```

---

## Task 7: Home page

**Files:**
- Create: `apps/customer/src/widgets/store-hero/{store-hero.tsx,index.ts}`
- Create: `apps/customer/src/widgets/category-mosaic/{category-mosaic.tsx,index.ts}`
- Create: `apps/customer/src/widgets/product-row/{product-row.tsx,index.ts}`
- Rewrite: `apps/customer/src/views/landing/landing-view.tsx`
- Modify: `apps/customer/src/app/page.tsx`
- Delete: `apps/customer/src/widgets/menu-list/`

**Interfaces:**
- Consumes: `SectionHeading`, `ProductCard`, `DoodlePattern` (Task 5); `bestSellers`, `offers` (Task 2); `getMenuForTenant` (Task 1)
- Produces: `<StoreHero />`, `<CategoryMosaic categories={MenuCategory[]} />`, `<ProductRow id: string; title: string; items: MenuItem[]; onAdd: (item: MenuItem) => void />`

- [ ] **Step 1: `store-hero.tsx`**

Full-bleed `hero.webp` at `h-[600px]` with `object-cover`, under
`bg-gradient-to-t from-black/75 via-black/45 to-black/30`. Centred content:
`h1` at `text-[32px] sm:text-[44px] font-bold text-white`, a
`max-w-[720px] text-[15px] text-white/85` paragraph, and two links —
`/menu` and `/booking` — each
`inline-flex items-center gap-2 rounded-full border border-white/70 px-6 py-3 text-[13.5px] text-white transition-colors hover:bg-white/10`
with a `ClipboardList` icon size 16. Copy from `store.hero.*`.

- [ ] **Step 2: `category-mosaic.tsx`**

`grid gap-4 sm:grid-cols-2 lg:grid-cols-3`, `lg:grid-rows-2`. Order and spans,
matching the design's magazine layout: desserts (row 1 col 1), **mains
(`lg:row-span-2`)**, breakfast (row 1 col 3), drinks (row 2 col 1), lunch
(row 2 col 3). Look up each by `slug` from the `categories` prop; skip any that
is missing rather than throwing.

Each tile is a `<Link href={/menu/${c.slug}}>` with
`relative flex overflow-hidden rounded-[20px] bg-[var(--octo-store-soft)] p-5`,
holding `<DoodlePattern className="absolute inset-0 h-full w-full text-[#dfe3e8] opacity-50" />`,
the label at `relative text-[20px] font-bold` and the photo at
`relative h-full w-1/2 object-contain`. Alternate which half each occupies with
`flex-row` / `flex-row-reverse` by index, as the design does.

- [ ] **Step 3: `product-row.tsx`**

```tsx
"use client";

import type { MenuItem } from "@octopus/api-client";
import { ProductCard, SectionHeading } from "@/shared/ui";

export interface ProductRowProps {
  id: string;
  title: string;
  items: MenuItem[];
  hrefFor: (item: MenuItem) => string;
  onAdd: (item: MenuItem) => void;
}

export function ProductRow({ id, title, items, hrefFor, onAdd }: ProductRowProps) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-5">
      <SectionHeading id={id} title={title} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <ProductCard key={item.id} item={item} href={hrefFor(item)} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Rewrite `landing-view.tsx`**

A client component holding the `AddToCartModal` selection state. It receives
`tenant`, `categories` and `items`, and renders: `<StoreHero />`, then a
`mx-auto flex max-w-[1200px] flex-col gap-14 px-4 py-14 sm:px-6` column
containing a `SectionHeading` + `<CategoryMosaic />` section keyed
`store.section.menu`, `<ProductRow id="best-sellers" …items={bestSellers(items)} />`,
and `<ProductRow id="offers" …items={offers(items)} />`, plus the existing
`<AddToCartModal item={selected} onClose={…} />`.

`hrefFor` builds `/menu/${categorySlug}/${item.id}` by looking the item's
`categoryId` up in `categories`.

- [ ] **Step 5: Update `page.tsx`**

Read `tenant` from the slug header exactly as the current file does, call
`getMenuForTenant(tenant.id)`, and pass `tenant`, `categories` and `items` into
`<LandingView />`. Remove the fulfillment gate entirely — browsing is open.

- [ ] **Step 6: Delete the obsolete widget**

`menu-list` is replaced by `CategoryMosaic` and `ProductRow`:
`rm -rf apps/customer/src/widgets/menu-list`

- [ ] **Step 7: Verify**

Run from `apps/customer`: `npx tsc --noEmit` — expected: an error only from
`views/menu/menu-view.tsx`, which still imports the deleted widget. It is
rewritten in Task 8.

- [ ] **Step 8: Commit**

```bash
git add apps/customer/src
git commit -m "feat(customer): build the storefront home page"
```

---

## Task 8: Menu index page

**Files:**
- Rewrite: `apps/customer/src/views/menu/menu-view.tsx`
- Modify: `apps/customer/src/app/menu/page.tsx`

**Interfaces:**
- Consumes: `CategoryMosaic`, `SectionHeading`, `Breadcrumb`
- Produces: `<MenuView tenant categories />`

- [ ] **Step 1: Rewrite `menu-view.tsx`**

No design exists for this screen, so it reuses pieces rather than inventing a
layout. A server component — nothing here needs state:

```tsx
import type { MenuCategory } from "@octopus/api-client";
import { Breadcrumb, SectionHeading } from "@/shared/ui";
import { CategoryMosaic } from "@/widgets/category-mosaic";

export interface MenuViewProps {
  categories: MenuCategory[];
  homeLabel: string;
  menuLabel: string;
}

export function MenuView({ categories, homeLabel, menuLabel }: MenuViewProps) {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-6">
      <Breadcrumb items={[{ label: homeLabel, href: "/" }, { label: menuLabel }]} />
      <SectionHeading id="products" title={menuLabel} />
      <CategoryMosaic categories={categories} />
    </div>
  );
}
```

Labels arrive as props because this is a server component and `useI18n` is a
client hook. The page resolves them.

- [ ] **Step 2: Update `page.tsx`**

Read the locale cookie, pick the dictionary directly (`locale === "ar" ? ar : en`),
and pass `ar["store.nav.home"]` and `ar["store.nav.menu"]` as `homeLabel` and
`menuLabel`. Drop the fulfillment gate.

- [ ] **Step 3: Verify**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/customer/src
git commit -m "feat(customer): build the menu index page"
```

---

## Task 9: Category listing with filters

**Files:**
- Create: `apps/customer/src/widgets/category-chip-rail/{category-chip-rail.tsx,index.ts}`
- Create: `apps/customer/src/widgets/menu-filter-bar/{menu-filter-bar.tsx,index.ts}`
- Create: `apps/customer/src/features/menu/filter-items/{use-menu-filters.ts,index.ts}`
- Create: `apps/customer/src/views/category/{category-view.tsx,index.ts}`
- Create: `apps/customer/src/app/menu/[category]/page.tsx`

**Interfaces:**
- Consumes: `parseFilters`, `filterItems` (Task 2); `getMenuGroups` (Task 1); `ProductCard`, `SectionHeading`, `Breadcrumb` (Task 5)
- Produces:
  - `useMenuFilters(): { filters: MenuFilters; setParam: (key: string, value: string | null) => void; clear: () => void }`
  - `<CategoryChipRail groups activeGroup onSelect />`
  - `<MenuFilterBar filters onChange />`
  - `<CategoryView tenant category categories items />`

- [ ] **Step 1: Implement `use-menu-filters.ts`**

State lives in the URL so the listing stays shareable and the back button works.

```ts
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { parseFilters, type MenuFilters } from "@/shared/lib/storefront";

export function useMenuFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: MenuFilters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clear = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  return { filters, setParam, clear };
}
```

- [ ] **Step 2: Build `category-chip-rail.tsx`**

Client component. Outer card:
`rounded-[20px] bg-[var(--octo-store-soft)] p-5`. Inner:
`flex items-start gap-6 overflow-x-auto` (so it scrolls on narrow screens).
Each chip is a button holding a `grid h-[74px] w-[74px] place-items-center
overflow-hidden rounded-full bg-[var(--octo-card)]` circle with the group photo
at `h-[52px] w-[52px] object-contain`, and a `mt-2 text-[12px] font-bold` label
from `t(\`store.group.${g.id}\`)`. The active chip adds
`ring-2 ring-[#0D6EFD]` to the circle and `text-[#0D6EFD]` to the label.
`aria-pressed` reflects the active state. Selecting a chip calls
`setParam("group", id === "all" ? null : id)`.

- [ ] **Step 3: Build `menu-filter-bar.tsx`**

Client component. Wrapper:
`flex flex-wrap items-stretch divide-x-0 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]`.
Six cells in the spec's order, each `flex flex-1 items-center gap-2 px-4 py-3
text-[12.5px]` with `border-e border-[var(--octo-divider)]` on all but the last
(logical, so it mirrors).

- Cell 1 «الاكثر مبيعا»: a checkbox bound to `filters.bestSellersOnly`, toggling
  `setParam("best", checked ? "1" : null)`. When on, the cell gets
  `bg-[var(--octo-selected)] ring-1 ring-inset ring-[#0D6EFD]`.
- Cells 2–5 «السعر» / «مسببات للحساسية» / «التفضيلات الغذائية» / «نوع الوجبة»:
  a `<details>` element whose `<summary>` shows the label plus a `ChevronDown`,
  and whose panel is an absolutely-positioned `rounded-xl border bg-white p-3
  shadow` list of checkboxes. Price offers four fixed ranges — `0-50`, `50-100`,
  `100-200`, `200-` — as radios writing `setParam("price", …)`. Allergens list
  the six `AllergenId`s writing a comma-joined `allergen` parameter; dietary the
  five `DietaryId`s writing `diet`; meal type the eight groups writing `group`.
- Cell 6 «متوفر»: a checkbox bound to `filters.availableOnly`, toggling
  `setParam("available", checked ? "1" : null)`.

Use native `<input type="checkbox">` and `<input type="radio">` with
`accent-[#0D6EFD]`, each wrapped in a `<label>`. The design's control is a
checkbox and so is the markup.

- [ ] **Step 4: Build `category-view.tsx`**

Client component. Holds `const [filtersOpen, setFiltersOpen] = useState(false)`
and the `AddToCartModal` selection.

```
Breadcrumb: home / menu / category.name
Title row:  SectionHeading(store.section.availableMeals)
            + "(" + visible.length + ")" in text-[15px] text-[var(--octo-text-muted)]
            + filter toggle button at the end
Filter bar: rendered only when filtersOpen
Chip rail
Grid:       grid-cols-1 sm:grid-cols-2 lg:grid-cols-4, gap-4
Empty:      when visible.length === 0, a centred t("store.filter.empty")
            with a t("store.filter.clear") button calling clear()
```

The count is `visible.length`, computed as
`filterItems(items.filter((i) => i.categoryId === category.id), filters)` — the
live number of matches, not the design's frozen 500.

The toggle button: `inline-flex items-center gap-2 rounded-[10px] px-4 py-2
text-[12.5px]` with a `SlidersHorizontal` size 15. Closed:
`border border-[var(--octo-border-input)] text-[var(--octo-text-secondary)]`.
Open: `bg-[#0D6EFD] text-white`. `aria-expanded={filtersOpen}`.

- [ ] **Step 5: Create the route**

`apps/customer/src/app/menu/[category]/page.tsx` — a server component that
resolves `tenant`, calls `getMenuForTenant`, finds the category by
`params.category` against `MenuCategory.slug`, calls `notFound()` from
`next/navigation` when there is no match, and renders `<CategoryView />`.

- [ ] **Step 6: Verify**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: no output.

Then run `npm run dev` and check `http://localhost:3000/menu/lunch`: chips
filter the grid, the count tracks the grid, the URL updates, and the browser
back button restores the previous filter state.

- [ ] **Step 7: Commit**

```bash
git add apps/customer/src
git commit -m "feat(customer): build the category listing with filters"
```

---

## Task 10: Product details page

**Files:**
- Create: `apps/customer/src/widgets/product-gallery/{product-gallery.tsx,index.ts}`
- Create: `apps/customer/src/widgets/allergen-panel/{allergen-panel.tsx,index.ts}`
- Create: `apps/customer/src/widgets/product-customizer/{product-customizer.tsx,index.ts}`
- Create: `apps/customer/src/views/product/{product-view.tsx,index.ts}`
- Create: `apps/customer/src/app/menu/[category]/[item]/page.tsx`

**Interfaces:**
- Consumes: `OptionPill`, `AccordionRow`, `QuantityStepper`, `RatingStars`, `PriceBlock`, `SectionHeading`, `Breadcrumb` (Task 5); `discountPercent`, `relatedItems` (Task 2); `useOrderingSession` (existing)
- Produces: `<ProductGallery images alt />`, `<AllergenPanel allergens />`, `<ProductCustomizer groups selections onChange />`, `<ProductView … />`

- [ ] **Step 1: Build `product-gallery.tsx`**

Client component with `const [active, setActive] = useState(0)`.
`flex flex-row-reverse gap-4` so the thumbnail strip sits at the start edge in
RTL and mirrors in LTR. Main image: `flex-1 rounded-[20px] bg-[var(--octo-card)]
p-6` with the photo at `h-[420px] w-full object-contain`. Thumbnails: a
`flex flex-col gap-3` of buttons, each `h-[140px] w-[140px] rounded-[20px]
bg-[var(--octo-store-soft)] p-3`, the active one with `ring-2 ring-[#0D6EFD]`,
`aria-pressed` set. When `images.length <= 1`, render the main image alone.

- [ ] **Step 2: Build `allergen-panel.tsx`**

```tsx
"use client";

import { Info, Wheat } from "lucide-react";
import type { AllergenId } from "@octopus/api-client";
import { useI18n } from "@/app/providers";

export function AllergenPanel({ allergens }: { allergens: AllergenId[] }) {
  const { t } = useI18n();
  if (allergens.length === 0) return null;

  return (
    <section className="rounded-[20px] bg-[var(--octo-store-notice)] p-6">
      <h3 className="flex items-center gap-2 text-[17px] font-bold text-[#B45309]">
        <Info size={18} className="text-[#F59E0B]" aria-hidden="true" />
        {t("store.allergy.title")}
      </h3>
      <p className="mt-3 text-[12.5px] leading-[1.9] text-[var(--octo-text-secondary)]">
        {t("store.allergy.body")}
      </p>
      <p className="mt-4 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
        {t("store.allergy.contains")}
      </p>
      <ul className="mt-3 flex flex-wrap gap-5">
        {allergens.map((id) => (
          <li key={id} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#B45309]">
            <Wheat size={15} aria-hidden="true" />
            {t(`store.allergen.${id}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Build `product-customizer.tsx`**

Client component, fully controlled — it owns no state, so the view can price the
selection. Props:

```ts
export interface ProductCustomizerProps {
  groups: MenuItemModifierGroup[];
  selections: Record<string, string[]>;
  onChange: (groupId: string, optionIds: string[]) => void;
}
```

Card: `rounded-[20px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]
p-6 shadow-[0_4px_18px_rgba(15,23,42,0.05)]`. Title
`text-[19px] font-bold` from `store.product.customize`.

For each group: a `text-[12.5px] font-semibold` label, then —
- `display !== "accordion"`: a `flex flex-wrap gap-2.5` with `role="radiogroup"`
  (or `role="group"` when `multiple`) of `<OptionPill>`s. Selecting in a
  single-choice group replaces the array; in a multiple group it toggles.
- `display === "accordion"`: an `<AccordionRow label={group.label}>` wrapping the
  same pill list.

- [ ] **Step 4: Build `product-view.tsx`**

Client component. State: `selections` (seeded so every `required` single-choice
group starts on its first option, matching the design's pre-selected pills) and
`quantity`.

Layout: `mx-auto grid max-w-[1200px] gap-10 px-4 py-8 sm:px-6 lg:grid-cols-2`.

Start column: `<ProductGallery />` then `<AllergenPanel />`.

End column, in order:
1. `<RatingStars value={item.rating} count={5} size={17} />` aligned to the end.
2. `h1` at `text-[30px] font-bold`.
3. Description at `text-[13px] leading-[1.9] text-[var(--octo-text-secondary)]`.
4. Calorie pill, when `item.calories` is set: `inline-flex items-center gap-1.5
   rounded-full bg-[var(--octo-selected)] px-3.5 py-1.5 text-[12px]
   font-semibold` with a `Flame` size 14 in `#F59E0B`, text
   `t("store.product.calories", { n: item.calories })`.
5. Price row: `<PriceBlock item={item} size="hero" />` and, when
   `discountPercent(item)` is not null, a pill at the end —
   `rounded-full bg-[#E8F8EF] px-3 py-1 text-[12px] font-semibold text-[#16a34a]`
   reading `t("store.product.discount", { n: percent })`.
6. `<ProductCustomizer />`.
7. Final row: a `text-[12.5px] font-semibold` `store.product.quantity` label,
   then a `flex items-center justify-between gap-4` holding `<QuantityStepper />`
   at the start and the add button at the end — `flex-1 rounded-[10px]
   bg-[#0D6EFD] px-6 py-3 text-[13.5px] font-semibold text-white`, reading
   `store.product.addToCart`, disabled with `store.product.outOfStock` when
   `item.inStock === false`.

The add button calls `addLine(item.id, item.name, item.priceSar, quantity,
modifiers, "")` from `useOrderingSession()`, where `modifiers` maps each
selected option to `{ groupId, optionId, label, priceDeltaSar }` — the existing
`OrderLineModifier` shape. It then routes to `/cart`.

Below the grid: `<ProductRow id="related" title={t("store.section.related")}
items={relatedItems(items, item)} … />`.

- [ ] **Step 5: Create the route**

`apps/customer/src/app/menu/[category]/[item]/page.tsx` — server component
resolving tenant and menu, finding the category by `slug` and the item by `id`,
calling `notFound()` when either is missing, and rendering `<ProductView />`.
The breadcrumb reads home / menu / `category.name` / `t(store.group.<item.group>)`,
matching the design's fourth crumb.

- [ ] **Step 6: Verify**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: no output.

Then in the browser at
`/menu/main/item-classic-chicken-burger`: thumbnails switch the main image, the
size pills change the price shown in the cart after adding, and «إضافة إلي السلة»
lands a correctly-priced line in `/cart`.

- [ ] **Step 7: Commit**

```bash
git add apps/customer/src
git commit -m "feat(customer): build the product details page"
```

---

## Task 11: Fulfillment relocation and final verification

**Files:**
- Modify: `apps/customer/src/views/checkout/checkout-view.tsx`
- Modify: `apps/customer/src/views/cart/cart-view.tsx` (only if it gates on `state.channel`)

**Interfaces:**
- Consumes: `SelectFulfillment` (existing, unchanged)
- Produces: nothing new

- [ ] **Step 1: Move the fulfillment picker to checkout**

Home no longer gates on `state.channel`, so a customer can now reach the cart
without one. Render `<SelectFulfillment tenant={tenant} />` at the top of
`checkout-view.tsx`, above the existing fields, and block the place-order button
until `state.channel` is set. Read both views first; if `cart-view.tsx` also
early-returns on a missing `channel`, remove that gate too — the cart must be
reachable.

- [ ] **Step 2: Verify no physical direction classes leaked in**

```bash
grep -rnE "\b(ml|mr|pl|pr)-[0-9]|text-(left|right)|border-(l|r)-" apps/customer/src
```

Expected: no output. Any hit is a bug — replace with the logical equivalent.

- [ ] **Step 3: Run the full test suite**

Run from `apps/customer`: `npx vitest run`
Expected: PASS, all tests.

- [ ] **Step 4: Run the typecheck**

Run from `apps/customer`: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Run the production build**

Run from `apps/customer`: `npm run build`
Expected: build succeeds with no type or lint errors.

- [ ] **Step 6: Check every screen in both languages**

With `npm run dev`, visit `/`, `/menu`, `/menu/lunch`, and
`/menu/main/item-classic-chicken-burger` at viewport widths 1440, 768 and 390,
first in Arabic and then with the language pill switched to English.

Confirm on each: no horizontal page scroll, no console errors or warnings, no
broken images, the header and footer mirror correctly, and all chrome text is
translated (dish names stay Arabic by design — they are merchant data).

- [ ] **Step 7: Commit**

```bash
git add apps/customer/src
git commit -m "feat(customer): move fulfillment selection to checkout"
```

---

## Self-Review

**Spec coverage.** §3.1 two-level grouping → Task 1 Steps 1, 5, 6. §3.2 item
fields → Task 1 Step 3. §3.3 `display` → Task 1 Step 2. §3.4 mock data and
assets → Task 1 Step 7 and Task 4 Steps 1–2. §4 architecture → the File
Structure table. §4.1 URL state → Task 9 Step 1. §4.2 currency → Task 2 Step 8.
§5 tokens → Task 4 Steps 3–4. §6.1 header → Task 6 Step 2. §6.2 footer →
Task 6 Steps 4–5. §6.3 product card → Task 5 Step 8. §6.4 home → Task 7.
§6.5 menu index → Task 8. §6.6 listing → Task 9. §6.7 product details →
Task 10. §7 behaviour → Tasks 6 (favourites, newsletter, language), 9 (filter
toggle, chips), 10 (add to cart). §8 verification → Task 11. §2's fulfillment
relocation → Task 11 Step 1.

**Naming consistency.** `MenuFilters`, `parseFilters`, `filterItems`,
`discountPercent`, `bestSellers`, `offers`, `relatedItems`, `formatAmount`,
`useFavorites`, `useMenuFilters`, `useI18n`, `StoreI18nProvider` are each
defined once and referenced with the same name everywhere after. `MenuCategory`
gains a required `slug` used consistently by every route and by
`CategoryMosaic`.

**Known ordering constraint.** Task 5 leaves one deliberate dangling import
(`@/features/menu/toggle-favorite`) that Task 6 Step 1 resolves, and Task 7
leaves one (`widgets/menu-list`) that Task 8 Step 1 resolves. Both are called
out in their verification steps so an executor does not mistake them for
failures. Tasks 5→6 and 7→8 must therefore run in order.
