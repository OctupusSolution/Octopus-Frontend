# Menu Build Wizard — Foundation, Sections and Items

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the wizard shell and its first two steps, so a merchant can start from `Create From Scratch` and end with a menu that has real sections and real items with modifiers, prices, nutrition and allergens.

**Architecture:** `entities/menu` gains `draft.ts` — pure transforms over one `Menu` (section CRUD and reorder, item CRUD, modifier group and option CRUD), mirroring the pure-array posture `library.ts` already set. `pages/menu/build/` is one splat route owning the draft in React state and rendering a nested `<Routes>` for the four steps. Every step is a three-column layout: a list rail, an editor, and the live preview.

**Tech Stack:** React 18, react-router-dom 6, TypeScript 5.5, Vitest 2, Tailwind 3, `@octopus/ui` primitives (imported as `@ui/primitives`), `@i18n` flat dictionaries.

**Spec:** `docs/superpowers/specs/2026-09-09-merchant-menu-design.md`

## Scope

This is plan 1 of 2 for the wizard. It delivers working software on its own: the shell, step 1 (Sections) and step 2's item side (General, Pricing, Nutrition, Allergies, Modifiers).

Plan 2 covers the offer editor's five tabs, step 3 (Theme), step 4 (Review & Publish), and the removal of the six old pages with their routes and `mock-menu.ts`.

## Global Constraints

- **Tests run with:** `cd apps/merchant && npx vitest run <path>`. Whole suite: `npm test -w @octopus/merchant`.
- **i18n:** every user-visible string is a key in **both** `packages/i18n/src/locales/en/index.ts` and `.../ar/index.ts`. `shared/i18n/keys.test.ts` fails if they disagree. Namespace for this plan: `menuWiz.*`.
- **FSD layers:** `entities/` may not import from `pages/` or `widgets/`. No page imports another page's internals.
- **Direction:** logical CSS properties only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) — never `ml-`, `pr-`, `left-`. The app runs RTL in Arabic.
- **Colour:** never a hex literal in a component. Use the `--octo-*` tokens defined in `apps/merchant/src/index.css`. If a token you need does not exist, add it to **both** the light `:root` block and the dark block — `--octo-accent` was invented by a plan once and painted white-on-white until it was defined.
- **Money and counts:** never hardcode a derived number. Totals, VAT, counts and percentages are computed.
- **Never `git add -A` or `git add <dir>`.** This branch carries unrelated uncommitted work. Stage the exact files each task names.
- **Verification:** every screen is screenshotted and compared against its frame in `apps/assets/Menu/Menu Design/` before its task is called done. `tsc` passing is not evidence that a screen is right.

## Screenshot harness

Already built, at
`C:/Users/Mohamed/AppData/Local/Temp/claude/e--Octupus-octopus-frontend/d354fa85-be0a-477e-9b4f-d3555918aa68/scratchpad/shot.mjs`.

```bash
SP="C:/Users/Mohamed/AppData/Local/Temp/claude/e--Octupus-octopus-frontend/d354fa85-be0a-477e-9b4f-d3555918aa68/scratchpad"
MSYS_NO_PATHCONV=1 node "$SP/shot.mjs" /menu/m-allday/build/sections shot-name en 1600 1150
```

`MSYS_NO_PATHCONV=1` is required — Git Bash rewrites a leading `/route` into a Windows path. `CLICK_SELECTOR` clicks one selector, or several separated by `|`, before capturing, so popovers and dialogs can be shot open. The dev server usually already runs on **5180**; check before starting one.

---

### Task 1: Draft operations

**Files:**
- Create: `apps/merchant/src/entities/menu/draft.ts`
- Test: `apps/merchant/src/entities/menu/draft.test.ts`
- Modify: `apps/merchant/src/entities/menu/index.ts` (add `export * from "./draft";`)

**Interfaces:**
- Consumes: `Menu`, `Section`, `Item`, `ModifierGroup`, `ModifierOption`, `SectionKind`, `WEEKDAYS` from `./menu`
- Produces:
  - `blankMenu(id: string, branchId: string, now: string): Menu`
  - `blankSection(id: string, kind: SectionKind, name: string, image: string | null): Section`
  - `blankItem(id: string, name: string): Item`
  - `addSection(menu: Menu, section: Section): Menu`
  - `updateSection(menu: Menu, sectionId: string, patch: Partial<Section>): Menu`
  - `removeSection(menu: Menu, sectionId: string): Menu`
  - `moveSection(menu: Menu, from: number, to: number): Menu`
  - `addItem(menu: Menu, sectionId: string, item: Item): Menu`
  - `updateItem(menu: Menu, sectionId: string, itemId: string, patch: Partial<Item>): Menu`
  - `removeItem(menu: Menu, sectionId: string, itemId: string): Menu`
  - `duplicateItem(menu: Menu, sectionId: string, itemId: string, newId: string): Menu`
  - `addItemToSections(menu: Menu, itemId: string, fromSectionId: string, targetSectionIds: string[], newId: (i: number) => string): Menu`
  - `addModifierGroup(menu, sectionId, itemId, group: ModifierGroup): Menu`
  - `updateModifierGroup(menu, sectionId, itemId, groupId, patch: Partial<ModifierGroup>): Menu`
  - `removeModifierGroup(menu, sectionId, itemId, groupId): Menu`
  - `addModifierOption(menu, sectionId, itemId, groupId, option: ModifierOption): Menu`
  - `updateModifierOption(menu, sectionId, itemId, groupId, optionId, patch: Partial<ModifierOption>): Menu`
  - `removeModifierOption(menu, sectionId, itemId, groupId, optionId): Menu`
  - `modifierTotal(item: Item): number` — base price plus every defaulted/selected option's surcharge
  - `OFFERS_SECTION_ID: "offers"`

Every function returns a new `Menu`; none mutates. `blankMenu` seeds the built-in
`offers` section, because the spec settled that every menu owns exactly one and it
is never created or deleted by hand.

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/entities/menu/draft.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  OFFERS_SECTION_ID,
  addItem,
  addItemToSections,
  addModifierGroup,
  addModifierOption,
  addSection,
  blankItem,
  blankMenu,
  blankSection,
  duplicateItem,
  modifierTotal,
  moveSection,
  removeItem,
  removeModifierOption,
  removeSection,
  updateItem,
  updateModifierGroup,
  updateSection,
} from "./draft";
import type { Item, ModifierGroup } from "./menu";

const NOW = "2026-09-10T08:00:00.000Z";

function base() {
  return blankMenu("m1", "jeddah-corniche", NOW);
}

function withBreakfast() {
  return addSection(base(), blankSection("s1", "items", "Breakfast", null));
}

describe("blankMenu", () => {
  it("starts with only the built-in offers section", () => {
    const menu = base();
    expect(menu.sections.map((s) => s.id)).toEqual([OFFERS_SECTION_ID]);
    expect(menu.sections[0].kind).toBe("offers");
  });

  it("starts as a draft nobody has published", () => {
    const menu = base();
    expect(menu.status).toBe("pending");
    expect(menu.publishedAt).toBeNull();
    expect(menu.updatedAt).toBe(NOW);
  });
});

