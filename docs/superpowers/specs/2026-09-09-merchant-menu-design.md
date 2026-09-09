# Merchant Menu

**Date:** 2026-09-09
**Scope:** `apps/merchant` — a menu library plus a four-step build wizard, replacing the six-page menu hub
**Status:** Approved for planning

## Why

The merchant Menu module today is a flat hub: six sibling pages — Items,
Modifiers, Combos, Pricing, Schedules, Availability — each a table over the
whole business. There is no entity called "a menu". A restaurant that runs a
Breakfast menu until 11am, an All Day menu, and a Ramadan menu has nowhere to
say so.

The frames in `apps/assets/Menu/Menu Design/` describe a different shape. The
menu is the root entity. A restaurant owns several of them, each with its own
sections, items, theme, schedule, and channel visibility, each independently
publishable and independently on-hold. Building one is a four-step wizard:
Sections, Items, Theme, Review & Publish.

That is not a restyle of the six pages. It is a different data model, and the
six pages do not survive it.

## Decisions

Settled before design; not open questions.

| Question | Decision |
|---|---|
| The six existing pages | Removed. The wizard covers their function. Removal is the last phase, so nothing is deleted before its replacement works |
| AI import branch | Deferred. `Import Menu (AI)` renders on the library page, visibly disabled, labelled "coming soon". Its three frames are specced later |
| Step 3 brand fields | Shared with Public Link Builder, not duplicated. Logo, the four colours, typography and hero read and write one model |
| Step 3 menu fields | Menu-owned. Card style, category style, navigation style, item-details behaviour, sticky cart, tag visibility live on the menu |
| Live preview | Reuses `widgets/storefront-preview`. No second renderer |
| Draft persistence | localStorage, versioned and shape-validated, mirroring `site-draft-storage.ts`. "Save Draft" tells the truth |
| Backend | None. Mock data, same posture as the rest of the merchant app |
| i18n | EN + AR from the first commit of every phase. Logical CSS properties only |
| Testing | Models and money maths are unit-tested. Screens are verified by screenshot against the frame |

## Frame inventory

Thirty-one frames, nine real screens. Two frames are duplicates
(`Create menu by AI.png` duplicates `Create menu from scratch.png`;
`Add items-actions (1).png` duplicates `Add items-actions.png`) and one is
misnamed (`Menu theme (1).png` is step 4, Review & Publish, not the theme step).

| Screen | Frames |
|---|---|
| Menu library | `menu`, `menu-Actions`, `schedule menu` |
| Create New Menu | `ADD NEW MENU - For first time or adding` |
| Step 1 Sections | `Create menu from scratch`, `add new section`, `add new section (1)` (Edit Section), `section actions` |
| Step 2 Item | `Add items`, `-actions`, `-set price`, `-Nutrition`, `-Allergies` |
| Step 2 Modifiers | `-modifires-first time`, `-modifires`, `-add modifires`, `-add option`, `-add option (1)` (filled options table) |
| Step 2 Offers | `-offers-info`, `-items on offer`, `-pricing`, `-avaliability`, `-channcels`, `-actions` |
| Step 3 Theme | `Menu theme` |
| Step 4 Review | `Menu theme (1)` |
| AI branch (deferred) | `AI Menu`, `Edit Menu ai`, `Edit Detected items` |

The two illustrations in `apps/assets/Menu/` (`Create Menu.png`,
`Upload Menu.png`) are the 3D art for the two method cards.

## Architecture

### Extracting the shared site draft

Step 3 needs the brand slice of `SiteDraft`, and the preview needs
`toPreviewProps`. Both live in `pages/public-link/_shared/`, and a page
importing another page's internals is exactly the coupling FSD exists to
prevent. So three files move first, to the entities layer:

```
entities/site-draft/
  site-draft.ts          moved from pages/public-link/_shared/
  site-draft-storage.ts  moved
  use-site-draft.ts      moved
  preview-model.ts       moved
  index.ts               public surface
```

