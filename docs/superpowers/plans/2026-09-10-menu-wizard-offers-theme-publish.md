# Menu Build Wizard — Offers, Theme, Review & Publish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the wizard — the offer editor's five tabs, the Theme step, Review & Publish — and retire the six pages the menu module replaced.

**Architecture:** Two new pure modules in `entities/menu` carry the arithmetic and the checks: `pricing.ts` (offer totals, savings, discount percentage) and `validation.ts` (the Review step's three severity buckets). The Theme step's brand fields are shared with the Public Link Builder rather than duplicated, which needs `site-draft` lifted out of `pages/public-link/_shared/` into `entities/`. Everything else follows the shapes plan 1 established.

**Tech Stack:** React 18, react-router-dom 6, TypeScript 5.5, Vitest 2, Tailwind 3, `@octopus/ui` primitives (imported as `@ui/primitives`), `@i18n` flat dictionaries.

**Spec:** `docs/superpowers/specs/2026-09-09-merchant-menu-design.md`

**Precedes:** `docs/superpowers/plans/2026-09-10-menu-wizard-foundation.md` (plan 1 of 2, complete)

## Global Constraints

Identical to plan 1, and they matter here for the same reasons:

- **Tests:** `cd apps/merchant && npx vitest run <path>`; whole suite `npm test -w @octopus/merchant`.
- **i18n:** every string a key in **both** dictionaries. Namespaces: `menuOffer.*`, `menuTheme.*`, `menuReview.*`.
- **FSD:** `entities/` may not import from `pages/` or `widgets/`.
- **Direction:** logical properties only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`).
- **Colour:** `--octo-*` tokens only, never a hex literal. A token you need that does not exist gets added to **both** the light and dark blocks.
- **Money:** never hardcode a derived number.
- **Never `git add -A` or `git add <dir>`.** This branch carries unrelated uncommitted work; stage the exact files each task names.
- **Verification:** screenshot each screen and compare against its frame in `apps/assets/Menu/Menu Design/`. Drive dialogs with `SHOT_SCRIPT`, scoping every dialog interaction to `[role=dialog]` — a `.pop()` over the whole document picks up controls from the cards behind the modal, which cost two wasted runs in plan 1.

## Open question this plan must settle

The spec's open question 6. The frame shows both `Customer Saves SAR 49.5` and `Off 23%`, and they are computed on different bases: 23% is `(149.5 − 115) / 149.5`, both totals including VAT; SAR 49.5 is `149.5 − 100`, an inclusive total against an exclusive price. On the percentage's basis the money figure is `SAR 34.5`.

**This plan implements one number, on the VAT-inclusive basis** — `149.5 − 115 = SAR 34.5`, `Off 23%` — because that is the pair that agrees, and it keeps the percentage the frame shows. Task 1's test asserts it. Raise it with the designer; changing it later is one constant in `pricing.ts`.

---

### Task 1: Offer pricing

**Files:**
- Create: `apps/merchant/src/entities/menu/pricing.ts`
- Test: `apps/merchant/src/entities/menu/pricing.test.ts`
- Modify: `apps/merchant/src/entities/menu/index.ts`

**Interfaces:**
- Consumes: `Item`, `Offer`, `Menu` from `./menu`
- Produces:
  - `offerLines(menu: Menu, offer: Offer): { name: string; price: number; qty: number }[]`
  - `individualTotals(menu, offer): { subTotal: number; vat: number; total: number }`
  - `offerTotals(offer): { price: number; vat: number; total: number }`
  - `offerSavings(menu, offer): { amount: number; percent: number }`

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/entities/menu/pricing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  addItem,
  addSection,
  blankItem,
  blankMenu,
  blankSection,
  updateItem,
} from "./draft";
import { individualTotals, offerLines, offerSavings, offerTotals } from "./pricing";
import type { Offer } from "./menu";

const NOW = "2026-09-10T08:00:00.000Z";

// The frame's combo: burger 90, fries 20, drink 20, sold together for 100.
function menuWithParts() {
  let menu = blankMenu("m1", "b1", NOW);
  menu = addSection(menu, blankSection("s1", "items", "Burgers", null));
  for (const [id, name, price] of [
    ["i1", "Classic Burger", 90],
    ["i2", "French Fries", 20],
    ["i3", "Soft Drink", 20],
  ] as const) {
    menu = addItem(menu, "s1", blankItem(id, name));
    menu = updateItem(menu, "s1", id, { pricing: { price, vatRate: 0.15 } });
  }
  return menu;
}

const OFFER: Offer = {
  id: "of1",
  name: "Classic Burger Combo",
  slug: "Classic_Burger_Combo",
  image: null,
  status: "active",
  badge: "Best Value",
  showSavingBadge: true,
  entries: [
    { itemId: "i1", qty: 1, price: 90 },
    { itemId: "i2", qty: 1, price: 20 },
    { itemId: "i3", qty: 1, price: 20 },
  ],
  customerCanChange: false,
  pricing: { role: "fixed", offerPrice: 100, vatRate: 0.15, excludeFromPromotions: false },
  availability: { from: null, to: null, window: null },
  channels: {
    dineIn: true, takeaway: true, delivery: true,
    kiosk: true, onlineOrdering: false, mobileApp: false,
  },
};

describe("offerLines", () => {
  it("resolves each entry to the item it points at", () => {
    expect(offerLines(menuWithParts(), OFFER)).toEqual([
      { name: "Classic Burger", price: 90, qty: 1 },
      { name: "French Fries", price: 20, qty: 1 },
      { name: "Soft Drink", price: 20, qty: 1 },
    ]);
  });

  it("drops an entry whose item has been deleted", () => {
    const offer = { ...OFFER, entries: [...OFFER.entries, { itemId: "gone", qty: 1, price: 5 }] };
    expect(offerLines(menuWithParts(), offer)).toHaveLength(3);
  });
});

describe("individualTotals", () => {
  it("computes the frame's 130 / 19.5 / 149.5", () => {
    expect(individualTotals(menuWithParts(), OFFER)).toEqual({
      subTotal: 130,
      vat: 19.5,
      total: 149.5,
    });
  });

  it("multiplies by quantity", () => {
    const offer = { ...OFFER, entries: [{ itemId: "i2", qty: 3, price: 20 }] };
    expect(individualTotals(menuWithParts(), offer).subTotal).toBe(60);
  });
});

describe("offerTotals", () => {
  it("computes the frame's 100 / 15 / 115", () => {
    expect(offerTotals(OFFER)).toEqual({ price: 100, vat: 15, total: 115 });
  });
});

describe("offerSavings", () => {
  // Open question 6: the frame's two figures disagree. Both totals including
  // VAT is the pair that is consistent, and it keeps the frame's percentage.
  it("compares both totals including VAT", () => {
    expect(offerSavings(menuWithParts(), OFFER)).toEqual({ amount: 34.5, percent: 23 });
  });

  it("reports no saving when the offer costs more than its parts", () => {
    const offer = { ...OFFER, pricing: { ...OFFER.pricing, offerPrice: 200 } };
    expect(offerSavings(menuWithParts(), offer)).toEqual({ amount: 0, percent: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/merchant && npx vitest run src/entities/menu/pricing.test.ts`
Expected: FAIL — "Failed to load url ./pricing".

- [ ] **Step 3: Write the implementation**

Create `apps/merchant/src/entities/menu/pricing.ts`:

- `offerLines` maps `offer.entries` to `{ name, price, qty }` by finding each `itemId` across every section's entries, skipping entries whose item no longer exists.
- `individualTotals` sums `price * qty` for the subtotal, applies `offer.pricing.vatRate`, and returns all three rounded to two places with `Number(x.toFixed(2))` so 19.5 does not arrive as 19.500000000000004.
- `offerTotals` does the same for `offer.pricing.offerPrice`.
- `offerSavings` returns `{ amount, percent }` from the two VAT-inclusive totals, clamped at 0 when the offer is not cheaper; `percent` is rounded to a whole number.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/merchant && npx vitest run src/entities/menu/pricing.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Export and commit**

Add `export * from "./pricing";` to `entities/menu/index.ts`.

```bash
cd apps/merchant && npx vitest run src/entities/menu && npx tsc -b --noEmit
git add apps/merchant/src/entities/menu/pricing.ts apps/merchant/src/entities/menu/pricing.test.ts apps/merchant/src/entities/menu/index.ts
git commit -m "Compute what a combo costs and what it saves"
```

---

### Task 2: The offer editor

**Files:**
- Create: `apps/merchant/src/pages/menu/build/offers/index.tsx`
- Create: `apps/merchant/src/pages/menu/build/offers/offer-tabs.tsx`
- Create: `apps/merchant/src/pages/menu/build/offers/tab-info.tsx`
- Create: `apps/merchant/src/pages/menu/build/offers/tab-items.tsx`
- Create: `apps/merchant/src/pages/menu/build/offers/tab-pricing.tsx`
- Create: `apps/merchant/src/pages/menu/build/offers/tab-availability.tsx`
- Create: `apps/merchant/src/pages/menu/build/offers/tab-channels.tsx`
- Modify: `apps/merchant/src/pages/menu/build/items/index.tsx` (render the offer editor for the offers section instead of the empty state)
- Modify: `apps/merchant/src/entities/menu/draft.ts` + `draft.test.ts` (offer CRUD)
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `offerLines`, `individualTotals`, `offerTotals`, `offerSavings` from `@/entities/menu`
- Produces: `OffersEditor`, and in `draft.ts`: `blankOffer(id, name): Offer`, `addOffer(menu, offer)`, `updateOffer(menu, offerId, patch)`, `removeOffer(menu, offerId)`, `setOfferEntry(menu, offerId, itemId, qty)`, `removeOfferEntry(menu, offerId, itemId)`

Frames: `Add items-offers-info.png`, `-items on offer.png`, `-pricing.png`,
`-avaliability.png`, `-channcels.png`, `-actions.png`.

Selecting the built-in offers section in step 2 swaps the middle column from
`Item Information` to `Offer Info` — five different tabs, a different footer
validation, and `Add New Item` becomes `Add New Offer`. That swap is already
keyed on `section.kind`; this task fills the branch plan 1 left as an empty
state.

- [ ] **Step 1: Extend draft.ts with offer CRUD**

Add to `draft.test.ts`, in a new `describe("offers")` block: adding an offer to
the offers section, patching it, removing it, setting an entry's quantity, and
removing an entry. Mirror the item tests' shape exactly.

Then implement the six functions in `draft.ts` using the existing `mapSection`
helper, addressing the offers section by `OFFERS_SECTION_ID`.

Run: `cd apps/merchant && npx vitest run src/entities/menu/draft.test.ts`
Expected: PASS, 23 tests.

- [ ] **Step 2: Add the i18n keys**

Add to both dictionaries, same keys in the same order. English:

```ts
  "menuOffer.addNew": "Add New Offer",
  "menuOffer.infoTitle": "Offer Info",
  "menuOffer.tab.info": "Offer Info",
  "menuOffer.tab.items": "Items on Offer",
  "menuOffer.tab.pricing": "Pricing& Saving",
  "menuOffer.tab.availability": "Availability",
  "menuOffer.tab.channels": "Offer Channels",
  "menuOffer.name": "Offer Name",
  "menuOffer.slug": "Offer Slug",
  "menuOffer.image": "Item Image",
  "menuOffer.imageHint": "Recommended Size: 600*400px",
  "menuOffer.status": "Offer Status",
  "menuOffer.active": "Active",
  "menuOffer.badge": "Offer Badge",
  "menuOffer.badgeOptional": "Optional",
  "menuOffer.badge.bestValue": "Best Value",
  "menuOffer.badge.limited": "Limited Time",
  "menuOffer.badge.popular": "Popular",
  "menuOffer.showSaving": "Show saving badge",
  "menuOffer.cantChange": "Customers can't change item on combo.",
  "menuOffer.change": "Change",
  "menuOffer.individualTotal": "Individual Item Total",
  "menuOffer.subTotal": "Sub Total:",
  "menuOffer.vatLine": "VAT({p}%):",
  "menuOffer.total": "Total:",
  "menuOffer.offerPrice": "Offer Price",
  "menuOffer.customerSaves": "Customer Saves",
  "menuOffer.totalInclVat": "Total(incl VAT):",
  "menuOffer.off": "Off {p}%",
  "menuOffer.pricingRoles": "Pricing Roles",
  "menuOffer.role.fixed": "Fixed offer price",
  "menuOffer.role.fixedHint": "You set the final price customer pay.",
  "menuOffer.role.discount": "Set a Discount",
  "menuOffer.role.discountHint": "Apply percentage or amount off the individual total",
  "menuOffer.role.dynamic": "Dynamic Price",
  "menuOffer.role.dynamicHint": "Price adjusts based on selected options",
  "menuOffer.role.dynamicSoon": "Not available yet",
  "menuOffer.excludePromos": "Exclude Offers from discount and promotions, offer price is final and stackable.",
  "menuOffer.available": "Available",
  "menuOffer.from": "From",
  "menuOffer.to": "To",
  "menuOffer.startDay": "Choose offer start day",
  "menuOffer.endDay": "Choose offer end day",
  "menuOffer.specificWindow": "Set specific time window",
  "menuOffer.daysSelector": "Days Selector",
  "menuOffer.timeSelector": "Time Selector",
  "menuOffer.startTime": "Choose offer start time",
  "menuOffer.channel.dineIn": "Dine-In",
  "menuOffer.channel.takeaway": "Takeaway",
  "menuOffer.channel.delivery": "Delivery",
  "menuOffer.channel.kiosk": "Kiosk",
  "menuOffer.channel.onlineOrdering": "Online Ordering",
  "menuOffer.channel.mobileApp": "Mobile App",
  "menuOffer.incomplete": "Please make sure to fill in all details across Offer Info, Items, Pricing, Availability, and Channels to enable the next step",
```

Arabic: translate each in place, same order. Keep `{p}` intact.

Run: `cd apps/merchant && npx vitest run src/shared/i18n/keys.test.ts`
Expected: PASS.

- [ ] **Step 3: Write tab-info.tsx**

Offer Name, Offer Slug, the image dropzone with edit and delete affordances and
the size hint, an `Offer Status` switch labelled Active, an `Offer Badge`
select (Best Value / Limited Time / Popular), and a `Show saving badge` switch.

- [ ] **Step 4: Write tab-items.tsx**

One row per entry: drag handle, thumbnail, name, a −/qty/+ stepper, the line
price, an edit pencil and a red trash. Below them the blue notice
`Customers can't change item on combo.` with a `Change` link that flips
`customerCanChange`. Quantity changes go through `setOfferEntry`; the line price
is `price * qty`, computed.

- [ ] **Step 5: Write tab-pricing.tsx**

Two ledgers side by side. `Individual Item Total` lists each line, then Sub
Total, `VAT(15%)` and Total, all from `individualTotals`. `Offer Price` shows
the price, its VAT and total from `offerTotals`. `Customer Saves` shows
`offerSavings().amount` in a green panel with `Total(incl VAT): Off {p}%`
beneath it.

Then `Pricing Roles` — three radio cards. Fixed and Set a Discount are live;
Dynamic Price is selectable and renders an inline `Not available yet` panel,
the same posture `/menu/import` takes. Below them the
`Exclude Offers from discount and promotions` checkbox.

Every figure comes from `pricing.ts`. None is typed.

- [ ] **Step 6: Write tab-availability.tsx and tab-channels.tsx**

Availability: From and To date fields, a `Set specific time window` checkbox
and, when it is on, the Days Selector and Time Selector pairs.

Channels: six checkboxes — Dine-In, Takeaway, Delivery, Kiosk, Online Ordering,
Mobile App — writing into `offer.channels`.

- [ ] **Step 7: Assemble and wire in**

`offer-tabs.tsx` mirrors `items/item-tabs.tsx`: heading, offer name, five-tab
strip, panel switch. `offers/index.tsx` owns which offer is selected and routes
events into the draft transforms.

In `items/index.tsx`, replace the offers empty state with `<OffersEditor />`,
and make the entry list's add button read `menuOffer.addNew` for that section.

Gate `Next Step`: when the selected offer has an empty name, no entries, or no
channel, disable it and show the `menuOffer.incomplete` bar in red, as the
`-actions` frame draws.

- [ ] **Step 8: Verify**

Run: `cd apps/merchant && npx tsc -b --noEmit && npm test`
Expected: no type errors, suite green.

- [ ] **Step 9: Screenshot and compare**

Drive the wizard to step 2, pick the Offers section, add an offer, add the
frame's three items at 90 / 20 / 20 and set the offer price to 100. Compare each
tab against its frame. Read the Pricing tab's figures back out of the page and
confirm `130 / 19.5 / 149.5`, `100 / 15 / 115`, `SAR 34.5`, `Off 23%`.

- [ ] **Step 10: Commit**

```bash
git add apps/merchant/src/pages/menu/build/offers/ apps/merchant/src/pages/menu/build/items/index.tsx apps/merchant/src/entities/menu/draft.ts apps/merchant/src/entities/menu/draft.test.ts packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Build the offer editor's five tabs"
```

---

### Task 3: Lift the site draft into entities

**Files:**
- Create: `apps/merchant/src/entities/site-draft/{site-draft.ts,site-draft-storage.ts,use-site-draft.ts,preview-model.ts,index.ts}` (moved)
- Modify: `apps/merchant/src/pages/public-link/_shared/*.ts` → re-export shims
- Move: the matching `.test.ts` files

**Interfaces:**
- Produces: `entities/site-draft` as the public surface for `SiteDraft`, `useSiteDraft`, and `previewModelFromSite`

The Theme step needs the brand slice of `SiteDraft` — logo, the four colours,
typography, hero — and a page may not import another page's internals. So the
files move down a layer first. `pages/public-link/_shared/site-draft.ts` and its
siblings become `export * from "@/entities/site-draft"`, so nothing that imports
them today is edited.

This is the same move the Public Link Builder spec made for `storefront-assets`
and `brand-tokens`, for the same reason.

- [ ] **Step 1: Move the files**

```bash
mkdir -p apps/merchant/src/entities/site-draft
git mv apps/merchant/src/pages/public-link/_shared/site-draft.ts apps/merchant/src/entities/site-draft/site-draft.ts
git mv apps/merchant/src/pages/public-link/_shared/site-draft-storage.ts apps/merchant/src/entities/site-draft/site-draft-storage.ts
git mv apps/merchant/src/pages/public-link/_shared/use-site-draft.ts apps/merchant/src/entities/site-draft/use-site-draft.ts
git mv apps/merchant/src/pages/public-link/_shared/preview-model.ts apps/merchant/src/entities/site-draft/preview-model.ts
```

Move any `.test.ts` beside them the same way.

- [ ] **Step 2: Fix the moved files' own imports**

Each moved file's relative imports are now wrong by one level. Repoint them at
`@/` aliases rather than deeper relative paths. If a moved file imports from
`pages/public-link/`, that import is a layer violation the move exposed — hoist
what it needs, or leave that file behind and move only what the Theme step uses.

- [ ] **Step 3: Write the barrel and the shims**

`entities/site-draft/index.ts` re-exports all four. Each old path becomes a
one-line `export * from "@/entities/site-draft";` so existing importers are
untouched.

- [ ] **Step 4: Verify nothing moved semantically**

Run: `cd apps/merchant && npx tsc -b --noEmit && npm test`
Expected: no type errors, suite green — the Public Link Builder's own tests are
the proof this was a move and not a rewrite.

- [ ] **Step 5: Screenshot the Public Link Builder**

Open `/public-link` and step through it. Nothing should look different. This is
a refactor; a visual change here means something was rewritten by accident.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/entities/site-draft/ apps/merchant/src/pages/public-link/
git commit -m "Lift the site draft into entities so two modules can share it"
```

---

### Task 4: Step 3 — Theme

**Files:**
- Create: `apps/merchant/src/pages/menu/build/theme/{index.tsx,presets.tsx,branding.tsx,look-and-feel.tsx,qr-panel.tsx}`
- Modify: `apps/merchant/src/widgets/storefront-preview/storefront-preview.tsx` (the `menu` composition)
- Modify: `apps/merchant/src/widgets/storefront-preview/model.ts`
- Modify: `apps/merchant/src/pages/menu/build/{index.tsx,preview-rail.tsx,preview-model.ts}`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `useSiteDraft` from `@/entities/site-draft`; `MenuTheme` from `@/entities/menu`
- Produces: `ThemeStep`

Frame: `Menu theme.png`.

Ownership split, from the spec: logo, the four colours, title and body fonts,
hero media and hero text are `SiteDraft` — setting the logo here sets it in the
Public Link Builder and the reverse. Card style, category style, navigation
style, item-details behaviour, sticky cart and tag visibility are `MenuTheme`,
owned by this menu.

- [ ] **Step 1: Add the `menu` composition to the preview widget**

`StorefrontPreviewModel` gains `composition?: "landing" | "menu"`, defaulting to
`"landing"` so both existing hosts are untouched. The `menu` composition draws a
category chip strip over a four-across item grid, which is what the Theme
frame's preview shows and the landing composition does not have.

- [ ] **Step 2: Add the i18n keys**

Both dictionaries, same order. Cover: `menuTheme.title`, `.subtitle`,
`.presets`, `.viewMore`, `.branding`, `.changeLogo`, `.logoHint`, `.heroMedia`,
`.changeMedia`, `.mediaHint`, `.heroText`, `.heroSubtext`, `.lookFeel`,
`.titles`, `.body`, `.colors`, `.primary`, `.light`, `.accent`, `.dark`,
`.navStyle`, `.nav.topBar`, `.nav.sideDrawer`, `.nav.bottomBar`,
`.nav.pillScroll`, `.categoryStyle`, `.cat.iconText`, `.cat.textOnly`,
`.cat.iconsOnly`, `.cat.imageText`, `.cardStyle`, `.card.classic`,
`.card.cleanMinimal`, `.card.imageTop`, `.card.imageLeft`, `.itemDetails`,
`.details.samePage`, `.details.overlay`, `.details.newPage`, `.stickyCart`,
`.showTags`, `.showTagsHint`, `.scanTitle`, `.downloadQr`, `.publicPreview`,
`.tableQrPreview`.

- [ ] **Step 3: Write presets.tsx and branding.tsx**

Presets: a six-tile grid — Ocean, Elegant, Minimal, Warm, Dark, Natural — the
selected one carrying a checked badge, over a `View More Themes` link to the
Public Link Builder's theme step (spec open question 3).

The frame's six names do not match `theme-catalog.ts`'s six ids (spec open
question 4). Map the frame's labels onto the existing ids rather than renaming
the catalogue, which would rewrite the Public Link Builder's copy. Record the
mapping in a comment.

Branding: the logo tile with `Change Logo` and its size hint, then the hero
media tile with `Change Image/ Video`, a red delete, its size hint, and the
Hero Text and Hero Subtext fields. All bound to `SiteDraft`.

- [ ] **Step 4: Write look-and-feel.tsx**

Titles and Body font selects; the four colour swatch-and-hex rows; then four
tile groups — Navigation Style (4), Category Style (4), Menu Card Style (4),
and Item Details behaviour as three radios — then the Sticky add to cart and
Show items tags switches. Fonts and colours write to `SiteDraft`; the rest to
`MenuTheme`.

- [ ] **Step 5: Write qr-panel.tsx**

Under the preview: `Scan to see our menu`, a QR block, `Download QR Code`, and
the `Public Link Preview` / `Table QR Preview` pair. Reuse
`pages/public-link/ui/qr-encode.ts` rather than adding a QR dependency.

- [ ] **Step 6: Assemble, wire the route, verify**

`theme/index.tsx` lays out the three columns and passes
`composition: "menu"` through `preview-model.ts`. Replace the shell's `theme`
placeholder route with `<ThemeStep />`.

Run: `cd apps/merchant && npx tsc -b --noEmit && npm test`

- [ ] **Step 7: Screenshot and compare**

Against `Menu theme.png`. Change a colour and confirm the preview follows.
Confirm the Public Link Builder shows the same logo afterwards — that shared
ownership is the point of Task 3.

- [ ] **Step 8: Commit**

```bash
git add apps/merchant/src/pages/menu/build/theme/ apps/merchant/src/widgets/storefront-preview/ apps/merchant/src/pages/menu/build/index.tsx apps/merchant/src/pages/menu/build/preview-rail.tsx apps/merchant/src/pages/menu/build/preview-model.ts packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Build step 3 — the menu's theme and public experience"
```

---

### Task 5: Validation

**Files:**
- Create: `apps/merchant/src/entities/menu/validation.ts`
- Test: `apps/merchant/src/entities/menu/validation.test.ts`
- Modify: `apps/merchant/src/entities/menu/index.ts`

**Interfaces:**
- Produces: `validate(menu: Menu): { errors: Finding[]; warnings: Finding[]; recommendations: Finding[] }` where `Finding = { id: string; count: number }`

The Review step's three buckets, and the gate on publishing. Pure, so the counts
the screen shows are the counts under test.

- [ ] **Step 1: Write the failing test**

Assert, over menus built with the `draft.ts` helpers:

- an item with `price === 0` raises the `itemMissingPrice` error, counted once per item
- an item with `vatRate === 0` raises `taxMissing`
- an item with `image === null` raises the `itemMissingImage` warning
- an item with `availability.available === false` raises `itemUnavailable`
- a modifier group with `min > max` raises `modifierRulesInvalid`
- an item with an empty `description` raises the `addDescription` recommendation
- an item with no allergens raises `addAllergens`
- an item with no tags raises `addTags`
- a complete menu returns three empty arrays

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/merchant && npx vitest run src/entities/menu/validation.test.ts`

- [ ] **Step 3: Implement, run, export, commit**

```bash
cd apps/merchant && npx vitest run src/entities/menu && npx tsc -b --noEmit
git add apps/merchant/src/entities/menu/validation.ts apps/merchant/src/entities/menu/validation.test.ts apps/merchant/src/entities/menu/index.ts
git commit -m "Check a menu before it can be published"
```

---

### Task 6: Step 4 — Review & Publish

**Files:**
- Create: `apps/merchant/src/pages/menu/build/review/{index.tsx,stat-tiles.tsx,menu-preview.tsx,section-overview.tsx,validation-summary.tsx,publish-panel.tsx}`
- Modify: `apps/merchant/src/pages/menu/build/index.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `validate`, `sectionCount`, `entryCount` from `@/entities/menu`; `useDraft`
- Produces: `ReviewStep`

Frame: `Menu theme (1).png` — misnamed in the frame set; it is step 4, not the
theme step.

Six stat tiles (Sections, Items, Modifiers, Offers, Taxes, Last Saved), a menu
preview with per-section tabs, a section overview table, the validation summary
in three severities, publish destinations with readiness, a publishing summary,
and the publish action. Every number derived; the validation summary is
`validate()` over the draft, not a fixture.

- [ ] **Step 1: Add the i18n keys** — both dictionaries, same order, covering every label in the frame plus one per `Finding.id` from Task 5.

- [ ] **Step 2: Write stat-tiles.tsx** — six tiles, each count derived from the draft.

- [ ] **Step 3: Write menu-preview.tsx and section-overview.tsx** — the tabbed card strip and the Sections/Items/Status/Actions table.

- [ ] **Step 4: Write validation-summary.tsx** — three collapsible groups with their counts, coloured by severity from `--octo-tone-*` tokens.

- [ ] **Step 5: Write publish-panel.tsx** — the three destinations with readiness pills, the publishing summary, and `Publish Menu to All Channels`. **Disabled while `errors.length > 0`**, with the reason named rather than a silently dead button.

- [ ] **Step 6: Wire publishing** — on publish, set `status: "active"`, every channel to `channelStateFor("active")`, `publishedAt` to now, bump `version`, `save()`, and navigate to `/menu`.

- [ ] **Step 7: Verify and screenshot** — against the frame. Build a menu with a priceless item and confirm publishing is refused; fix it and confirm it goes through and the library card shows Active.

- [ ] **Step 8: Commit**

```bash
git add apps/merchant/src/pages/menu/build/review/ apps/merchant/src/pages/menu/build/index.tsx packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Build step 4 — review the menu and publish it"
```

---

### Task 7: Retire the six pages

**Files:**
- Delete: `apps/merchant/src/pages/menu/{items,modifiers,combos,pricing,schedules,availability}/`
- Delete: `apps/merchant/src/shared/api/mock-menu.ts`
- Delete: `apps/merchant/src/entities/menu-item/` (an empty stub nothing imports)
- Modify: `apps/merchant/src/app/routes/registry.tsx` (drop six routes)
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts` (drop the dead `menu.*` keys)

Last, deliberately: the wizard now covers what these pages did, which was not
true when the library landed. Their sidebar entries went at that point; this
removes the pages themselves.

- [ ] **Step 1: Confirm nothing else imports them**

```bash
grep -rn "mock-menu\|pages/menu/items\|pages/menu/modifiers\|pages/menu/combos\|pages/menu/pricing\|pages/menu/schedules\|pages/menu/availability" apps/merchant/src --include=*.ts --include=*.tsx
```

Expected: only the six pages themselves and the six registry rows. **If anything
else appears, stop** — something still depends on them and this task's premise
is wrong.

- [ ] **Step 2: Delete the pages, the fixture and the stub; drop the six registry rows.**

- [ ] **Step 3: Prune the dead dictionary keys**

Every `menu.*` key not used by the new module. Find them by grepping each key
prefix; do not delete by eye. `menuLib.*`, `menuWiz.*`, `menuOffer.*`,
`menuTheme.*` and `menuReview.*` all stay.

- [ ] **Step 4: Verify**

```bash
cd apps/merchant && npx tsc -b --noEmit && npm test && npx vite build
```

Expected: no type errors, suite green, build succeeds.

- [ ] **Step 5: Walk the module**

Screenshot `/menu`, `/menu/new`, `/menu/import`, and each of the four build
steps. Confirm every one still renders and the sidebar's Menu entry still
navigates straight to the library. Then confirm `/menu/items` 404s.

- [ ] **Step 6: Commit**

```bash
git add -u apps/merchant/src packages/i18n/src
git commit -m "Retire the six pages the menu module replaced"
```

---

## What this plan does not do

- **The AI branch.** `/menu/import` still explains itself; `AI Menu`,
  `Edit Menu ai` and `Edit Detected items` are specced but not built.
- **Dynamic Price.** Selectable, with an inline "coming soon" panel (spec open
  question 1). Fixed and Set a Discount are live.
- **Real uploads.** Every image and video control is a picker with no store
  behind it, as in plan 1. It arrives with the backend.
- **Persistence.** Still in memory. `use-menu-library` remains the one file a
  real backend replaces.