describe("sections", () => {
  it("appends a new section before the offers section", () => {
    const menu = withBreakfast();
    expect(menu.sections.map((s) => s.id)).toEqual(["s1", OFFERS_SECTION_ID]);
  });

  it("patches only the named section", () => {
    const menu = updateSection(withBreakfast(), "s1", { visibility: "hidden" });
    expect(menu.sections[0].visibility).toBe("hidden");
    expect(menu.sections[0].name).toBe("Breakfast");
  });

  it("removes a section and its entries with it", () => {
    let menu = withBreakfast();
    menu = addItem(menu, "s1", blankItem("i1", "Omelette"));
    menu = removeSection(menu, "s1");
    expect(menu.sections.map((s) => s.id)).toEqual([OFFERS_SECTION_ID]);
  });

  it("refuses to remove the built-in offers section", () => {
    const menu = removeSection(base(), OFFERS_SECTION_ID);
    expect(menu.sections.map((s) => s.id)).toEqual([OFFERS_SECTION_ID]);
  });

  it("reorders sections", () => {
    let menu = withBreakfast();
    menu = addSection(menu, blankSection("s2", "items", "Mains", null));
    menu = moveSection(menu, 1, 0);
    expect(menu.sections.map((s) => s.id)).toEqual(["s2", "s1", OFFERS_SECTION_ID]);
  });

  it("leaves the order alone when an index is out of range", () => {
    const menu = moveSection(withBreakfast(), 5, 0);
    expect(menu.sections.map((s) => s.id)).toEqual(["s1", OFFERS_SECTION_ID]);
  });
});

describe("items", () => {
  it("adds an item to the named section", () => {
    const menu = addItem(withBreakfast(), "s1", blankItem("i1", "Omelette"));
    expect(menu.sections[0].entries.map((e) => e.id)).toEqual(["i1"]);
  });

  it("patches only the named item", () => {
    let menu = addItem(withBreakfast(), "s1", blankItem("i1", "Omelette"));
    menu = addItem(menu, "s1", blankItem("i2", "Shakshuka"));
    menu = updateItem(menu, "s1", "i2", { sku: "BR-002" });
    expect((menu.sections[0].entries[1] as Item).sku).toBe("BR-002");
    expect((menu.sections[0].entries[0] as Item).sku).toBe("");
  });

  it("removes an item", () => {
    let menu = addItem(withBreakfast(), "s1", blankItem("i1", "Omelette"));
    menu = removeItem(menu, "s1", "i1");
    expect(menu.sections[0].entries).toEqual([]);
  });

  it("duplicates an item under a new id, right after the original", () => {
    let menu = addItem(withBreakfast(), "s1", blankItem("i1", "Omelette"));
    menu = addItem(menu, "s1", blankItem("i2", "Shakshuka"));
    menu = duplicateItem(menu, "s1", "i1", "i1-copy");
    expect(menu.sections[0].entries.map((e) => e.id)).toEqual(["i1", "i1-copy", "i2"]);
    expect(menu.sections[0].entries[1].name).toBe("Omelette");
  });

  it("copies an item into several other sections at once", () => {
    let menu = withBreakfast();
    menu = addSection(menu, blankSection("s2", "items", "Mains", null));
    menu = addSection(menu, blankSection("s3", "items", "Kids", null));
    menu = addItem(menu, "s1", blankItem("i1", "Omelette"));
    menu = addItemToSections(menu, "i1", "s1", ["s2", "s3"], (i) => `i1-copy-${i}`);
    expect(menu.sections[1].entries.map((e) => e.id)).toEqual(["i1-copy-0"]);
    expect(menu.sections[2].entries.map((e) => e.id)).toEqual(["i1-copy-1"]);
    expect(menu.sections[0].entries.map((e) => e.id)).toEqual(["i1"]);
  });
});