`pages/public-link/_shared/site-draft.ts` and its siblings become
`export * from "@/entities/site-draft"`, so none of the files importing them
today are edited. Their `.test.ts` files move with them.

This is the same move the Public Link Builder spec made for
`storefront-assets` and `brand-tokens`, for the same reason.

### File tree

```
entities/menu/
  menu.ts                types + the draft reducer
  menu-storage.ts        versioned localStorage, shape-validated
  use-menu-draft.ts      the hook the wizard steps consume
  pricing.ts             VAT, offer totals, savings — pure functions
  validation.ts          the Review step's errors/warnings/recommendations
  index.ts

pages/menu/
  index.tsx              the library: cards, filters, actions, schedule modal
  new/index.tsx          Create New Menu — two method cards
  build/
    index.tsx            wizard shell: stepper, header, footer, step routing
    steps/
      sections-step.tsx
      items-step.tsx     dispatches on section kind
      theme-step.tsx
      review-step.tsx
  _shared/
    schedule-modal.tsx
    section-modal.tsx    Add and Edit, one component, two modes
    stepper.tsx

widgets/menu-editor/
  item-editor.tsx        the five item tabs
  modifier-editor.tsx    group list, group form, options table
  offer-editor.tsx       the five offer tabs
  live-preview.tsx       thin adapter over widgets/storefront-preview
```

Widgets take resolved props, never a draft. The adapter lives in the widget;
the mapping lives in `entities/`.

### Routes

```
/menu                          library
/menu/new                      method chooser
/menu/:menuId/build/sections   step 1
/menu/:menuId/build/items      step 2
/menu/:menuId/build/theme      step 3
/menu/:menuId/build/review     step 4
```

The step is in the URL, not in component state, so refresh and browser-back
work and "Save Draft" has something stable to save against. Entering the
wizard from `/menu/new` creates a draft menu and redirects to its
`/build/sections`.

Removed from `app/routes/registry.tsx`: `/menu/items`, `/menu/modifiers`,
`/menu/combos`, `/menu/pricing`, `/menu/schedules`, `/menu/availability`.

Removed from `widgets/app-sidebar/index.tsx` `ITEM_PATHS`: the six entries at
lines 134–139. The design shows **Menu** as a single flat sidebar item with no
children, which is what removing them produces.

## State model

```ts
type MenuStatus =
  | "active" | "scheduled" | "on-hold" | "expired" | "pending" | "archived";

interface Menu {
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
```

`ChannelState` reuses `MenuStatus` — the library cards show per-channel state
(`POS · Live`, `Public Link · Scheduled`) independently of the menu's own
badge, which is what the frame draws.

### Sections

```ts
type SectionKind = "items" | "offers";

interface Section {
  id: string;
  kind: SectionKind;
  name: string;
  image: string | null;
  description: string;
  visibility: "visible" | "hidden";
  displayStyle: "list" | "carousel" | "grid";
  color: string | null;
  entries: Item[] | Offer[];
}
```

`kind` is the load-bearing field. `Select Section: Offers` in step 2 swaps the
entire right panel from the item editor to the offer editor — different tabs,
different fields, different footer validation. Reading that as "a section has a
kind" rather than "offers are a special item" is what keeps the two editors
from growing into each other.

Sections are reordered by drag. The frame's `Offers` section carries a
special-offer badge as its image; that is data, not a code path.

### Items

```ts
interface Item {
  id: string;
  name: string;
  shortName: string;          // for POS
  description: string;
  sku: string;
  image: string | null;
  video: string | null;       // MP4/MOV, ≤100MB
  tags: ItemTag[];            // chef-recommended, top-selling, most-ordered, healthy-choice
  status: "active" | "draft" | "unavailable";
  availability: { available: boolean; delivery: boolean; takeaway: boolean; dineIn: boolean };
  schedule: { mode: "all-day" } | { mode: "custom"; start: string; end: string; days: Weekday[] };
  modifierGroups: ModifierGroup[];
  pricing: { price: number; vatRate: number };
  nutrition: { calories: number | null; protein: number | null; carb: number | null; fat: number | null };
  allergies: { allergens: string[]; note: string };
}
```