describe("modifiers", () => {
  const size: ModifierGroup = {
    id: "g1",
    name: "Size",
    type: "single",
    customerLabel: "Choose your size",
    helpText: "Select your preferred size",
    min: 1,
    max: 1,
    required: true,
    showAsRadio: true,
    options: [],
  };

  function withGroup() {
    let menu = addItem(withBreakfast(), "s1", blankItem("i1", "Burger"));
    menu = updateItem(menu, "s1", "i1", { pricing: { price: 100, vatRate: 0.15 } });
    return addModifierGroup(menu, "s1", "i1", size);
  }

  function firstItem(menu: ReturnType<typeof withGroup>): Item {
    return menu.sections[0].entries[0] as Item;
  }

  it("adds a group to the item", () => {
    expect(firstItem(withGroup()).modifierGroups.map((g) => g.id)).toEqual(["g1"]);
  });

  it("patches a group", () => {
    const menu = updateModifierGroup(withGroup(), "s1", "i1", "g1", { required: false });
    expect(firstItem(menu).modifierGroups[0].required).toBe(false);
    expect(firstItem(menu).modifierGroups[0].name).toBe("Size");
  });

  it("adds and removes options", () => {
    let menu = addModifierOption(withGroup(), "s1", "i1", "g1", {
      id: "o1", name: "Medium", subLabel: "160g beef",
      priceType: "add-amount", price: 8, isDefault: true, available: true,
    });
    expect(firstItem(menu).modifierGroups[0].options.map((o) => o.id)).toEqual(["o1"]);
    menu = removeModifierOption(menu, "s1", "i1", "g1", "o1");
    expect(firstItem(menu).modifierGroups[0].options).toEqual([]);
  });

  it("totals the base price plus every defaulted surcharge", () => {
    let menu = addModifierOption(withGroup(), "s1", "i1", "g1", {
      id: "o1", name: "120g beef", subLabel: "",
      priceType: "no-change", price: 0, isDefault: false, available: true,
    });
    menu = addModifierOption(menu, "s1", "i1", "g1", {
      id: "o2", name: "Medium", subLabel: "160g beef",
      priceType: "add-amount", price: 8, isDefault: true, available: true,
    });
    menu = addModifierGroup(menu, "s1", "i1", {
      ...size, id: "g2", name: "Cheese", type: "multi", required: false,
      options: [
        { id: "o3", name: "American", subLabel: "", priceType: "add-amount", price: 2, isDefault: true, available: true },
        { id: "o4", name: "Cheddar", subLabel: "", priceType: "add-amount", price: 3, isDefault: true, available: true },
        { id: "o5", name: "Blue", subLabel: "", priceType: "add-amount", price: 3, isDefault: false, available: false },
      ],
    });
    // The frame's SAR 113: base 100 + Medium 8 + American 2 + Cheddar 3.
    expect(modifierTotal(firstItem(menu))).toBe(113);
  });

  it("ignores an unavailable option even when it is defaulted", () => {
    const menu = addModifierOption(withGroup(), "s1", "i1", "g1", {
      id: "o1", name: "Large", subLabel: "",
      priceType: "add-amount", price: 14, isDefault: true, available: false,
    });
    expect(modifierTotal(firstItem(menu))).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/merchant && npx vitest run src/entities/menu/draft.test.ts`
Expected: FAIL — "Failed to load url ./draft".

- [ ] **Step 3: Write the implementation**

Create `apps/merchant/src/entities/menu/draft.ts`. Requirements, all exercised by the test above:

- Every export returns a new `Menu`; no function mutates its argument. Section and entry arrays are rebuilt with `map`/`filter`/spread.
- `OFFERS_SECTION_ID = "offers"`.
- `blankMenu` returns a `Menu` with `status: "pending"`, `publishedAt: null`, `updatedAt: now`, `version: 1`, `cover: null`, the theme defaults from `MenuTheme` (`presetId: "elegant"`, `navStyle: "top-bar"`, `categoryStyle: "icon-text"`, `cardStyle: "classic"`, `itemDetails: "same-page"`, `stickyAddToCart: true`, `showItemTags: true`), an all-day schedule over `[...WEEKDAYS]` in `Asia/Riyadh` for `[branchId]`, channels all `"pending"`, and `sections: [offers section]`.
- `addSection` splices the new section **before** the offers section, so Offers always sorts last however many sections are added.
- `removeSection` is a no-op for `OFFERS_SECTION_ID`.
- `moveSection` is a no-op when either index is outside `0..length-1`.
- `duplicateItem` inserts the copy immediately after the original.
- `addItemToSections` copies the source item into each target, taking each new id from the `newId(index)` callback so the caller owns id generation and the tests stay deterministic.
- `modifierTotal` sums `item.pricing.price` plus, for every group, every option that is `isDefault && available` and whose `priceType === "add-amount"`, adding `option.price`. A `priceType` of `"fixed"` replaces the base price rather than adding to it; `"no-change"` adds nothing.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/merchant && npx vitest run src/entities/menu/draft.test.ts`
Expected: PASS, 18 tests.

- [ ] **Step 5: Export it and run the whole entity suite**

Add `export * from "./draft";` to `apps/merchant/src/entities/menu/index.ts`.

Run: `cd apps/merchant && npx vitest run src/entities/menu && npx tsc -b --noEmit`
Expected: all entity tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/entities/menu/draft.ts apps/merchant/src/entities/menu/draft.test.ts apps/merchant/src/entities/menu/index.ts
git commit -m "Add the draft's section, item and modifier transforms"
```

---

### Task 2: The wizard shell

**Files:**
- Create: `apps/merchant/src/pages/menu/build/index.tsx`
- Create: `apps/merchant/src/pages/menu/build/stepper.tsx`
- Create: `apps/merchant/src/pages/menu/build/wizard-header.tsx`
- Create: `apps/merchant/src/pages/menu/build/use-draft.ts`
- Modify: `apps/merchant/src/app/routes/registry.tsx`
- Modify: `apps/merchant/src/widgets/top-bar/index.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `blankMenu`, `useMenuLibrary`, `SEED_BRANCHES`, `type Menu` from `@/entities/menu`
- Produces: `MenuBuilderPage`, `Stepper` with props `{ current: 1 | 2 | 3 | 4; onJump: (step: number) => void }`, `WizardHeader` with props `{ titleKey: string; subtitleKey: string }`, and `useDraft(): { draft: Menu; setDraft: (next: Menu) => void; save: () => void }`

Four addresses, one shell. `app/routes/registry.tsx` is a flat list, so the four
steps enter it as the single splat entry `/menu/:menuId/build/*`; `index.tsx`
owns the draft and renders a nested `<Routes>` beneath it. The draft lives in
memory (spec, Persistence), so a step reached by refresh finds none and
redirects to `/menu` rather than rendering an empty wizard.

`/menu/new/scratch` is the entry point the chooser and the import page both
already link to. It creates a draft menu and redirects to its
`/build/sections` — it renders nothing itself.

- [ ] **Step 1: Add the i18n keys**

Add to `packages/i18n/src/locales/en/index.ts`:

```ts
  "menuWiz.step.sections": "Sections",
  "menuWiz.step.items": "Items",
  "menuWiz.step.theme": "Theme",
  "menuWiz.step.review": "Review& Publish",
  "menuWiz.sections.title": "Create New Menu from Scratch",
  "menuWiz.sections.subtitle": "Build your menu step by step, you can always change things later.",
  "menuWiz.items.title": "Add& Configure Items",
  "menuWiz.items.subtitle": "Build your menu step by step, you can always change things later.",
  "menuWiz.changeBranch": "Change Branch",
  "menuWiz.cancel": "Cancel",
  "menuWiz.saveDraft": "Save Draft",
  "menuWiz.nextStep": "Next Step",
  "menuWiz.back": "Back",
```

And the matching Arabic in `.../ar/index.ts`:

```ts
  "menuWiz.step.sections": "الأقسام",
  "menuWiz.step.items": "الأصناف",
  "menuWiz.step.theme": "المظهر",
  "menuWiz.step.review": "المراجعة والنشر",
  "menuWiz.sections.title": "إنشاء قائمة جديدة من الصفر",
  "menuWiz.sections.subtitle": "ابنِ قائمتك خطوة بخطوة، ويمكنك تغيير كل شيء لاحقاً.",
  "menuWiz.items.title": "إضافة الأصناف وضبطها",
  "menuWiz.items.subtitle": "ابنِ قائمتك خطوة بخطوة، ويمكنك تغيير كل شيء لاحقاً.",
  "menuWiz.changeBranch": "تغيير الفرع",
  "menuWiz.cancel": "إلغاء",
  "menuWiz.saveDraft": "حفظ كمسودة",
  "menuWiz.nextStep": "الخطوة التالية",
  "menuWiz.back": "رجوع",
```

- [ ] **Step 2: Run the dictionary test**

Run: `cd apps/merchant && npx vitest run src/shared/i18n/keys.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 3: Write the stepper**

Create `apps/merchant/src/pages/menu/build/stepper.tsx`. Four numbered nodes
joined by a rail, exactly as every wizard frame draws it: a filled
`--octo-accent` circle with a white numeral for done and current steps, a
`--octo-track` circle with muted numeral for the rest; the connector between two
completed nodes is `--octo-accent`, otherwise `--octo-border-card`. Labels sit
under each node, `--octo-accent` for reached steps and `--octo-text-muted`
beyond. Nodes for reached steps are buttons calling `onJump`; unreached ones are
inert `span`s, because a merchant cannot skip ahead to Review before there is
anything to review.

- [ ] **Step 4: Write the header**

Create `apps/merchant/src/pages/menu/build/wizard-header.tsx`. Title and
subtitle on the start side; on the end side the date chip (same markup as the
library page's, `CalendarDays` + `--octo-track`) and a branch chip carrying
`MapPin`, the branch label, and a `Change Branch` link styled
`--octo-accent` and underlined. Takes `titleKey` and `subtitleKey` so each step
supplies its own pair.

- [ ] **Step 5: Write the draft hook and the shell**

Create `apps/merchant/src/pages/menu/build/use-draft.ts` exporting a React
context (`DraftProvider`, `useDraft`) holding `{ draft, setDraft, save }`. `save`
writes the draft back into the library through `useMenuLibrary`'s `setMenus`,
replacing the menu with the same id or appending it when new. This is the one
seam a real backend replaces.

Create `apps/merchant/src/pages/menu/build/index.tsx` exporting `MenuBuilderPage`
and `NewMenuRedirect`:

- `MenuBuilderPage` reads `:menuId` from the route, finds that menu in the
  library, and redirects to `/menu` when there is none. It renders
  `DraftProvider` around the stepper, a nested `<Routes>` with `sections`,
  `items`, `theme` and `review` paths (the last two rendering a placeholder
  until plan 2), and the footer: `Cancel` (navigates `/menu`), `Save Draft`
  (calls `save`, then navigates `/menu`) and `Next Step` (navigates the next
  step's path). Footer buttons span the page bottom in the frame's proportions:
  Cancel narrow, Save Draft wide, Next Step widest and primary.
- `NewMenuRedirect` calls `blankMenu` with a fresh id, appends it to the
  library, and `<Navigate replace>`s to `/menu/<id>/build/sections`.

- [ ] **Step 6: Register the routes**

In `apps/merchant/src/app/routes/registry.tsx`, after the `menu-import` entry:

```tsx
  { id: "menu-new-scratch", path: "/menu/new/scratch", section: "Menu", page: "Create New Menu",
    element: lazy(() => import("@/pages/menu/build").then(m => ({ default: m.NewMenuRedirect }))) },
  { id: "menu-build",   path: "/menu/:menuId/build/*", section: "Menu", page: "Menu Builder",
    element: lazy(() => import("@/pages/menu/build").then(m => ({ default: m.MenuBuilderPage }))) },
```

- [ ] **Step 7: Give the breadcrumb a prefix fallback**

`widgets/top-bar/index.tsx` keys its crumb map on an exact `pathname`, so every
parameterised route falls back to "Dashboard / Overview" — already wrong today on
`/customers/:id` and its two siblings, and the builder would add four more.

Replace the exact lookup with a longest-matching-prefix fallback: try the exact
path first; failing that, take the entry whose path prefix (up to its first `:`
or `*`) is the longest match for the current pathname. Keep the Dashboard
default for no match at all.

- [ ] **Step 8: Verify**

Run: `cd apps/merchant && npx tsc -b --noEmit && npm test`
Expected: no type errors, suite green.

- [ ] **Step 9: Screenshot**

```bash
SP="C:/Users/Mohamed/AppData/Local/Temp/claude/e--Octupus-octopus-frontend/d354fa85-be0a-477e-9b4f-d3555918aa68/scratchpad"
MSYS_NO_PATHCONV=1 node "$SP/shot.mjs" /menu/new/scratch wiz-shell en 1600 1150
```

Confirm the URL landed on `/menu/<id>/build/sections`, the stepper shows four
nodes with 1 current, the header carries the date and branch chips, and the
footer carries all three buttons. Confirm the breadcrumb reads "Menu / Menu
Builder" and not "Dashboard / Overview". Shoot `/customers/c-1` too and confirm
that breadcrumb now reads "Customers / Customer Profile".

- [ ] **Step 10: Commit**

```bash
git add apps/merchant/src/pages/menu/build/ apps/merchant/src/app/routes/registry.tsx apps/merchant/src/widgets/top-bar/index.tsx packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Add the wizard shell, its four addresses and the draft it carries"
```

---

### Task 3: Step 1 — Sections

**Files:**
- Create: `apps/merchant/src/pages/menu/build/sections/index.tsx`
- Create: `apps/merchant/src/pages/menu/build/sections/section-list.tsx`
- Create: `apps/merchant/src/pages/menu/build/sections/section-settings.tsx`
- Create: `apps/merchant/src/pages/menu/build/sections/section-modal.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `useDraft` from `../use-draft`; `addSection`, `updateSection`, `removeSection`, `moveSection`, `blankSection`, `OFFERS_SECTION_ID`, `type Section` from `@/entities/menu`
- Produces: `SectionsStep`, `SectionList`, `SectionSettings`, `SectionModal` with props `{ mode: "add" | "edit"; section: Section | null; onClose: () => void; onSave: (name: string, image: string | null) => void }`

Frames: `Create menu from scratch.png`, `add new section.png`,
`add new section (1).png` (Edit Section), `section actions.png`.

Three columns at `xl`, stacking below it: `Build Your Sections`, `Section
Setting`, and the live preview rail (Task 4 fills the third; until then it
renders an empty bordered card of the same width so the layout is right).

- [ ] **Step 1: Add the i18n keys**

Add to `packages/i18n/src/locales/en/index.ts`:

```ts
  "menuWiz.sec.buildTitle": "Build Your Sections",
  "menuWiz.sec.buildHint": "Add sections to organize your menu. Drag and drop to reorder.",
  "menuWiz.sec.addNew": "Add New Section",
  "menuWiz.sec.itemCount": "{n} Itme",
  "menuWiz.sec.settingTitle": "Section Setting",
  "menuWiz.sec.tab.general": "General",
  "menuWiz.sec.tab.availability": "Availability",
  "menuWiz.sec.tab.advanced": "Advanced",
  "menuWiz.sec.image": "Section Image",
  "menuWiz.sec.changeImage": "Change Image",
  "menuWiz.sec.imageHint": "Recommended Size: 600*400px",
  "menuWiz.sec.description": "Description",
  "menuWiz.sec.visibility": "Visibility",
  "menuWiz.sec.visible": "Visible",
  "menuWiz.sec.visibleHint": "Show in menu",
  "menuWiz.sec.hidden": "Hidden",
  "menuWiz.sec.hiddenHint": "Don't show to customers",
  "menuWiz.sec.displayStyle": "Display Style",
  "menuWiz.sec.style.list": "List",
  "menuWiz.sec.style.carousel": "Carousel",
  "menuWiz.sec.style.grid": "Grid",
  "menuWiz.sec.color": "Section Color",
  "menuWiz.sec.colorOptional": "Optional",
  "menuWiz.sec.action.edit": "Edit",
  "menuWiz.sec.action.archive": "Archived",
  "menuWiz.sec.action.delete": "Delete",
  "menuWiz.sec.modal.addTitle": "Add New Section",
  "menuWiz.sec.modal.editTitle": "Edit Section",
  "menuWiz.sec.modal.name": "Section Name",
  "menuWiz.sec.modal.namePlaceholder": "Enter section name",
  "menuWiz.sec.modal.image": "Section Image",
  "menuWiz.sec.modal.upload": "Upload section image",
  "menuWiz.sec.modal.change": "Tab to change section image",
  "menuWiz.sec.modal.save": "Save Section",
  "menuWiz.sec.modal.saveChanges": "Save Section Changes",
  "menuWiz.sec.deleteTitle": "Delete section?",
  "menuWiz.sec.deleteBody": "Deleting {name} deletes the {n} items in it. This cannot be undone.",
```

And the matching Arabic in `.../ar/index.ts`:

```ts
  "menuWiz.sec.buildTitle": "ابنِ أقسامك",
  "menuWiz.sec.buildHint": "أضف أقساماً لتنظيم قائمتك. اسحب وأفلت لإعادة الترتيب.",
  "menuWiz.sec.addNew": "إضافة قسم جديد",
  "menuWiz.sec.itemCount": "{n} صنف",
  "menuWiz.sec.settingTitle": "إعدادات القسم",
  "menuWiz.sec.tab.general": "عام",
  "menuWiz.sec.tab.availability": "التوفر",
  "menuWiz.sec.tab.advanced": "متقدم",
  "menuWiz.sec.image": "صورة القسم",
  "menuWiz.sec.changeImage": "تغيير الصورة",
  "menuWiz.sec.imageHint": "المقاس الموصى به: 600×400 بكسل",
  "menuWiz.sec.description": "الوصف",
  "menuWiz.sec.visibility": "الظهور",
  "menuWiz.sec.visible": "ظاهر",
  "menuWiz.sec.visibleHint": "يظهر في القائمة",
  "menuWiz.sec.hidden": "مخفي",
  "menuWiz.sec.hiddenHint": "لا يظهر للعملاء",
  "menuWiz.sec.displayStyle": "نمط العرض",
  "menuWiz.sec.style.list": "قائمة",
  "menuWiz.sec.style.carousel": "شريط",
  "menuWiz.sec.style.grid": "شبكة",
  "menuWiz.sec.color": "لون القسم",
  "menuWiz.sec.colorOptional": "اختياري",
  "menuWiz.sec.action.edit": "تعديل",
  "menuWiz.sec.action.archive": "أرشفة",
  "menuWiz.sec.action.delete": "حذف",
  "menuWiz.sec.modal.addTitle": "إضافة قسم جديد",
  "menuWiz.sec.modal.editTitle": "تعديل القسم",
  "menuWiz.sec.modal.name": "اسم القسم",
  "menuWiz.sec.modal.namePlaceholder": "أدخل اسم القسم",
  "menuWiz.sec.modal.image": "صورة القسم",
  "menuWiz.sec.modal.upload": "ارفع صورة القسم",
  "menuWiz.sec.modal.change": "اضغط لتغيير صورة القسم",
  "menuWiz.sec.modal.save": "حفظ القسم",
  "menuWiz.sec.modal.saveChanges": "حفظ تغييرات القسم",
  "menuWiz.sec.deleteTitle": "حذف القسم؟",
  "menuWiz.sec.deleteBody": "حذف {name} يحذف الأصناف الـ{n} التي بداخله. لا يمكن التراجع.",
```

- [ ] **Step 2: Run the dictionary test**

Run: `cd apps/merchant && npx vitest run src/shared/i18n/keys.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the section list**

Create `section-list.tsx`. One row per section: a drag handle (`GripVertical`),
a 44px rounded thumbnail (the section image, or the same drawn `ME/NU` tile the
library card uses when there is none), the name, `{n} Itme` beneath it — the
frame's own spelling, kept because it is the string the designer wrote — then an
eye toggle flipping `visibility`, and a `MoreVertical` kebab. The selected row
carries a `--octo-selected` background.

The kebab opens Edit / Archived / Delete, anchored to the button exactly as
`pages/menu/library/actions-menu.tsx` does. Reuse that pattern; do not centre it.

Reordering is drag-and-drop with the native HTML5 events —
`draggable`, `onDragStart` recording the index, `onDragOver` with
`preventDefault`, `onDrop` calling `moveSection`. The offers row is not
draggable and has no Delete in its kebab.

Below the rows, a full-width dashed `Add New Section` button in `--octo-accent`.

- [ ] **Step 4: Write the section settings panel**

Create `section-settings.tsx`. The selected section's name as a subheading, then
a three-tab strip (General / Availability / Advanced) using the same underline
treatment the item tabs use in the frames.

General carries: the image with `Change Image` and a red trash button plus the
`600*400px` hint; a `Description` textarea; a `Visibility` radio pair with their
hint text in muted type; a `Display Style` row of three bordered tiles (List,
Carousel, Grid) with the selected one outlined in `--octo-accent`; and a
`Section Color (Optional)` row of six swatches — five fixed colours plus a
conic-gradient "custom" dot.

Availability and Advanced render an `EmptyState` for now; their frames are not
in the set and the spec does not describe their fields. Do not invent them.

- [ ] **Step 5: Write the section modal**

Create `section-modal.tsx`. One component, two modes. Name field (required,
placeholder from the keys) and an image dropzone: dashed border, upload icon and
`Upload section image` in add mode; the current thumbnail and
`Tab to change section image` in edit mode. One full-width primary button whose
label is `Save Section` or `Save Section Changes` by mode. Saving with an empty
name is refused — the button is disabled until the field has content.

- [ ] **Step 6: Assemble the step**

Create `sections/index.tsx` wiring the three columns, holding which section is
selected, and routing the list's events into `addSection`, `updateSection`,
`moveSection` and `removeSection` from the draft. Deleting a section opens a
confirm naming it and its item count, per the spec's "deleting a section deletes
its items".

- [ ] **Step 7: Verify**

Run: `cd apps/merchant && npx tsc -b --noEmit && npm test`
Expected: no type errors, suite green.

- [ ] **Step 8: Screenshot and compare**

Shoot `/menu/new/scratch`, add two sections through the modal, then compare
against `Create menu from scratch.png`: three columns, the list with handles and
counts, the settings panel's tabs and controls, the footer. Then shoot with
`CLICK_SELECTOR` on the Add button for `add new section.png`, and on a row kebab
for `section actions.png`. Shoot once in dark mode (`ar` seeds RTL; pass `en`
and flip `octopus.theme`) and confirm nothing vanishes.

- [ ] **Step 9: Commit**

```bash
git add apps/merchant/src/pages/menu/build/sections/ packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Build step 1 — the menu's sections"
```

---

### Task 4: The live preview rail

**Files:**
- Modify: `apps/merchant/src/widgets/storefront-preview/model.ts`
- Modify: `apps/merchant/src/widgets/storefront-preview/storefront-preview.tsx`
- Create: `apps/merchant/src/pages/menu/build/preview-rail.tsx`
- Create: `apps/merchant/src/pages/menu/build/preview-model.ts`
- Test: `apps/merchant/src/pages/menu/build/preview-model.test.ts`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `StorefrontPreviewModel` from `@/widgets/storefront-preview`; `type Menu` from `@/entities/menu`
- Produces: `toPreviewModel(menu: Menu, device: PreviewDevice): StorefrontPreviewModel`, `PreviewRail` with props `{ menu: Menu }`

The spec settles this: reuse `widgets/storefront-preview`, do not write a second
renderer. Two changes make it fit.

`StorefrontPreviewModel.categories` holds **i18n keys**, and the wizard's are
merchant-typed strings. `t()` is `dict[key] ?? key`, so a literal would pass
through by accident — but a section a merchant names "Home" would collide with a
real key. So the model gains an optional `categoryLabels?: readonly string[]`
which, when present, is rendered verbatim and `categories` is ignored. The two
existing hosts pass nothing and are untouched.

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/pages/menu/build/preview-model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { blankItem, blankMenu, blankSection, addItem, addSection, updateItem } from "@/entities/menu";
import { toPreviewModel } from "./preview-model";

const NOW = "2026-09-10T08:00:00.000Z";

function menuWithSections() {
  let menu = blankMenu("m1", "jeddah-corniche", NOW);
  menu = addSection(menu, blankSection("s1", "items", "Breakfast", null));
  menu = addSection(menu, blankSection("s2", "items", "Desserts", null));
  menu = addItem(menu, "s1", blankItem("i1", "Classic Breakfast"));
  menu = updateItem(menu, "s1", "i1", { pricing: { price: 90, vatRate: 0.15 } });
  return menu;
}

describe("toPreviewModel", () => {
  it("passes section names through as literal labels, not i18n keys", () => {
    const model = toPreviewModel(menuWithSections(), "desktop");
    expect(model.categoryLabels).toEqual(["Breakfast", "Desserts"]);
  });

  it("leaves the built-in offers section out of the category strip", () => {
    const model = toPreviewModel(menuWithSections(), "desktop");
    expect(model.categoryLabels).not.toContain("offers");
  });

  it("omits hidden sections", () => {
    let menu = menuWithSections();
    menu = { ...menu, sections: menu.sections.map((s) => (s.id === "s2" ? { ...s, visibility: "hidden" as const } : s)) };
    expect(toPreviewModel(menu, "desktop").categoryLabels).toEqual(["Breakfast"]);
  });

  it("formats item prices from the draft rather than sampling", () => {
    const model = toPreviewModel(menuWithSections(), "desktop");
    expect(model.samplePrices[0]).toContain("90");
  });

  it("carries the device through", () => {
    expect(toPreviewModel(menuWithSections(), "mobile").device).toBe("mobile");
  });

  it("never returns an empty category list, so the widget always has something to draw", () => {
    const model = toPreviewModel(blankMenu("m2", "b1", NOW), "desktop");
    expect(model.categoryLabels?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/merchant && npx vitest run src/pages/menu/build/preview-model.test.ts`
Expected: FAIL — "Failed to load url ./preview-model".

- [ ] **Step 3: Extend the widget's model**

In `widgets/storefront-preview/model.ts`, add to `StorefrontPreviewModel`:

```ts
  /** Literal, already-translated category labels. When present the widget
   *  renders these verbatim and ignores `categories`. The menu builder's
   *  sections are merchant-typed strings, not dictionary keys: passing them
   *  through `categories` would work only because `t()` falls back to the key
   *  it was given, and would break the day a merchant named a section after a
   *  real key. Onboarding and the Public Link Builder pass nothing. */
  categoryLabels?: readonly string[];
```

In `storefront-preview.tsx`, wherever a category label is rendered, prefer
`categoryLabels?.[i] ?? t(categories[i])`.

- [ ] **Step 4: Write the adapter**

Create `preview-model.ts` exporting `toPreviewModel`. It maps visible,
non-offers sections to `categoryLabels`, pairs each with a `storefrontAsset`
photograph cycled from `["burger.webp", "breakfast.webp", "cake.png", "drinks.webp", "meat.webp", "pizza.png"]`,
formats the first entries' prices as `SAR <n>` into `samplePrices`, and fills the
rest of the model from the menu's theme and the tenant's name. When the menu has
no visible sections it returns a single placeholder label, so the widget never
renders an empty strip.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/merchant && npx vitest run src/pages/menu/build/preview-model.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Write the rail**

Create `preview-rail.tsx`: a bordered card headed `Live Preview` with
`How it appear to your customers` beneath it and a two-button desktop/mobile
segmented control on the end side, wrapping `StorefrontPreview` scaled to the
rail's width. Add the two keys `menuWiz.preview.title` and
`menuWiz.preview.hint` to both dictionaries.

- [ ] **Step 7: Wire it into step 1 and verify**

Replace the placeholder third column in `sections/index.tsx` with `PreviewRail`.

Run: `cd apps/merchant && npx tsc -b --noEmit && npm test`
Expected: no type errors, suite green — including the existing
`preview-model.test.ts` and `public-link-model.test.ts` for the two other hosts,
which must be untouched.

- [ ] **Step 8: Screenshot and compare**

Shoot step 1 and compare the rail against the preview column in
`Create menu from scratch.png`. Add a section and confirm the preview gains it.
Toggle to mobile and confirm the frame narrows.

- [ ] **Step 9: Commit**

```bash
git add apps/merchant/src/widgets/storefront-preview/ apps/merchant/src/pages/menu/build/preview-rail.tsx apps/merchant/src/pages/menu/build/preview-model.ts apps/merchant/src/pages/menu/build/preview-model.test.ts apps/merchant/src/pages/menu/build/sections/index.tsx packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Show the menu being built as the customer will see it"
```

---

### Task 5: Step 2 — the item editor

**Files:**
- Create: `apps/merchant/src/pages/menu/build/items/index.tsx`
- Create: `apps/merchant/src/pages/menu/build/items/entry-list.tsx`
- Create: `apps/merchant/src/pages/menu/build/items/item-tabs.tsx`
- Create: `apps/merchant/src/pages/menu/build/items/tab-general.tsx`
- Create: `apps/merchant/src/pages/menu/build/items/tab-pricing.tsx`
- Create: `apps/merchant/src/pages/menu/build/items/tab-nutrition.tsx`
- Create: `apps/merchant/src/pages/menu/build/items/tab-allergies.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `useDraft`; `addItem`, `updateItem`, `removeItem`, `duplicateItem`, `addItemToSections`, `blankItem`, `type Item` from `@/entities/menu`
- Produces: `ItemsStep`, `EntryList`, `ItemTabs` with props `{ item: Item; onPatch: (patch: Partial<Item>) => void }`

Frames: `Add items.png`, `Add items-actions.png`, `Add items-set price.png`,
`Add items-Nutrition.png`, `Add items-Allergies.png`.

Left rail: a `Select Section` dropdown, then the chosen section's entries as
cards showing thumbnail, name, `SAR <price>` and a kebab (Duplicate Item / Add to
Multiple Sections / Delete), then a dashed `Add New Item`. Middle: `Item
Information` with the section name beneath and the five-tab strip. Right: the
preview rail from Task 4.

Below those three columns, spanning the first two: the `Availability` card (four
switches) and the `Schedule` card (All Day / Custom Hours radio, start and end
selects, day chips). Below both, the `Estimated Nutritional Summary` strip —
four figures **read from `item.nutrition`**, never stored twice, with a
`View full nutrition details` link that switches to the Nutrition tab.

- [ ] **Step 1: Add the i18n keys**

Add to `packages/i18n/src/locales/en/index.ts` — and the parallel Arabic to
`.../ar/index.ts`, same keys in the same order:

```ts
  "menuWiz.item.selectSection": "Select Section",
  "menuWiz.item.addNew": "Add New Item",
  "menuWiz.item.infoTitle": "Item Information",
  "menuWiz.item.tab.general": "General",
  "menuWiz.item.tab.modifiers": "Modifiers",
  "menuWiz.item.tab.pricing": "Pricing",
  "menuWiz.item.tab.nutrition": "Nutrition",
  "menuWiz.item.tab.allergies": "Allergies",
  "menuWiz.item.name": "Item Name",
  "menuWiz.item.shortName": "Short Name",
  "menuWiz.item.shortNameHint": "For POS",
  "menuWiz.item.description": "Description",
  "menuWiz.item.sku": "SKU",
  "menuWiz.item.video": "Video",
  "menuWiz.item.videoOptional": "Optional",
  "menuWiz.item.uploadVideo": "Upload Video",
  "menuWiz.item.videoHint": "MP4, MOV up to 100MB",
  "menuWiz.item.image": "Item Image",
  "menuWiz.item.changeImage": "Change Image",
  "menuWiz.item.imageHint": "Recommended Size: 600*400px",
  "menuWiz.item.tags": "Item Tag",
  "menuWiz.item.addTag": "Add Tag",
  "menuWiz.item.tag.chef": "Chef Recommended",
  "menuWiz.item.tag.top": "Top Selling",
  "menuWiz.item.tag.most": "Most Ordered",
  "menuWiz.item.tag.healthy": "Healthy Choice",
  "menuWiz.item.status": "Item Status",
  "menuWiz.item.status.active": "Active",
  "menuWiz.item.status.draft": "Draft",
  "menuWiz.item.status.unavailable": "Unavailable",
  "menuWiz.item.id": "Item ID",
  "menuWiz.item.availability": "Availability",
  "menuWiz.item.available": "Available",
  "menuWiz.item.availableHint": "Item is available and can order.",
  "menuWiz.item.forDelivery": "Available for Delivery",
  "menuWiz.item.forTakeaway": "Available for Takeaway",
  "menuWiz.item.forDineIn": "Available for Dine-In",
  "menuWiz.item.schedule": "Schedule",
  "menuWiz.item.allDay": "All Day",
  "menuWiz.item.customHours": "Custom Hours",
  "menuWiz.item.startTime": "Start Time",
  "menuWiz.item.endTime": "End Time",
  "menuWiz.item.days": "Days",
  "menuWiz.item.nutriSummary": "Estimated Nutrational Summary",
  "menuWiz.item.calories": "Calories",
  "menuWiz.item.protein": "Protein",
  "menuWiz.item.carbs": "Carbs",
  "menuWiz.item.fat": "Fat",
  "menuWiz.item.fullNutrition": "View full nutrition details",
  "menuWiz.item.price": "Item Price",
  "menuWiz.item.pricePlaceholder": "Enter item price",
  "menuWiz.item.vat": "VAT",
  "menuWiz.item.vatHint": "Applied automatically",
  "menuWiz.item.summary": "Item Summary",
  "menuWiz.item.subTotal": "Sub Total:",
  "menuWiz.item.vatLine": "VAT({p}%):",
  "menuWiz.item.total": "Total:",
  "menuWiz.item.caloriesPlaceholder": "e.g. 450 kcal",
  "menuWiz.item.gramsPlaceholder": "e.g. 25 g",
  "menuWiz.item.carb": "Carb",
  "menuWiz.item.addAllergens": "Add Allergens",
  "menuWiz.item.allergenNote": "Additional allergen information",
  "menuWiz.item.allergen.gluten": "Wheat / Gluten",
  "menuWiz.item.allergen.eggs": "Eggs",
  "menuWiz.item.allergen.dairy": "Milk / Dairy",
  "menuWiz.item.action.duplicate": "Duplicate Item",
  "menuWiz.item.action.multiSection": "Add to Multiple Sections",
  "menuWiz.item.action.delete": "Delete",
  "menuWiz.item.saveDraft": "Save as Draft",
  "menuWiz.item.saveAndAdd": "Save &Add another item",
  "menuWiz.item.multiTitle": "Add to Multiple Sections",
  "menuWiz.item.multiSave": "Add to selected sections",
```

- [ ] **Step 2: Run the dictionary test**

Run: `cd apps/merchant && npx vitest run src/shared/i18n/keys.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the entry list**

Create `entry-list.tsx` per the layout above. The kebab reuses the anchored
popover pattern from `pages/menu/library/actions-menu.tsx`.
`Add to Multiple Sections` opens a modal listing every other `items` section
with a checkbox each, saving through `addItemToSections`.

- [ ] **Step 4: Write the General tab**

Create `tab-general.tsx`: two columns. Start column carries Item Name, Short
Name (For POS), Description, SKU and the Video dropzone with its
`Upload Video` button and size hint. End column carries the image with
`Change Image` and trash, the four tag pills (toggling membership of
`item.tags`), the three-way Item Status radio, and a read-only Item ID field
with a copy button.

Required fields are marked with a red asterisk exactly as the frame does: Item
Name, Short Name, Item Image.

- [ ] **Step 5: Write the Pricing tab**

Create `tab-pricing.tsx`: an `Item Price` field prefixed `SAR`, a `VAT` field
showing the rate as a percentage, and an `Item Summary` panel listing Sub Total,
`VAT(15%)` and Total. **All three are computed** from `item.pricing.price` and
`vatRate` — the frame's 130 / 19.5 / 149.5 must fall out of the arithmetic, not
be typed.

- [ ] **Step 6: Write the Nutrition and Allergies tabs**

Create `tab-nutrition.tsx`: four number fields — Calories (required), Protein,
Carb, Fat — with the frame's placeholders, writing into `item.nutrition`.

Create `tab-allergies.tsx`: a checkbox row per allergen already on the item, an
`Add Allergens` dashed button opening a picker, and an
`Additional allergen information` textarea bound to `allergies.note`.

- [ ] **Step 7: Assemble the step**

Create `items/index.tsx` and `item-tabs.tsx` wiring the columns, the tab strip,
the Availability and Schedule cards, and the nutrition summary strip. The footer
for this step reads `Save as Draft` / `Save &Add another item` / `Next Step`.

- [ ] **Step 8: Verify**

Run: `cd apps/merchant && npx tsc -b --noEmit && npm test`
Expected: no type errors, suite green.

- [ ] **Step 9: Screenshot and compare**

Shoot the step with an item selected and compare against `Add items.png`. Then
one shot per tab against `Add items-set price.png`,
`Add items-Nutrition.png` and `Add items-Allergies.png`, and one with
`CLICK_SELECTOR` on an entry kebab against `Add items-actions.png`. Confirm the
Item Summary's three figures are the arithmetic of the price you typed.

- [ ] **Step 10: Commit**

```bash
git add apps/merchant/src/pages/menu/build/items/ packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Build step 2 — the item editor's general, pricing, nutrition and allergy tabs"
```

---

### Task 6: Step 2 — the modifier editor

**Files:**
- Create: `apps/merchant/src/pages/menu/build/items/tab-modifiers.tsx`
- Create: `apps/merchant/src/pages/menu/build/items/modifier-group-modal.tsx`
- Create: `apps/merchant/src/pages/menu/build/items/modifier-option-modal.tsx`
- Create: `apps/merchant/src/pages/menu/build/items/modifier-preview.tsx`
- Modify: `apps/merchant/src/pages/menu/build/items/item-tabs.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `addModifierGroup`, `updateModifierGroup`, `removeModifierGroup`, `addModifierOption`, `updateModifierOption`, `removeModifierOption`, `modifierTotal` from `@/entities/menu`
- Produces: `TabModifiers`, `ModifierGroupModal`, `ModifierOptionModal`, `ModifierPreview` with props `{ item: Item }`

Frames: `Add items-modifires-first time.png`, `Add items-modifires.png`,
`Add items-modifires-add modifires.png`, `Add items-modifires-add option.png`,
`Add items-modifires-add option (1).png`.

This tab is the one place the right-hand rail is **not** the live preview: it
becomes `Item summary` plus `Full Modifiers Preview (Customer view)`. Wire that
swap in `item-tabs.tsx`.

Three states, all with frames: no groups yet (an empty state with
`Add New Modifier Group`), a group selected with no options (the empty
`Add your first group options` panel), and a group with a filled options table.

- [ ] **Step 1: Add the i18n keys**

Add to both dictionaries, same keys in the same order:

```ts
  "menuWiz.mod.groupsTitle": "Modifiers Group",
  "menuWiz.mod.addGroup": "Add New Modifier Group",
  "menuWiz.mod.required": "Required",
  "menuWiz.mod.optional": "Optional",
  "menuWiz.mod.optionCount": "{n} options",
  "menuWiz.mod.editGroup": "Edit Group",
  "menuWiz.mod.groupType": "Group Type",
  "menuWiz.mod.single": "Single choose",
  "menuWiz.mod.multi": "Multiple choose",
  "menuWiz.mod.itemName": "Item Name",
  "menuWiz.mod.customerLabel": "Customer lable",
  "menuWiz.mod.helpText": "Help text",
  "menuWiz.mod.helpTextHint": "shown to customers",
  "menuWiz.mod.rules": "Select Rules",
  "menuWiz.mod.min": "Min Selected",
  "menuWiz.mod.max": "Max Selected",
  "menuWiz.mod.requiredGroup": "Required group",
  "menuWiz.mod.asRadio": "Show as radio button",
  "menuWiz.mod.options": "Options",
  "menuWiz.mod.emptyTitle": "Add your first group options",
  "menuWiz.mod.emptyBody": "like size, price and availability ,to let customers customize this item.",
  "menuWiz.mod.addOption": "Add Option",
  "menuWiz.mod.modalGroupTitle": "Add Modifier Group",
  "menuWiz.mod.modalName": "Modifier Name",
  "menuWiz.mod.modalNamePlaceholder": "Enter modifire name",
  "menuWiz.mod.selectionType": "Selection Type",
  "menuWiz.mod.saveGroup": "Save Modifier",
  "menuWiz.mod.modalOptionTitle": "Add Modifier option",
  "menuWiz.mod.optionName": "Option Name",
  "menuWiz.mod.optionNamePlaceholder": "Enter option name",
  "menuWiz.mod.priceType": "Price Type",
  "menuWiz.mod.priceTypePlaceholder": "Choose price type",
  "menuWiz.mod.priceType.noChange": "No change",
  "menuWiz.mod.priceType.add": "Add amount",
  "menuWiz.mod.priceType.fixed": "Fixed price",
  "menuWiz.mod.price": "Price",
  "menuWiz.mod.pricePlaceholder": "Enter price",
  "menuWiz.mod.setDefault": "Set as Default",
  "menuWiz.mod.availability": "Availability",
  "menuWiz.mod.saveOption": "Save Modifier Option",
  "menuWiz.mod.summaryTitle": "Item summary",
  "menuWiz.mod.previewTitle": "Full Modifiers Preview",
  "menuWiz.mod.previewHint": "Customer view",
  "menuWiz.mod.previewTotal": "Total:",
```

- [ ] **Step 2: Run the dictionary test**

Run: `cd apps/merchant && npx vitest run src/shared/i18n/keys.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the two modals**

`modifier-group-modal.tsx`: Modifier Name, a `Required group` switch, one
full-width `Save Modifier` button.

`modifier-option-modal.tsx`: Option Name, a Price Type select, a `SAR`-prefixed
Price field, a `Set as Default` radio and an `Availability` switch, one
full-width `Save Modifier Option` button.

- [ ] **Step 4: Write the customer-view preview**

`modifier-preview.tsx`: the item's card at the top (thumbnail, name,
description, `SAR <price>`), then one block per group numbered `1-`, `2-`, `3-`
carrying the group's customer label and a red asterisk when required. Single
groups render radios, multi groups checkboxes; each option shows its name, its
sub-label in muted type, and `+SAR <n>` when it carries a surcharge.
Unavailable options are dimmed and not selectable.

The `Total:` line at the bottom is `modifierTotal(item)` — the frame's SAR 113
must be computed, never typed.

- [ ] **Step 5: Write the tab**

`tab-modifiers.tsx`: the group list on the start side with drag handles and a
Required/Optional pill each, the `Edit Group` form in the middle (Group Type,
Item Name, Customer lable, Help text, Min/Max selects, the two checkboxes, and a
red trash button), and the Options panel beneath it — the empty state or the
filled table by whether the group has options.

- [ ] **Step 6: Swap the rail**

In `item-tabs.tsx`, render `ModifierPreview` instead of `PreviewRail` while the
Modifiers tab is active.

- [ ] **Step 7: Verify**

Run: `cd apps/merchant && npx tsc -b --noEmit && npm test`
Expected: no type errors, suite green.

- [ ] **Step 8: Screenshot and compare**

One shot per state against its frame: the empty group list, a group with no
options, and a group with the frame's Size / Cheese / Sauce data entered. Add
the frame's own options — Medium +8, American +2, Cheddar +3 on a SAR 100 base —
and confirm the preview's Total reads SAR 113 without anyone typing it.

- [ ] **Step 9: Commit**

```bash
git add apps/merchant/src/pages/menu/build/items/ packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Build the modifier editor and its customer-view preview"
```

---

## What this plan does not do

Named so plan 2's author does not go looking:

- **The offer editor.** Selecting the built-in `offers` section in step 2 shows
  an empty state until plan 2 builds its five tabs.
- **Step 3, Theme, and step 4, Review & Publish.** Their routes exist and render
  a placeholder.
- **The `menu` composition on `storefront-preview`.** Only the `labels` variant
  lands here; the Theme step's category-chip layout is plan 2's.
- **`entities/site-draft/` extraction.** First needed by the Theme step.
- **`pricing.ts` and `validation.ts`.** They belong to the offer editor and the
  Review step.
- **Removing the six old pages.** They stay routed and unreachable from the nav
  until plan 2's final task deletes them with `mock-menu.ts`.