The General tab's "Estimated Nutritional Summary" strip is derived from
`nutrition`, not stored twice.

### Modifiers

```ts
interface ModifierGroup {
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

interface ModifierOption {
  id: string;
  name: string;
  subLabel: string;            // "160g beef"
  priceType: "no-change" | "add-amount" | "fixed";
  price: number;
  isDefault: boolean;
  available: boolean;
}
```

The right rail's "Full Modifiers Preview (Customer view)" renders from these
groups and shows a running total. That total is computed — the frame's
`SAR 113` is base 100 plus the defaulted Medium at +8 and the two ticked
cheeses at +2 and +3. It must be derived, never typed.

### Offers

```ts
interface Offer {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  status: "active" | "inactive";
  badge: string | null;              // "Best Value"
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
    dineIn: boolean; takeaway: boolean; delivery: boolean;
    kiosk: boolean; onlineOrdering: boolean; mobileApp: boolean;
  };
}
```

`Pricing & Saving` shows two ledgers side by side and a savings figure. The
ledgers derive cleanly from `entries` and `pricing`: individual subtotal `130`,
VAT at 15% `19.5`, individual total `149.5`; offer price `100`, its VAT `15`,
offer total `115`. `pricing.ts` owns these; nothing is hardcoded.

The two savings figures in that frame do not share a base, and cannot both be
right. `Off 23%` is `(149.5 − 115) / 149.5` — both totals including VAT, which
is the consistent comparison. `Customer Saves SAR 49.5` is `149.5 − 100`,
measuring an inclusive total against an exclusive price. On the same basis as
the percentage it would be `SAR 34.5`. Open question 6 settles which the
merchant is meant to see; `pricing.ts` computes one number and both readouts
use it.

### Theme

```ts
interface MenuTheme {
  presetId: string;                  // from SITE_THEMES
  navStyle: "top-bar" | "side-drawer" | "bottom-bar" | "pill-scroll";
  categoryStyle: "icon-text" | "text-only" | "icons-only" | "image-text";
  cardStyle: "classic" | "clean-minimal" | "image-top" | "image-left";
  itemDetails: "same-page" | "overlay" | "new-page";
  stickyAddToCart: boolean;
  showItemTags: boolean;
}
```

Everything else on that screen — logo, the four colours, title and body fonts,
hero media, hero text and subtext — is `SiteDraft`, reached through
`use-site-draft`. Setting the logo here sets it in Public Link Builder, and the
reverse. The preset tiles come from `SITE_THEMES`.

### Schedule

```ts
interface MenuSchedule {
  type: "all-day" | "breakfast" | "lunch" | "dinner" | "custom";
  start: string;
  end: string;
  days: Weekday[];
  timezone: string;
  branchIds: string[];
  fallbackMenuId: string | null;
  allowPreorderOutsideSchedule: boolean;
}
```

Reached from the library card's kebab (`Schedule`), as a modal over the
library — not a wizard step. The frame's four numbered blocks map one to one.

### Persistence

`menu-storage.ts` mirrors `site-draft-storage.ts`: a `DRAFT_KEY`, a
`DRAFT_VERSION`, `serialize`/`parse`, and an `isMenuShape` guard so a
hand-edited or truncated localStorage value falls back to a fresh draft
instead of crashing the wizard. localStorage rather than session storage —
a half-built menu is a business asset, and the merchant expects it tomorrow.

## The four steps

**1 — Sections.** Three columns: the section list (drag to reorder, per-row
visibility toggle and kebab), the settings panel for the selected section
(General / Availability / Advanced tabs, image, description, visibility,
display style, colour), and the live preview. Add and Edit Section are the
same modal in two modes: name and image, required both.

**2 — Items.** Section picker and entry list on the left; the editor in the
middle; preview or item summary on the right. For an `items` section the
editor is five tabs — General, Modifiers, Pricing, Nutrition, Allergies. For an
`offers` section it is five different tabs — Offer Info, Items on Offer,
Pricing & Saving, Availability, Offer Channels. The footer is the same in both:
Save as Draft, Save & Add another item, Next Step.

The Modifiers tab has three states with frames: no groups yet, a group selected
with no options, and a group with a filled options table. The right rail
switches from item summary to the customer-view modifier preview once a group
exists.

**3 — Theme.** Three columns: presets and branding, look and feel, live preview
with a QR panel underneath (Download QR Code, Public Link Preview,
Table QR Preview). Ownership split as above.

**4 — Review & Publish.** Six stat tiles across the top, a menu preview with
per-section tabs, a section overview table, a validation summary in three
severities, publish destinations with readiness, a publishing summary, and the
publish action. Every number is derived from the draft; the validation summary
is `validation.ts` over the draft, not a fixture.

## Behaviour that needs stating

- **Next Step is gated.** The offers `-actions` frame shows a red bar —
  "Please make sure to fill in all details across Offer Info, Items, Pricing,
  Availability, and Channels to enable the next step" — with Next Step
  disabled. Validation is per-tab-group, and the message names the incomplete
  tabs.
- **The library empty state.** No frame. A first-run merchant sees the library
  with no cards; it gets the same two method cards as `/menu/new`, inline.
- **Deleting a section** deletes its items. The confirm says so.
- **Hold** and **Archived** are distinct: held menus keep their schedule and
  can be resumed; archived ones leave the default filter.
- **Fallback menu** cannot be the menu being scheduled. Self-reference is
  filtered out of that dropdown.
- **Cover images** in the library are decorative; the frame's nine cards all
  share one placeholder.

## Phases

Each phase ends with a screenshot compared against its frame, and a review
checkpoint.

1. `entities/site-draft/` extraction with re-exports; tests move and pass
2. `entities/menu/` — types, reducer, storage, pricing, validation, with tests
3. Menu library — cards, filters, kebab actions, schedule modal
4. Create New Menu chooser; `Import Menu (AI)` disabled
5. Wizard shell and step 1, Sections
6. Step 2 — item editor: General, Pricing, Nutrition, Allergies
7. Step 2 — modifier editor, all three states
8. Step 2 — offer editor, all five tabs
9. Step 3 — Theme
10. Step 4 — Review & Publish
11. Remove the six pages, their routes, their sidebar entries, and `mock-menu.ts`

## Verification

- `entities/menu/pricing.ts` — VAT, offer totals, savings, discount percentage
- `entities/menu/validation.ts` — the three severity buckets and their counts
- `entities/menu/menu.ts` — reducer transitions, section reorder, cascade delete
- `entities/menu/menu-storage.ts` — round-trip, version mismatch, corrupt value
- Every screen screenshotted at its frame's width and compared before it is
  called done

## Open questions

Recorded, not blocking. Each is resolved when its phase is reached.

1. **Dynamic Price.** The third pricing role in `-offers-pricing` has no frame
   showing what it does. Proposal: build Fixed and Discount, render Dynamic
   selectable but with an inline "coming soon" panel, matching the AI posture.
2. **Add to Multiple Sections.** The item kebab offers it; no frame shows the
   section picker. Proposal: a modal with the section checklist.
3. **View More Themes.** Destination unspecified. Proposal: link to Public Link
   Builder's theme step, since that is where the full catalogue already lives.
4. **Theme preset names.** The frame shows Ocean, Elegant, Minimal, Warm, Dark,
   Natural. `theme-catalog.ts` has elegant, modernGrid, minimalMono, cafeWarm,
   casualBright, luxeNoir. Rename the catalogue, or map frame labels onto
   existing ids? Renaming touches Public Link Builder's copy.
5. **Change Branch.** Present in the wizard header on every frame. Whether it
   re-scopes the draft or only the preview is unstated.
6. **Offer savings base.** The frame's `SAR 49.5` and `Off 23%` are computed
   on different bases (see Offers above). Proposal: compare both totals
   including VAT — `149.5 − 115 = SAR 34.5`, `Off 23%` — which keeps the
   percentage the frame shows and makes the money figure agree with it. Needs
   the designer's call, because it changes a number on screen.
