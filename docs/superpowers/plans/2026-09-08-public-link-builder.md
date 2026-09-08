# Public Link Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a seven-step Public Link Builder to the merchant console — Theme, Brand, Pages, Navigation, Customize, Preview, Publish — reachable from a new sidebar entry, driven by its own persisted draft, with a live storefront preview beside every step.

**Architecture:** A new page module at `pages/public-link/` owns a `SiteDraft` reducer and a `localStorage`-backed hook. The storefront preview currently living inside onboarding step 8 is lifted into `widgets/storefront-preview` behind fully-resolved props, and both hosts feed it through their own adapter. Pure logic — reducer, storage codec, catalogs, preview adapter, QR encoder, go-live predicates — is unit-tested; UI is verified by typecheck plus screenshots against the frames in both locales.

**Tech Stack:** React 18 + Vite + TypeScript, Tailwind (logical properties only), `lucide-react`, `clsx`, `@ui/primitives`, `@i18n`, vitest (added to `apps/merchant` in Task 1).

**Spec:** `docs/superpowers/specs/2026-09-08-public-link-builder-design.md`

## Global Constraints

Copied from `AGENTS.md` and the spec. Every task's requirements implicitly include this section.

- **No new runtime dependencies.** `vitest` (Task 1) is the only dependency this plan adds, and it is a devDependency already present in the workspace at `^2.1.9`. Nothing else — no QR library, no drag-and-drop library, no chart library.
- **TypeScript only. No `any`. No `.js`/`.jsx`.**
- **RTL is mandatory.** Logical Tailwind classes only: `ms- me- ps- pe- text-start text-end border-s border-e`. Never `ml- mr- pl- pr- text-left text-right border-l border-r`.
- **Colours come from the AGENTS.md palette or `--octo-*` tokens.** Brand blue `#0D6EFD`, success `#22C55E`, error `#EF4444`, warning `#F59E0B`. No invented hex values.
- **Shape:** cards `rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]`, card padding `px-[18px] py-[15px]`, buttons `rounded-[9px] px-3 py-[7px] text-[12px] font-medium`, gap between cards `gap-3`, page padding `px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5`.
- **Type scale:** page title 21px/700, card title 13px/600, body 12.5px/400, small 11.5px/400, label 10.5px uppercase tracking `0.06em`/600.
- **Every user-visible string is an i18n key present in BOTH `packages/i18n/src/locales/en/index.ts` and `.../ar/index.ts`.** The two dictionaries must have identical key sets — Task 1 adds the test that enforces this.
- **Components are defined at module scope**, never inside another component's render body.
- **Mock data lives in its own file** as typed `readonly` consts.
- **Verification gate for every task:** `cd apps/merchant && npx tsc --noEmit` prints nothing, and `npm test` (from `apps/merchant`) passes.
- **Do not run `git checkout`, `git reset`, or `git push`.** Commit at the end of each task, on the current branch.
- **Port 5173** may already be in use by another agent. Reuse it; never kill it.

### Files this plan owns in the shared set (AGENTS.md §7.1)

Explicitly authorised by the user. Touch only the lines named:

- `apps/merchant/src/app/routes/registry.tsx` — one route entry (Task 8)
- `apps/merchant/src/widgets/app-sidebar/index.tsx` — one nav group (Task 8)
- `apps/merchant/package.json` — vitest devDependency + `test` script (Task 1)
- `packages/i18n/src/locales/{en,ar}/index.ts` — new keys, additive only

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `apps/merchant/vitest.config.ts` | Test runner config, aliases mirroring tsconfig |
| `src/shared/i18n/keys.test.ts` | en/ar key-set parity guard |
| `src/shared/lib/brand-tokens.ts` | Pure brand/style helpers, moved out of onboarding |
| `src/shared/lib/storefront-assets.ts` | Storefront photo + theme thumbnail URLs, moved out of onboarding |
| `src/widgets/storefront-preview/model.ts` | `StorefrontPreviewModel` — the preview's only input type |
| `src/widgets/storefront-preview/index.tsx` | The preview itself, moved from onboarding |
| `src/widgets/storefront-preview/index.ts` | Public surface |
| `src/pages/onboarding/steps/public-link-model.ts` | `OnboardingDraft` → `StorefrontPreviewModel` |
| `src/pages/public-link/_shared/site-draft.ts` | `SiteDraft`, `EMPTY_SITE_DRAFT`, `siteDraftReducer` |
| `src/pages/public-link/_shared/site-draft-storage.ts` | `serializeDraft` / `parseDraft` — pure, testable |
| `src/pages/public-link/_shared/use-site-draft.ts` | React wrapper: reducer + debounced localStorage |
| `src/pages/public-link/_shared/theme-catalog.ts` | Six themes, filter chips, `styleId` per theme |
| `src/pages/public-link/_shared/page-catalog.ts` | The nine page modules |
| `src/pages/public-link/_shared/section-catalog.ts` | Homepage sections, icons, inspector kind, generic fields |
| `src/pages/public-link/_shared/preview-model.ts` | `SiteDraft` → `StorefrontPreviewModel` |
| `src/pages/public-link/_shared/checklist.ts` | Go-live predicates |
| `src/pages/public-link/_shared/steps.tsx` | `StepDef[]`, `StepProps` |
| `src/pages/public-link/_shared/builder-shell.tsx` | Header + autosave chip + rail + footer bar |
| `src/pages/public-link/index.tsx` | `PublicLinkBuilderPage` |
| `src/pages/public-link/ui/switch.tsx` | The toggle used across every step |
| `src/pages/public-link/ui/device-frame.tsx` | Device toggle + scaled preview frame |
| `src/pages/public-link/ui/nav-preview.tsx` | Dark drawer + web-nav previews |
| `src/pages/public-link/ui/qr-code.tsx` | Inline-SVG QR renderer |
| `src/pages/public-link/ui/qr-encode.ts` | Pure QR bit-matrix encoder |
| `src/pages/public-link/ui/reorder-list.tsx` | Drag + keyboard reorder, shared by steps 3, 4, 5 |
| `src/pages/public-link/steps/*.tsx` | One file per step |
| `src/pages/public-link/steps/customize/*.tsx` | Shared controls + five inspectors |

**Modified**

| File | Change |
|---|---|
| `apps/merchant/package.json` | vitest devDep + `test` script |
| `src/pages/onboarding/_shared/brand-catalog.ts` | Delete moved exports, re-export from `shared/lib/brand-tokens` |
| `src/pages/onboarding/_shared/assets.ts` | Delete moved exports, re-export from `shared/lib/storefront-assets` |
| `src/pages/onboarding/steps/public-link-step.tsx` | Render the widget through the new adapter |
| `src/app/routes/registry.tsx` | One route |
| `src/widgets/app-sidebar/index.tsx` | One nav group |
| `packages/i18n/src/locales/{en,ar}/index.ts` | New keys, per task |

**Deleted**

- `src/pages/onboarding/steps/public-link-preview.tsx` (moved to the widget)

---

# Phase 1 — Foundation

## Task 1: vitest in the merchant app

**Files:**
- Modify: `apps/merchant/package.json`
- Create: `apps/merchant/vitest.config.ts`
- Test: `apps/merchant/src/shared/i18n/keys.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` in `apps/merchant` runs `vitest run` over `src/**/*.test.ts`. Every later task's tests rely on this and on the `@/`, `@ui/`, `@i18n` aliases resolving inside tests.

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/shared/i18n/keys.test.ts`. This plan adds 200+ keys to two dictionaries by hand; this guard is what stops them drifting apart.

```ts
import { describe, expect, it } from "vitest";
import { ar, en } from "@i18n/index";

describe("merchant locale dictionaries", () => {
  it("define exactly the same keys", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it("leave no value empty in either language", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.${key}`).toBeTruthy();
    }
    for (const [key, value] of Object.entries(ar)) {
      expect(value, `ar.${key}`).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd apps/merchant && npm test
```

Expected: fails — `npm error Missing script: "test"`.

- [ ] **Step 3: Add the runner config**

Create `apps/merchant/vitest.config.ts`. The aliases mirror `apps/merchant/tsconfig.json`; without them the test cannot resolve `@i18n/index`.

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Aliases mirror tsconfig.json — tests resolve @/, @ui/ and @i18n the same
// way the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@i18n": fileURLToPath(new URL("../../packages/i18n/src", import.meta.url)),
      "@ui": fileURLToPath(new URL("../../packages/ui/src", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 4: Wire the script and the dependency**

In `apps/merchant/package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

and to `"devDependencies"` (keep the block alphabetical — it goes last, after `"vite"`):

```json
"vitest": "^2.1.9"
```

- [ ] **Step 5: Install**

```bash
cd /e/Octupus/octopus-frontend && npm install
```

This is the one install this plan authorises. `vitest@^2.1.9` already exists in the workspace via `apps/customer`, so the lockfile change is small.

- [ ] **Step 6: Run the test and watch it pass**

```bash
cd apps/merchant && npm test
```

Expected: 2 passing. If the parity test fails, the dictionaries were already out of sync before this plan started — report that rather than "fixing" it by deleting keys.

- [ ] **Step 7: Typecheck**

```bash
cd apps/merchant && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add apps/merchant/package.json apps/merchant/vitest.config.ts apps/merchant/src/shared/i18n/keys.test.ts package-lock.json
git commit -m "Give the merchant app a test runner and a locale parity guard"
```

---

## Task 2: Lift the brand tokens and storefront assets into shared/lib

The preview widget cannot import from `pages/` — Feature-Sliced Design forbids it. The pure helpers it needs move down first. Sixteen files import from `brand-catalog.ts` and `assets.ts`; **none of them are edited**, because both files re-export what moved.

**Files:**
- Create: `apps/merchant/src/shared/lib/brand-tokens.ts`
- Create: `apps/merchant/src/shared/lib/storefront-assets.ts`
- Modify: `apps/merchant/src/pages/onboarding/_shared/brand-catalog.ts`
- Modify: `apps/merchant/src/pages/onboarding/_shared/assets.ts`
- Test: `apps/merchant/src/shared/lib/brand-tokens.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `shared/lib/brand-tokens.ts` exports `Palette`, `PALETTES`, `ThemeTemplate`, `THEME_TEMPLATES`, `readableOn(hex: string): string`, `FontChoice`, `FONTS`, `fontStack(id: string, locale: string): string`, `StyleTokens`, `styleTokens(id: string | null): StyleTokens`
  - `shared/lib/storefront-assets.ts` exports `storefrontAsset(file: string): string`, `themeThumb(id: string): string | null`

> **The trap in this task:** both source files build URLs with `new URL("../../../../../assets/…", import.meta.url)`. That `../` count is relative to `src/pages/onboarding/_shared/`. The new home is `src/shared/lib/`, which is **one level shallower**, so every path loses exactly one `../`:
> `../../../../../assets/` → `../../../../assets/`, and
> `../../../../../customer/public/images/storefront/` → `../../../../customer/public/images/storefront/`.
> Get this wrong and the images silently 404 with no console error at build time.

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/shared/lib/brand-tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FONTS, PALETTES, THEME_TEMPLATES, fontStack, readableOn, styleTokens } from "./brand-tokens";
import { storefrontAsset, themeThumb } from "./storefront-assets";

describe("readableOn", () => {
  it("puts dark ink on a light brand colour and light ink on a dark one", () => {
    expect(readableOn("#FFFFFF")).toBe("#1D1D1D");
    expect(readableOn("#0D6EFD")).toBe("#FFFFFF");
  });

  it("falls back to dark ink for anything that is not a six-digit hex", () => {
    expect(readableOn("")).toBe("#1D1D1D");
    expect(readableOn("nonsense")).toBe("#1D1D1D");
  });
});

describe("fontStack", () => {
  it("honours the merchant's choice when it carries Arabic glyphs", () => {
    expect(fontStack("readex", "ar")).toBe("var(--font-arabic)");
  });

  it("swaps a Latin-only face for the Arabic face rather than showing tofu", () => {
    expect(fontStack("georgia", "ar")).toBe("var(--font-arabic)");
    expect(fontStack("georgia", "en")).toContain("Georgia");
  });

  it("falls back to the first face for an unknown id", () => {
    expect(fontStack("does-not-exist", "en")).toBe(FONTS[0].stack);
  });
});

describe("styleTokens", () => {
  it("gives elegant its uppercase, tight-radius treatment", () => {
    expect(styleTokens("elegant")).toMatchObject({ radius: "2px", headingTransform: "uppercase" });
  });

  it("falls back to the modern treatment for null and unknown ids", () => {
    expect(styleTokens(null)).toEqual(styleTokens("anything-else"));
  });
});

describe("catalogs", () => {
  it("keeps the palettes and theme templates the app already ships", () => {
    expect(PALETTES.map((p) => p.id)).toEqual(["crimson", "ocean", "amber", "graphite"]);
    expect(THEME_TEMPLATES.map((t) => t.id)).toEqual(["elegant", "modern", "warm"]);
  });
});

describe("asset urls", () => {
  it("points storefront photography at the customer app's public folder", () => {
    expect(storefrontAsset("all.png")).toContain("/customer/public/images/storefront/all.png");
  });

  it("has a real thumbnail for elegant and null for the rest", () => {
    expect(themeThumb("elegant")).toContain("onboarding-Themes");
    expect(themeThumb("modern")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd apps/merchant && npm test -- brand-tokens
```

Expected: FAIL — `Failed to resolve import "./brand-tokens"`.

- [ ] **Step 3: Create `shared/lib/storefront-assets.ts`**

```ts
// Image URLs for anything that depicts the customer-facing storefront.
//
// Lives in shared/ rather than inside onboarding because two hosts now draw
// that page: onboarding step 8 and the Public Link Builder. A widget may not
// import from pages/, so the paths had to come down here.
//
// Paths are relative to THIS file: four levels up lands on `apps/`.

function url(path: string): string {
  return new URL(`../../../../assets/${path}`, import.meta.url).href;
}

/** `apps/customer/public/images/storefront/<file>` — the photography the
 *  customer storefront actually ships. Two copies would be seven megabytes of
 *  duplicated pictures that drift apart the first time one side is re-shot. */
export function storefrontAsset(file: string): string {
  return new URL(`../../../../customer/public/images/storefront/${file}`, import.meta.url).href;
}

// Only one real theme thumbnail exists. `elegant` uses it; the others fall
// back to a gradient built from the merchant's own palette. Returning null is
// how a component learns to render that gradient instead of an <img>.
export function themeThumb(id: string): string | null {
  return id === "elegant" ? url("onboarding-Themes/Brand Theme.png") : null;
}
```

- [ ] **Step 4: Create `shared/lib/brand-tokens.ts`**

Move `Palette`, `PALETTES`, `ThemeTemplate`, `THEME_TEMPLATES`, `readableOn`, `FontChoice`, `FONTS`, `fontStack`, `StyleTokens` and `styleTokens` out of `pages/onboarding/_shared/brand-catalog.ts` **verbatim, comments included** — they are currently lines 113–223 of that file. Do not rewrite them; this is a move, and any behaviour change here changes onboarding step 8.

Head the new file with:

```ts
// What a merchant's brand choices mean in CSS: palette swatches, theme
// templates, typefaces, and the per-theme style tokens a storefront is drawn
// with. Pure functions over plain values — no React, no draft types — so both
// the onboarding wizard and the Public Link Builder can reach them, and so the
// storefront-preview widget can too without importing from pages/.
```

- [ ] **Step 5: Re-export from the onboarding files**

In `pages/onboarding/_shared/brand-catalog.ts`, delete lines 113–223 and put in their place:

```ts
// Moved to shared/lib/brand-tokens.ts so the storefront-preview widget can
// reach them without importing from pages/. Re-exported here because sixteen
// files already import them from this module.
export * from "@/shared/lib/brand-tokens";
```

In `pages/onboarding/_shared/assets.ts`, delete the `storefrontAsset` and `themeThumb` definitions and put in their place:

```ts
// Moved to shared/lib/storefront-assets.ts — see the note there.
export * from "@/shared/lib/storefront-assets";
```

Leave everything else in both files exactly as it is.

- [ ] **Step 6: Run the tests and the typecheck**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
```

Expected: all tests pass, typecheck silent. A `TS2308` duplicate-export error means a definition was left behind in the old file as well as moved — delete the old one.

- [ ] **Step 7: Verify the images still resolve**

Start the dev server if 5173 is free (`cd apps/merchant && npm run dev`), open `/signup`, walk to step 8, and confirm the storefront photographs and the elegant theme thumbnail render. A broken `new URL` depth shows as blank tiles, not an error.

- [ ] **Step 8: Commit**

```bash
git add apps/merchant/src/shared/lib apps/merchant/src/pages/onboarding/_shared
git commit -m "Move the brand tokens and storefront asset paths into shared/lib"
```

---

## Task 3: The storefront preview widget

**Files:**
- Create: `apps/merchant/src/widgets/storefront-preview/model.ts`
- Create: `apps/merchant/src/widgets/storefront-preview/index.tsx`
- Create: `apps/merchant/src/widgets/storefront-preview/index.ts`
- Create: `apps/merchant/src/pages/onboarding/steps/public-link-model.ts`
- Modify: `apps/merchant/src/pages/onboarding/steps/public-link-step.tsx`
- Delete: `apps/merchant/src/pages/onboarding/steps/public-link-preview.tsx`
- Test: `apps/merchant/src/pages/onboarding/steps/public-link-model.test.ts`

**Interfaces:**
- Consumes: `shared/lib/brand-tokens`, `shared/lib/storefront-assets` (Task 2)
- Produces:
  - `StorefrontPreviewModel` (exact shape below) — Task 7's adapter targets this type
  - `<StorefrontPreview model={…} />`
  - `previewModelFromOnboarding(draft: OnboardingDraft, device: PreviewDevice, t: (k: string) => string, locale: string): StorefrontPreviewModel`

- [ ] **Step 1: Write the model type**

Create `apps/merchant/src/widgets/storefront-preview/model.ts`:

```ts
// The only thing the preview knows about. Deliberately not a draft: two very
// different drafts feed this widget, and resolving city names, opening hours
// and prices in each host's adapter is what keeps their types out of here.
export type PreviewDevice = "desktop" | "tablet" | "mobile";

export interface PreviewNavItem {
  labelKey: string;
  visible: boolean;
}

export interface PreviewHero {
  headline?: string;
  sub?: string;
  primaryCta?: string;
  secondaryCta?: string;
  imageUrl?: string;
}

export interface StorefrontPreviewModel {
  businessName: string;
  logoDataUrl: string | null;
  /** Already rendered, e.g. "ocean-table.octopus.app". */
  url: string;
  primary: string;
  secondary: string;
  /** A FONTS id from shared/lib/brand-tokens. */
  font: string;
  /** A THEME_TEMPLATES id, or null for the default treatment. */
  themeTemplate: string | null;
  /** Section ids in display order. Hidden sections are absent, not flagged. */
  sections: readonly string[];
  navItems: readonly PreviewNavItem[];
  /** i18n keys for the category mosaic tiles. */
  categories: readonly string[];
  /** Already translated. */
  cityLabel: string;
  /** Already summarised, e.g. "Daily 11:00 AM – 12:00 AM". */
  hoursSummary: string;
  /** Already formatted sample price, e.g. "SAR 153.00". */
  samplePrice: string;
  /** Already formatted struck-through price. */
  sampleWasPrice: string;
  hero: PreviewHero;
  device: PreviewDevice;
}
```

- [ ] **Step 2: Move the preview component**

`git mv` the file, then adapt it:

```bash
cd /e/Octupus/octopus-frontend
mkdir -p apps/merchant/src/widgets/storefront-preview
git mv apps/merchant/src/pages/onboarding/steps/public-link-preview.tsx \
       apps/merchant/src/widgets/storefront-preview/index.tsx
```

Then in the moved file:
- Rename the component `PublicLinkPreview` → `StorefrontPreview`.
- Replace the props `{ draft, mobile }` with `{ model }: { model: StorefrontPreviewModel }`.
- Replace every `draft.brand.*` / `draft.publicLink.*` read with the corresponding `model.*` field.
- Replace `mobile` with `model.device === "mobile"`; treat `"tablet"` as the desktop layout at a narrower width.
- Change the imports: `../_shared/assets` → `@/shared/lib/storefront-assets`, `../_shared/brand-catalog` → `@/shared/lib/brand-tokens`.
- Delete the imports of `serviceCategoriesFor`, `formatBrandPrice`, `summarizeHours`, `CITIES`, `dnsLabel` and `OnboardingDraft` — every value they produced now arrives on `model`.
- Keep `sectionLabelKey`'s behaviour by inlining it: the widget must not import from `pages/`. Move the `SECTION_LABELS` map and `sectionLabelKey` into `model.ts` and import from there; then update `pages/onboarding/steps/public-link-sections.tsx` to import `sectionLabelKey` from `@/widgets/storefront-preview` instead of defining it (leave `SECTION_IDS` where it is — it is onboarding's own list).
- Keep every existing comment. They explain why nothing in the preview is operable; that reasoning did not change.

Add `apps/merchant/src/widgets/storefront-preview/index.ts`:

```ts
export * from "./index.tsx";
export * from "./model";
```

- [ ] **Step 3: Write the failing adapter test**

Create `apps/merchant/src/pages/onboarding/steps/public-link-model.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EMPTY_DRAFT } from "../_shared/draft";
import { previewModelFromOnboarding } from "./public-link-model";

const t = (key: string) => key;

describe("previewModelFromOnboarding", () => {
  it("renders the tag as a hostname", () => {
    const model = previewModelFromOnboarding(EMPTY_DRAFT, "desktop", t, "en");
    expect(model.url).toBe("restaurant.octopus.app");
  });

  it("falls back to a placeholder hostname when the tag is empty", () => {
    const draft = { ...EMPTY_DRAFT, publicLink: { ...EMPTY_DRAFT.publicLink, tag: "" } };
    expect(previewModelFromOnboarding(draft, "desktop", t, "en").url).toBe("restaurant.octopus.app");
  });

  it("carries the merchant's section order through unchanged", () => {
    const draft = { ...EMPTY_DRAFT, publicLink: { ...EMPTY_DRAFT.publicLink, sections: ["offers", "hero"] } };
    expect(previewModelFromOnboarding(draft, "desktop", t, "en").sections).toEqual(["offers", "hero"]);
  });

  it("uses the translated business-name placeholder when the merchant has not typed one", () => {
    expect(previewModelFromOnboarding(EMPTY_DRAFT, "desktop", t, "en").businessName)
      .toBe("onboarding.businessName");
  });

  it("passes the device through", () => {
    expect(previewModelFromOnboarding(EMPTY_DRAFT, "mobile", t, "en").device).toBe("mobile");
  });
});
```

- [ ] **Step 4: Run it and watch it fail**

```bash
cd apps/merchant && npm test -- public-link-model
```

Expected: FAIL — cannot resolve `./public-link-model`.

- [ ] **Step 5: Write the adapter**

Create `apps/merchant/src/pages/onboarding/steps/public-link-model.ts`. Every value the old component computed inline moves here:

```ts
// OnboardingDraft -> StorefrontPreviewModel. The preview widget takes resolved
// values, so everything that needs a translator, a locale or an onboarding
// type — the city name, the opening-hours sentence, the sample prices, the
// seeded category list — is worked out here rather than inside the widget.
import type { StorefrontPreviewModel, PreviewDevice } from "@/widgets/storefront-preview";
import { CITIES, summarizeHours } from "../_shared/brand-catalog";
import { serviceCategoriesFor } from "../_shared/ai-insights";
import { formatBrandPrice } from "../_shared/pricing";
import { dnsLabel } from "./public-link-tag";
import type { OnboardingDraft } from "../_shared/draft";

export function previewModelFromOnboarding(
  draft: OnboardingDraft,
  device: PreviewDevice,
  t: (key: string) => string,
  locale: string
): StorefrontPreviewModel {
  const { brand, publicLink } = draft;
  const city = CITIES.find((c) => c.id === brand.city);

  return {
    businessName: brand.businessName || t("onboarding.businessName"),
    logoDataUrl: brand.logoDataUrl,
    url: `${dnsLabel(publicLink.tag) || "restaurant"}.octopus.app`,
    primary: brand.primary,
    secondary: brand.secondary,
    font: brand.font,
    themeTemplate: brand.themeTemplate,
    sections: publicLink.sections,
    navItems: publicLink.sections.map((id) => ({ labelKey: id, visible: true })),
    categories: serviceCategoriesFor(draft.type),
    cityLabel: city ? t(city.labelKey) : "",
    hoursSummary: summarizeHours(brand.hours, t, locale),
    samplePrice: formatBrandPrice(153, brand.currency, locale),
    sampleWasPrice: formatBrandPrice(170, brand.currency, locale),
    hero: {},
    device,
  };
}
```

If `summarizeHours` or `formatBrandPrice` take a different argument list, match theirs — read the signatures in `_shared/brand-catalog.ts` and `_shared/pricing.ts` rather than assuming these.

- [ ] **Step 6: Point the step at the widget**

In `pages/onboarding/steps/public-link-step.tsx`, replace the `PublicLinkPreview` import and usage:

```tsx
import { StorefrontPreview } from "@/widgets/storefront-preview";
import { previewModelFromOnboarding } from "./public-link-model";
```

and inside the component:

```tsx
const model = previewModelFromOnboarding(draft, view === "mobile" ? "mobile" : "desktop", t, locale);
```

with `const { t, locale } = useI18n();`, rendering `<StorefrontPreview model={model} />`. Nothing else in that file changes.

- [ ] **Step 7: Run tests and typecheck**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
```

Expected: all pass, typecheck silent.

- [ ] **Step 8: Prove onboarding step 8 is unchanged**

Screenshot `/signup` step 8 in EN and AR and compare against the frame. This is a pure move; any visual difference is a regression introduced in step 2 of this task.

- [ ] **Step 9: Commit**

```bash
git add apps/merchant/src/widgets/storefront-preview apps/merchant/src/pages/onboarding/steps
git commit -m "Lift the storefront preview into a widget both hosts can feed"
```

---

## Task 4: The SiteDraft model and reducer

**Files:**
- Create: `apps/merchant/src/pages/public-link/_shared/site-draft.ts`
- Test: `apps/merchant/src/pages/public-link/_shared/site-draft.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `SiteDraft`, `PageEntry`, `SectionEntry`, `HeroSettings`, `ReservationSettings`, `WaitlistSettings`, `MenuSettings`, `OffersSettings`, `SimResult`, `Tester`, `SiteAction`, `EMPTY_SITE_DRAFT`, `siteDraftReducer(state, action)`, `STEP_COUNT = 7`. Every later task dispatches through `SiteAction`.

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/pages/public-link/_shared/site-draft.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EMPTY_SITE_DRAFT, STEP_COUNT, siteDraftReducer, type SiteDraft } from "./site-draft";

function run(draft: SiteDraft, ...actions: Parameters<typeof siteDraftReducer>[1][]): SiteDraft {
  return actions.reduce(siteDraftReducer, draft);
}

describe("step movement", () => {
  it("walks forward and back", () => {
    expect(run(EMPTY_SITE_DRAFT, { type: "next" }).step).toBe(2);
    expect(run(EMPTY_SITE_DRAFT, { type: "next" }, { type: "back" }).step).toBe(1);
  });

  it("does not walk off either end", () => {
    expect(run(EMPTY_SITE_DRAFT, { type: "back" }).step).toBe(1);
    const last = run(EMPTY_SITE_DRAFT, { type: "goTo", step: STEP_COUNT }, { type: "next" });
    expect(last.step).toBe(STEP_COUNT);
  });
});

describe("brand patches", () => {
  it("merges colours without dropping the others", () => {
    const next = run(EMPTY_SITE_DRAFT, { type: "patchColors", patch: { primary: "#123456" } });
    expect(next.brand.colors.primary).toBe("#123456");
    expect(next.brand.colors.dark).toBe(EMPTY_SITE_DRAFT.brand.colors.dark);
  });

  it("keeps English and Arabic typography independent", () => {
    const next = run(EMPTY_SITE_DRAFT, { type: "patchTypography", locale: "ar", patch: { titles: "readex" } });
    expect(next.brand.typography.ar.titles).toBe("readex");
    expect(next.brand.typography.en.titles).toBe(EMPTY_SITE_DRAFT.brand.typography.en.titles);
  });
});

describe("pages", () => {
  it("flips one flag on one page and leaves its neighbours alone", () => {
    const id = EMPTY_SITE_DRAFT.pages[1].id;
    const next = run(EMPTY_SITE_DRAFT, { type: "togglePageFlag", id, flag: "onHome" });
    expect(next.pages[1].onHome).toBe(!EMPTY_SITE_DRAFT.pages[1].onHome);
    expect(next.pages[0]).toEqual(EMPTY_SITE_DRAFT.pages[0]);
  });

  it("reorders by replacing the list", () => {
    const reversed = [...EMPTY_SITE_DRAFT.pages].reverse();
    expect(run(EMPTY_SITE_DRAFT, { type: "setPages", pages: reversed }).pages[0].id)
      .toBe(reversed[0].id);
  });
});

describe("navigation visibility", () => {
  it("hides and unhides a page without touching the page list", () => {
    const id = EMPTY_SITE_DRAFT.pages[0].id;
    const hidden = run(EMPTY_SITE_DRAFT, { type: "toggleNavHidden", id });
    expect(hidden.navigation.hidden).toContain(id);
    expect(hidden.pages).toEqual(EMPTY_SITE_DRAFT.pages);
    expect(run(hidden, { type: "toggleNavHidden", id }).navigation.hidden).not.toContain(id);
  });
});

describe("sections", () => {
  it("toggles one section's enabled flag", () => {
    const id = EMPTY_SITE_DRAFT.sections[0].id;
    expect(run(EMPTY_SITE_DRAFT, { type: "toggleSection", id }).sections[0].enabled)
      .toBe(!EMPTY_SITE_DRAFT.sections[0].enabled);
  });

  it("patches one inspector's settings without disturbing the others", () => {
    const next = run(EMPTY_SITE_DRAFT, { type: "patchSection", section: "hero", patch: { heading: "Hello" } });
    expect(next.sectionSettings.hero.heading).toBe("Hello");
    expect(next.sectionSettings.offers).toEqual(EMPTY_SITE_DRAFT.sectionSettings.offers);
  });

  it("selects a section for the inspector", () => {
    expect(run(EMPTY_SITE_DRAFT, { type: "selectSection", id: "offers" }).selectedSection).toBe("offers");
  });
});

describe("publish", () => {
  it("records SEO copy", () => {
    const next = run(EMPTY_SITE_DRAFT, { type: "patchPublish", patch: { seo: { ...EMPTY_SITE_DRAFT.publish.seo, title: "Ocean Table" } } });
    expect(next.publish.seo.title).toBe("Ocean Table");
  });
});

describe("immutability", () => {
  it("never mutates the draft it was given", () => {
    const before = JSON.stringify(EMPTY_SITE_DRAFT);
    run(EMPTY_SITE_DRAFT, { type: "next" }, { type: "toggleSection", id: EMPTY_SITE_DRAFT.sections[0].id });
    expect(JSON.stringify(EMPTY_SITE_DRAFT)).toBe(before);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd apps/merchant && npm test -- site-draft
```

Expected: FAIL — cannot resolve `./site-draft`.

- [ ] **Step 3: Write the model**

Create `apps/merchant/src/pages/public-link/_shared/site-draft.ts`. Head it with the reasoning, then the types exactly as the spec's "State model" section defines them, then `EMPTY_SITE_DRAFT`, then the reducer.

```ts
// The whole builder in one value. Seven steps of answers as a single reducer,
// the same shape onboarding's draft.ts uses, so the page stays an orchestrator
// rather than a bag of useState hooks.
//
// This model is deliberately NOT onboarding's `publicLink: { tag, sections }`.
// That field describes a preview with a reorderable list; this one describes a
// site a merchant owns — theme, brand, pages, navigation, per-module section
// settings, a rehearsal run and a publish record. Sharing one type would have
// meant every onboarding draft carrying seven steps of settings it never sets.

export const STEP_COUNT = 7;

export interface PageEntry {
  id: string;
  inNav: boolean;
  onHome: boolean;
}

export interface SectionEntry {
  id: string;
  enabled: boolean;
}

export type HeroBackground = "image" | "video" | "slider";

export interface HeroSettings {
  background: HeroBackground;
  imageDataUrl: string | null;
  heading: string;
  subheading: string;
  primaryCta: string;
  primaryTarget: string;
  secondaryCta: string;
  secondaryTarget: string;
}

export interface ReservationSettings {
  enabled: boolean;
  homepageDisplay: "widget" | "button";
  primaryAction: string;
  availabilityPreview: boolean;
  nextAvailableLabel: string;
  dateRange: string;
  bookingWindow: string;
  cutOff: string;
  minParty: string;
  maxParty: string;
  tableHold: string;
  autoConfirm: boolean;
  deposit: boolean;
}

export interface WaitlistSettings {
  enabled: boolean;
  homepageDisplay: "widget" | "button";
  primaryAction: string;
  availabilityPreview: boolean;
  nextAvailableLabel: string;
  format: string;
  queueMethod: "fifo" | "priority";
  minParty: string;
  maxParty: string;
  showWaitTime: boolean;
  updateInterval: string;
  notifyWhatsapp: boolean;
  notifySms: boolean;
  notifyEmail: boolean;
  autoRemove: string;
}

export interface MenuSettings {
  connectedMenuId: string;
  /** Multi-select: highlighted, categories, preview, full. */
  homepageDisplay: readonly string[];
  primaryAction: "menuPage" | "menuDrawer" | "ordering";
  orderingMode: "ordering" | "reservation" | "view";
  minOrder: string;
  orderAhead: boolean;
  prepTime: string;
  serviceAreas: string;
  taxDisplay: string;
}

export interface OffersSettings {
  displayStyle: string;
  filterCategories: boolean;
  sortOrder: string;
  ctaButton: string;
  visibility: string;
}

/** Settings for a section with no inspector of its own — see section-catalog. */
export interface GenericSettings {
  [fieldId: string]: string | boolean;
}

export interface SimResult {
  stepId: string;
  status: "success" | "failed";
  seconds: number;
  detailKey: string;
}

export interface Tester {
  email: string;
  roleKey: string;
  canView: boolean;
  tested: boolean;
}

export interface SiteDraft {
  step: number;
  theme: { id: string; filter: string };
  brand: {
    businessName: string;
    logoDataUrl: string | null;
    colors: { primary: string; light: string; accent: string; dark: string };
    typography: {
      en: { titles: string; body: string };
      ar: { titles: string; body: string };
    };
    faviconDataUrl: string | null;
    heroPatternDataUrl: string | null;
  };
  pages: readonly PageEntry[];
  navigation: {
    showInHeader: boolean;
    showInDrawer: boolean;
    stickyHeader: boolean;
    activeIndicator: boolean;
    showIcons: boolean;
    sameTab: boolean;
    hidden: readonly string[];
  };
  sections: readonly SectionEntry[];
  selectedSection: string;
  sectionSettings: {
    hero: HeroSettings;
    reservations: ReservationSettings;
    waitlist: WaitlistSettings;
    menu: MenuSettings;
    offers: OffersSettings;
    generic: Record<string, GenericSettings>;
  };
  preview: {
    testMode: boolean;
    simulation: "idle" | "running" | "done";
    completed: number;
    results: readonly SimResult[] | null;
    testers: readonly Tester[];
  };
  publish: {
    seo: { title: string; description: string; socialImageDataUrl: string | null };
    customDomain: { host: string; connected: boolean; ssl: boolean };
    published: boolean;
  };
  savedAt: number | null;
}
```

`EMPTY_SITE_DRAFT` seeds the state the frames show on a first visit: `step: 1`, `theme: { id: "elegant", filter: "all" }`, all four colours `"#08589D"`, every typography slot `"inter"`, `pages` built from `PAGE_IDS` in Task 5 order with `inNav`/`onHome` true except `events` (both false), `sections` from `SECTION_IDS` **minus `waitlist`** (which the frames show only once the merchant swaps it in for `reservationsCta`), with everything enabled except `events`, `selectedSection: "hero"`, `navigation` with all six booleans true and `hidden: []`, empty strings for every text field, `preview.testMode: true` with `simulation: "idle"` and `completed: 0`, `publish.customDomain: { host: "", connected: false, ssl: false }`, and `savedAt: null`.

> Task 5 defines `PAGE_IDS` and `SECTION_IDS`. Write this task's `EMPTY_SITE_DRAFT` against the literal id lists given there — the two tasks must agree, and Task 5's test asserts they do.

The action union and reducer follow onboarding's `draftReducer` exactly in style — a `switch` with one `return { ...state, … }` per case, no mutation, no fallthrough:

```ts
export type SiteAction =
  | { type: "goTo"; step: number }
  | { type: "next" }
  | { type: "back" }
  | { type: "patchTheme"; patch: Partial<SiteDraft["theme"]> }
  | { type: "patchBrand"; patch: Partial<Omit<SiteDraft["brand"], "colors" | "typography">> }
  | { type: "patchColors"; patch: Partial<SiteDraft["brand"]["colors"]> }
  | { type: "patchTypography"; locale: "en" | "ar"; patch: Partial<{ titles: string; body: string }> }
  | { type: "setPages"; pages: readonly PageEntry[] }
  | { type: "togglePageFlag"; id: string; flag: "inNav" | "onHome" }
  | { type: "patchNavigation"; patch: Partial<Omit<SiteDraft["navigation"], "hidden">> }
  | { type: "toggleNavHidden"; id: string }
  | { type: "setSections"; sections: readonly SectionEntry[] }
  | { type: "toggleSection"; id: string }
  | { type: "selectSection"; id: string }
  | { type: "patchSection"; section: "hero"; patch: Partial<HeroSettings> }
  | { type: "patchSection"; section: "reservations"; patch: Partial<ReservationSettings> }
  | { type: "patchSection"; section: "waitlist"; patch: Partial<WaitlistSettings> }
  | { type: "patchSection"; section: "menu"; patch: Partial<MenuSettings> }
  | { type: "patchSection"; section: "offers"; patch: Partial<OffersSettings> }
  | { type: "patchGeneric"; id: string; patch: GenericSettings }
  | { type: "patchPreview"; patch: Partial<SiteDraft["preview"]> }
  | { type: "patchPublish"; patch: Partial<SiteDraft["publish"]> };
```

`goTo`, `next` and `back` all clamp into `1..STEP_COUNT`. Clamp inside the reducer, not at the call site — the spec's rail and the footer button both dispatch these, and an out-of-range value that only display code hides makes Back a silent no-op.

- [ ] **Step 4: Run the tests and watch them pass**

```bash
cd apps/merchant && npm test -- site-draft && npx tsc --noEmit
```

Expected: all green, typecheck silent.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/pages/public-link/_shared
git commit -m "Model the Public Link Builder draft as one reducer"
```

---

## Task 5: The three catalogs

**Files:**
- Create: `apps/merchant/src/pages/public-link/_shared/theme-catalog.ts`
- Create: `apps/merchant/src/pages/public-link/_shared/page-catalog.ts`
- Create: `apps/merchant/src/pages/public-link/_shared/section-catalog.ts`
- Test: `apps/merchant/src/pages/public-link/_shared/catalogs.test.ts`

**Interfaces:**
- Consumes: `EMPTY_SITE_DRAFT` (Task 4), `THEME_TEMPLATES`, `themeThumb` (Task 2)
- Produces:
  - `THEME_FILTERS: readonly { id: string; labelKey: string }[]`, `SITE_THEMES: readonly SiteTheme[]` where `SiteTheme = { id; nameKey; descKey; styleId; filters: readonly string[]; recommended?: boolean }`
  - `PAGE_IDS: readonly string[]`, `PAGE_MODULES: readonly PageModule[]` where `PageModule = { id; labelKey; icon: LucideIcon; customizable: boolean }`
  - `SECTION_IDS: readonly string[]`, `SITE_SECTIONS: readonly SiteSection[]` where `SiteSection = { id; labelKey; icon: LucideIcon; inspector: InspectorKind; fields?: readonly GenericField[] }`, `InspectorKind = "hero" | "reservations" | "waitlist" | "menu" | "offers" | "generic"`

The nine page modules, in frame order: `home`, `menu`, `reservations`, `waitlist`, `offers`, `events`, `loyalty`, `about`, `contact`. Icons: `Home`, `BookOpen`, `CalendarClock`, `ClipboardList`, `BadgePercent`, `CalendarCheck`, `HeartHandshake`, `Info`, `Phone`. `events` is the only one that is not customizable in the frames (its row shows `-`).

The homepage sections, in frame order: `hero`, `reservations`, `menu`, `reservationsCta`, `offers`, `events`, `testimonials`, `instagram`. `waitlist` is a section too — the frames show it replacing `reservationsCta` in the list once the waitlist module is selected, so it is in `SITE_SECTIONS` but not in `EMPTY_SITE_DRAFT.sections`. Inspector kinds: `hero`→`hero`, `reservations`→`reservations`, `waitlist`→`waitlist`, `menu`→`menu`, `offers`→`offers`, everything else →`generic`.

The six themes all map onto the three style ids the token function knows: `elegant`→`elegant`, `modernGrid`→`modern`, `minimalMono`→`modern`, `cafeWarm`→`warm`, `casualBright`→`warm`, `luxeNoir`→`elegant`. Filters: `all` plus `elegant`, `modern`, `minimal`, `cafe`, `casual`, `luxury`.

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/pages/public-link/_shared/catalogs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { styleTokens } from "@/shared/lib/brand-tokens";
import { EMPTY_SITE_DRAFT } from "./site-draft";
import { SITE_THEMES, THEME_FILTERS } from "./theme-catalog";
import { PAGE_IDS, PAGE_MODULES } from "./page-catalog";
import { SECTION_IDS, SITE_SECTIONS } from "./section-catalog";

describe("theme catalog", () => {
  it("offers the six themes the frames show", () => {
    expect(SITE_THEMES).toHaveLength(6);
  });

  it("recommends exactly one theme", () => {
    expect(SITE_THEMES.filter((theme) => theme.recommended)).toHaveLength(1);
  });

  it("maps every theme onto a style the token function actually distinguishes", () => {
    const fallback = styleTokens(null);
    for (const theme of SITE_THEMES) {
      expect(["elegant", "modern", "warm"], theme.id).toContain(theme.styleId);
      if (theme.styleId !== "modern") {
        expect(styleTokens(theme.styleId), theme.id).not.toEqual(fallback);
      }
    }
  });

  it("gives every theme at least one filter, and every filter at least one theme", () => {
    for (const theme of SITE_THEMES) expect(theme.filters.length, theme.id).toBeGreaterThan(0);
    for (const filter of THEME_FILTERS) {
      if (filter.id === "all") continue;
      expect(SITE_THEMES.some((t) => t.filters.includes(filter.id)), filter.id).toBe(true);
    }
  });

  it("starts the draft on a theme that exists", () => {
    expect(SITE_THEMES.some((t) => t.id === EMPTY_SITE_DRAFT.theme.id)).toBe(true);
  });
});

describe("page catalog", () => {
  it("lists nine page modules", () => {
    expect(PAGE_MODULES).toHaveLength(9);
    expect(PAGE_IDS).toEqual(PAGE_MODULES.map((p) => p.id));
  });

  it("seeds the draft with exactly those pages, in the same order", () => {
    expect(EMPTY_SITE_DRAFT.pages.map((p) => p.id)).toEqual([...PAGE_IDS]);
  });

  it("has no duplicate ids", () => {
    expect(new Set(PAGE_IDS).size).toBe(PAGE_IDS.length);
  });
});

describe("section catalog", () => {
  it("seeds the draft only with sections the catalog knows", () => {
    for (const entry of EMPTY_SITE_DRAFT.sections) {
      expect(SECTION_IDS, entry.id).toContain(entry.id);
    }
  });

  it("opens on a section that exists", () => {
    expect(SECTION_IDS).toContain(EMPTY_SITE_DRAFT.selectedSection);
  });

  it("gives every generic section the fields its panel will render", () => {
    for (const section of SITE_SECTIONS) {
      if (section.inspector !== "generic") continue;
      expect(section.fields?.length, section.id).toBeGreaterThan(0);
    }
  });

  it("uses each module inspector exactly once", () => {
    for (const kind of ["hero", "reservations", "waitlist", "menu", "offers"] as const) {
      expect(SITE_SECTIONS.filter((s) => s.inspector === kind), kind).toHaveLength(1);
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd apps/merchant && npm test -- catalogs
```

Expected: FAIL — cannot resolve `./theme-catalog`.

- [ ] **Step 3: Write the three catalogs**

Each is a typed `readonly` const list with a short comment saying what the frames show. A generic section's `fields` entry looks like:

```ts
export type GenericField =
  | { id: string; kind: "select"; labelKey: string; optionKeys: readonly string[] }
  | { id: string; kind: "toggle"; labelKey: string };
```

Offers Banner's own inspector is a hand-written file (Task 18) because the frames give it a specific five-field layout; `testimonials`, `instagram`, `events` and `reservationsCta` each declare two to four `GenericField`s here instead.

- [ ] **Step 4: Run the tests and watch them pass**

```bash
cd apps/merchant && npm test -- catalogs && npx tsc --noEmit
```

If the "seeds the draft with exactly those pages" test fails, fix `EMPTY_SITE_DRAFT` in `site-draft.ts` — the catalog is the source of truth for ids and order.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/pages/public-link/_shared
git commit -m "Catalogue the builder's themes, page modules and homepage sections"
```

---

## Task 6: Draft persistence

**Files:**
- Create: `apps/merchant/src/pages/public-link/_shared/site-draft-storage.ts`
- Create: `apps/merchant/src/pages/public-link/_shared/use-site-draft.ts`
- Test: `apps/merchant/src/pages/public-link/_shared/site-draft-storage.test.ts`

**Interfaces:**
- Consumes: `SiteDraft`, `EMPTY_SITE_DRAFT`, `siteDraftReducer`, `STEP_COUNT` (Task 4)
- Produces:
  - `DRAFT_KEY = "octo.site-draft"`, `DRAFT_VERSION = 1`
  - `serializeDraft(draft: SiteDraft): string`
  - `parseDraft(raw: string | null): SiteDraft | null`
  - `useSiteDraft(): { draft: SiteDraft; dispatch: (action: SiteAction) => void; save: () => void }`

The codec is a separate file from the hook so it can be tested under vitest's `node` environment, where `localStorage` does not exist.

- [ ] **Step 1: Write the failing test**

Create `apps/merchant/src/pages/public-link/_shared/site-draft-storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EMPTY_SITE_DRAFT, STEP_COUNT } from "./site-draft";
import { DRAFT_VERSION, parseDraft, serializeDraft } from "./site-draft-storage";

describe("round trip", () => {
  it("restores a draft it wrote", () => {
    const draft = { ...EMPTY_SITE_DRAFT, step: 3, brand: { ...EMPTY_SITE_DRAFT.brand, businessName: "Ocean Table" } };
    expect(parseDraft(serializeDraft(draft))).toEqual(draft);
  });
});

describe("parseDraft rejects what it cannot trust", () => {
  it("returns null for nothing stored", () => {
    expect(parseDraft(null)).toBeNull();
  });

  it("returns null rather than throwing on malformed JSON", () => {
    expect(parseDraft("{not json")).toBeNull();
  });

  it("discards a draft written by an older shape", () => {
    const stale = JSON.stringify({ version: DRAFT_VERSION - 1, draft: EMPTY_SITE_DRAFT });
    expect(parseDraft(stale)).toBeNull();
  });

  it("discards a payload with no draft at all", () => {
    expect(parseDraft(JSON.stringify({ version: DRAFT_VERSION }))).toBeNull();
  });
});

describe("parseDraft normalises the step", () => {
  it("pulls an out-of-range step back into the flow", () => {
    const high = JSON.stringify({ version: DRAFT_VERSION, draft: { ...EMPTY_SITE_DRAFT, step: 99 } });
    expect(parseDraft(high)?.step).toBe(STEP_COUNT);
    const low = JSON.stringify({ version: DRAFT_VERSION, draft: { ...EMPTY_SITE_DRAFT, step: 0 } });
    expect(parseDraft(low)?.step).toBe(1);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd apps/merchant && npm test -- site-draft-storage
```

Expected: FAIL — cannot resolve `./site-draft-storage`.

- [ ] **Step 3: Write the codec**

```ts
// Draft persistence for the Public Link Builder.
//
// localStorage, not sessionStorage: this is a business setting a merchant
// comes back to next week, not a signup they might abandon in this tab. That
// is the one place it diverges from use-onboarding-draft, which it otherwise
// follows.
//
// DRAFT_VERSION guards the shape. A draft written before a field existed would
// rehydrate into something half-valid, and the screen that read it would show
// a control with nothing behind it — discarding is the honest answer.
import { EMPTY_SITE_DRAFT, STEP_COUNT, type SiteDraft } from "./site-draft";

export const DRAFT_KEY = "octo.site-draft";
export const DRAFT_VERSION = 1;

export function serializeDraft(draft: SiteDraft): string {
  return JSON.stringify({ version: DRAFT_VERSION, draft });
}

export function parseDraft(raw: string | null): SiteDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { version?: number; draft?: SiteDraft };
    if (parsed.version !== DRAFT_VERSION || !parsed.draft) return null;
    const step = Math.min(STEP_COUNT, Math.max(1, parsed.draft.step ?? 1));
    return { ...EMPTY_SITE_DRAFT, ...parsed.draft, step };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
cd apps/merchant && npm test -- site-draft-storage
```

- [ ] **Step 5: Write the hook**

```ts
// The reducer plus its storage. Writes are debounced so a colour picker
// dragged across the spectrum does not write a hundred times, and each write
// stamps `savedAt` — which is what the "Autosaved just now" chip reads. A chip
// that said "saved" on a timer, without a write behind it, would be a lie.
import { useCallback, useEffect, useReducer, useRef } from "react";
import { EMPTY_SITE_DRAFT, siteDraftReducer, type SiteAction, type SiteDraft } from "./site-draft";
import { DRAFT_KEY, parseDraft, serializeDraft } from "./site-draft-storage";

const DEBOUNCE_MS = 400;

function initial(): SiteDraft {
  try {
    return parseDraft(window.localStorage.getItem(DRAFT_KEY)) ?? EMPTY_SITE_DRAFT;
  } catch {
    // Private browsing, or storage disabled. The builder still works; it just
    // will not survive a refresh.
    return EMPTY_SITE_DRAFT;
  }
}

export function useSiteDraft() {
  const [draft, dispatch] = useReducer(siteDraftReducer, undefined, initial);
  const timer = useRef<number | null>(null);

  const save = useCallback((next: SiteDraft) => {
    try {
      window.localStorage.setItem(DRAFT_KEY, serializeDraft({ ...next, savedAt: Date.now() }));
    } catch {
      // See `initial`.
    }
  }, []);

  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save(draft), DEBOUNCE_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [draft, save]);

  const saveNow = useCallback(() => save(draft), [draft, save]);

  return { draft, dispatch: dispatch as (action: SiteAction) => void, save: saveNow };
}
```

- [ ] **Step 6: Typecheck**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add apps/merchant/src/pages/public-link/_shared
git commit -m "Persist the builder draft, debounced, with an honest saved-at stamp"
```

---

## Task 7: The SiteDraft preview adapter

**Files:**
- Create: `apps/merchant/src/pages/public-link/_shared/preview-model.ts`
- Test: `apps/merchant/src/pages/public-link/_shared/preview-model.test.ts`

**Interfaces:**
- Consumes: `SiteDraft` (Task 4), catalogs (Task 5), `StorefrontPreviewModel`/`PreviewDevice` (Task 3)
- Produces: `previewModelFromSite(draft: SiteDraft, device: PreviewDevice, t: (key: string) => string, locale: string): StorefrontPreviewModel`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { EMPTY_SITE_DRAFT } from "./site-draft";
import { SITE_THEMES } from "./theme-catalog";
import { previewModelFromSite } from "./preview-model";

const t = (key: string) => key;

describe("previewModelFromSite", () => {
  it("shows only the sections that are switched on, in the draft's order", () => {
    const draft = {
      ...EMPTY_SITE_DRAFT,
      sections: [
        { id: "offers", enabled: true },
        { id: "hero", enabled: false },
        { id: "menu", enabled: true },
      ],
    };
    expect(previewModelFromSite(draft, "desktop", t, "en").sections).toEqual(["offers", "menu"]);
  });

  it("carries the theme's style id, not the theme id, so the token function understands it", () => {
    const theme = SITE_THEMES.find((entry) => entry.styleId === "warm")!;
    const draft = { ...EMPTY_SITE_DRAFT, theme: { ...EMPTY_SITE_DRAFT.theme, id: theme.id } };
    expect(previewModelFromSite(draft, "desktop", t, "en").themeTemplate).toBe("warm");
  });

  it("drops pages hidden on the navigation step from the nav", () => {
    const id = EMPTY_SITE_DRAFT.pages[1].id;
    const draft = { ...EMPTY_SITE_DRAFT, navigation: { ...EMPTY_SITE_DRAFT.navigation, hidden: [id] } };
    const nav = previewModelFromSite(draft, "desktop", t, "en").navItems;
    expect(nav.find((item) => item.labelKey.includes(id))?.visible ?? true).toBe(false);
  });

  it("drops pages the merchant took out of the nav on the pages step", () => {
    const pages = EMPTY_SITE_DRAFT.pages.map((page, i) => (i === 2 ? { ...page, inNav: false } : page));
    const nav = previewModelFromSite({ ...EMPTY_SITE_DRAFT, pages }, "desktop", t, "en").navItems;
    expect(nav).toHaveLength(EMPTY_SITE_DRAFT.pages.filter((p) => p.inNav).length - 1);
  });

  it("prefers the merchant's hero copy and falls back to the default headline", () => {
    const withCopy = {
      ...EMPTY_SITE_DRAFT,
      sectionSettings: {
        ...EMPTY_SITE_DRAFT.sectionSettings,
        hero: { ...EMPTY_SITE_DRAFT.sectionSettings.hero, heading: "Made with love" },
      },
    };
    expect(previewModelFromSite(withCopy, "desktop", t, "en").hero.headline).toBe("Made with love");
    expect(previewModelFromSite(EMPTY_SITE_DRAFT, "desktop", t, "en").hero.headline)
      .toBe(t("publicLink.hero.defaultHeadline"));
  });

  it("builds the hostname from the business name and falls back when it is empty", () => {
    expect(previewModelFromSite(EMPTY_SITE_DRAFT, "desktop", t, "en").url).toBe("restaurant.octopus.app");
    const named = { ...EMPTY_SITE_DRAFT, brand: { ...EMPTY_SITE_DRAFT.brand, businessName: "Ocean Table" } };
    expect(previewModelFromSite(named, "desktop", t, "en").url).toBe("ocean-table.octopus.app");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd apps/merchant && npm test -- preview-model
```

- [ ] **Step 3: Write the adapter**

Reuse `dnsLabel` from `pages/onboarding/steps/public-link-tag.ts` for the hostname — it already lowercases, strips and hyphenates. Import it rather than writing a second slugifier; both files are under `pages/`, so the import direction is legal.

The nav list is `draft.pages`, filtered to `inNav && !navigation.hidden.includes(id)`, mapped to `{ labelKey: PAGE_MODULES.find(...)!.labelKey, visible: true }`. Category tiles come from `SITE_SECTIONS`' menu section rather than an onboarding type: use a fixed list of five storefront category keys declared in `preview-model.ts`.

- [ ] **Step 4: Run the tests and typecheck**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/pages/public-link/_shared
git commit -m "Feed the storefront preview from the builder draft"
```

---

## Task 8: The shell, the route and the sidebar entry

This is the phase gate. After it, the page exists, navigates and persists — with seven placeholder steps.

**Files:**
- Create: `apps/merchant/src/pages/public-link/_shared/steps.tsx`
- Create: `apps/merchant/src/pages/public-link/_shared/builder-shell.tsx`
- Create: `apps/merchant/src/pages/public-link/index.tsx`
- Create: `apps/merchant/src/pages/public-link/ui/switch.tsx`
- Create: `apps/merchant/src/pages/public-link/steps/{theme,brand,pages,navigation,customize,preview,publish}-step.tsx` (stubs)
- Modify: `apps/merchant/src/app/routes/registry.tsx`
- Modify: `apps/merchant/src/widgets/app-sidebar/index.tsx`
- Modify: `packages/i18n/src/locales/en/index.ts`, `packages/i18n/src/locales/ar/index.ts`

**Interfaces:**
- Consumes: `useSiteDraft` (Task 6), `previewModelFromSite` (Task 7), `StepRail` from `pages/onboarding/_shared/step-rail`
- Produces:
  - `StepProps = { draft: SiteDraft; dispatch: (a: SiteAction) => void }` — every step component in Tasks 10–21 takes exactly this
  - `SITE_STEPS: readonly { id: string; labelKey: string; Component: ComponentType<StepProps> }[]`
  - `<Switch checked onChange label />` — used by every later step
  - `PublicLinkBuilderPage` as a named export

- [ ] **Step 1: Add the i18n keys**

Add to both dictionaries. English values are the strings in the frames; `labelKey()` inverts the English dictionary **by value**, so the route's `section`/`page` strings must appear verbatim as English values or the breadcrumb will render raw English in Arabic.

```ts
// en
"nav.publicLink": "Public Link Builder",
"nav.storefront": "Storefront",
"publicLink.title": "Public Link Builder",
"publicLink.autosaved": "Autosaved just now",
"publicLink.step.theme": "Theme",
"publicLink.step.brand": "Brand",
"publicLink.step.pages": "Pages",
"publicLink.step.navigation": "Navigation",
"publicLink.step.customize": "Customize",
"publicLink.step.preview": "Preview",
"publicLink.step.publish": "Publish",
"publicLink.help": "Help",
"publicLink.saveDraft": "Save Draft",
"publicLink.nextStep": "Next Step",
"publicLink.back": "Back",
"publicLink.publishNow": "Publish Now",
"publicLink.livePreview": "Live Preview",
"publicLink.draftSaved": "Draft saved",
```

```ts
// ar
"nav.publicLink": "منشئ الرابط العام",
"nav.storefront": "المتجر",
"publicLink.title": "منشئ الرابط العام",
"publicLink.autosaved": "تم الحفظ تلقائيًا الآن",
"publicLink.step.theme": "القالب",
"publicLink.step.brand": "الهوية",
"publicLink.step.pages": "الصفحات",
"publicLink.step.navigation": "التنقل",
"publicLink.step.customize": "التخصيص",
"publicLink.step.preview": "المعاينة",
"publicLink.step.publish": "النشر",
"publicLink.help": "مساعدة",
"publicLink.saveDraft": "حفظ كمسودة",
"publicLink.nextStep": "الخطوة التالية",
"publicLink.back": "رجوع",
"publicLink.publishNow": "انشر الآن",
"publicLink.livePreview": "معاينة مباشرة",
"publicLink.draftSaved": "تم حفظ المسودة",
```

- [ ] **Step 2: Run the parity test**

```bash
cd apps/merchant && npm test -- keys
```

Expected: PASS. A failure here names the key that exists in one dictionary only.

- [ ] **Step 3: Write the switch**

`packages/ui/src/primitives/index.ts` is a shared file this plan does not own, so the toggle lives in the page. Copy the pattern already in `pages/menu/schedules/index.tsx` — including its RTL translate:

```tsx
// The toggle every step of the builder uses. A real button with role="switch",
// not a styled checkbox, so it announces its state and takes a keyboard.
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        "relative inline-flex h-[20px] w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40",
        checked ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"
      )}
    >
      <span
        className={clsx(
          "inline-block h-4 w-4 transform rounded-full bg-[var(--octo-card)] shadow transition-transform",
          checked ? "translate-x-[17px] rtl:-translate-x-[17px]" : "translate-x-[2px] rtl:-translate-x-[2px]"
        )}
      />
    </button>
  );
}
```

- [ ] **Step 4: Write the step registry**

`_shared/steps.tsx` exports `StepProps` and `SITE_STEPS` — seven entries whose `labelKey`s are the `publicLink.step.*` keys, in order.

- [ ] **Step 5: Write seven stubs**

Each step file exports a component of the agreed shape, rendering only its title, so the shell can be verified before any step is built:

```tsx
export function ThemeStep(_props: StepProps) {
  const { t } = useI18n();
  return <p className="text-[12.5px] text-[var(--octo-text-muted)]">{t("publicLink.step.theme")}</p>;
}
```

- [ ] **Step 6: Write the shell**

`_shared/builder-shell.tsx` renders, top to bottom:
- a header row: `h1` at 21px/700 with `publicLink.title`, and beside it the autosave chip — a `CheckCircle2` at 13px in `#16a34a` plus `publicLink.autosaved`, shown only when `draft.savedAt !== null`;
- the step subtitle (`publicLink.stepTitle.*`, added per step in later tasks) on the start side and `StepRail` from `@/pages/onboarding/_shared/step-rail` on the end side, on one row at `lg` and stacked below it;
- `{children}`;
- a footer row with three buttons: `Button variant="secondary"` with a `HelpCircle` icon for Help, `Button variant="secondary"` for Save Draft (calls `save()` and shows the `publicLink.draftSaved` note for 3.2s, the same self-dismissing pattern `wizard.tsx` uses), and `Button variant="primary"` for Next Step with an `ArrowRight` — labelled `publicLink.publishNow` on step 7.

The arrow must be `rtl:rotate-180`; a right-pointing arrow on an Arabic page points backwards.

- [ ] **Step 7: Write the page**

`pages/public-link/index.tsx`:

```tsx
export function PublicLinkBuilderPage() {
  const { draft, dispatch, save } = useSiteDraft();
  const current = SITE_STEPS[draft.step - 1];
  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <BuilderShell draft={draft} dispatch={dispatch} save={save}>
        <current.Component draft={draft} dispatch={dispatch} />
      </BuilderShell>
    </div>
  );
}
```

- [ ] **Step 8: Register the route**

In `src/app/routes/registry.tsx`, add one entry — place it after the `menu-*` block so the file stays grouped by area:

```tsx
{ id: "public-link", path: "/public-link", section: "Storefront", page: "Public Link Builder",
  element: lazy(() => import("@/pages/public-link").then(m => ({ default: m.PublicLinkBuilderPage }))) },
```

This requires `pages/public-link/index.tsx` to export `PublicLinkBuilderPage` as a named export. Do not touch any other line in this file.

- [ ] **Step 9: Add the sidebar entry**

In `src/widgets/app-sidebar/index.tsx`:
- add `Link2` to the existing `lucide-react` import list;
- inside the `Operations` section's `groups` array, directly after the `floor-plan-builder` entry, add:

```tsx
{ id: "public-link", label: "Public Link Builder", icon: Link2, path: "/public-link" },
```

Add **no** `GROUP_MODULE` entry — the public page is not owned by one module, so like Dashboard it is always present. Do not touch any other line in this file.

- [ ] **Step 10: Typecheck and test**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
```

- [ ] **Step 11: Verify in the browser**

Start the dev server if 5173 is free. Confirm:
- **Public Link Builder** appears in the sidebar under Operations, after Floor Plan Builder, and navigates to `/public-link`;
- the breadcrumb reads `Storefront / Public Link Builder` in EN and its Arabic equivalent in AR;
- the rail shows 7 steps, Next advances, Back returns, and step 1 does not go below 1;
- a refresh mid-flow resumes on the same step, and the autosave chip appears after the first change;
- the collapsed sidebar rail shows the entry's icon with its flyout label.

Screenshot the page in EN and AR.

- [ ] **Step 12: Commit**

```bash
git add apps/merchant/src/pages/public-link apps/merchant/src/app/routes/registry.tsx \
        apps/merchant/src/widgets/app-sidebar/index.tsx packages/i18n/src/locales
git commit -m "Put the Public Link Builder in the sidebar behind a seven-step shell"
```

**PHASE 1 GATE — stop here for review.**

---

# Phase 2 — Theme and Brand

## Task 9: The device frame

**Files:**
- Create: `apps/merchant/src/pages/public-link/ui/device-frame.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `StorefrontPreview`, `PreviewDevice` (Task 3)
- Produces: `<DeviceFrame model device onDevice devices? title? actions? />` where `devices` defaults to `["desktop", "tablet", "mobile"]`. Every step from here on renders its preview through this.

- [ ] **Step 1: Add the keys**

`publicLink.device.desktop` / `.tablet` / `.mobile` ("Desktop" / "Tablet" / "Mobile"; "سطح المكتب" / "لوحي" / "جوال"), `publicLink.preview.refresh` ("Refresh" / "تحديث").

- [ ] **Step 2: Build the component**

A card containing: a header row with the `publicLink.livePreview` title on the start side and a `Segmented` of `Monitor`/`Tablet`/`Smartphone` icons on the end side, plus an optional `actions` slot; then the preview, width-constrained per device — desktop full width, tablet `max-w-[520px]`, mobile `max-w-[300px]` — and centred, wrapped in `overflow-x-auto`. Each segment carries an `sr-only` label; an icon-only control with no accessible name is unusable.

- [ ] **Step 3: Typecheck and commit**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
git add apps/merchant/src/pages/public-link/ui packages/i18n/src/locales
git commit -m "Frame the builder preview with a device toggle"
```

---

## Task 10: The Theme step

**Files:**
- Modify: `apps/merchant/src/pages/public-link/steps/theme-step.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `SITE_THEMES`, `THEME_FILTERS` (Task 5), `themeThumb` (Task 2), `DeviceFrame` (Task 9)
- Produces: nothing later tasks consume

- [ ] **Step 1: Add the keys**

Per theme: `publicLink.theme.<id>.name` and `.desc`. Plus `publicLink.stepTitle.theme` ("Choose Your Theme" / "اختر قالبك"), `publicLink.theme.subtitle` ("Each theme is fully customizable in next steps."), `publicLink.theme.use` ("Use This"), `publicLink.theme.recommended` ("Recommended"), `publicLink.theme.keepsContent` ("You can change your theme anytime. All content will be kept."), and one key per filter chip.

- [ ] **Step 2: Build the layout**

Two columns at `lg`: a `minmax(0,1fr)` card column and the `DeviceFrame`. Inside the left card: a row of filter chips (`rounded-[9px] border px-3 py-[7px] text-[12px]`, active chip `border-[#0D6EFD] text-[#0D6EFD]`), then a `grid gap-3 sm:grid-cols-2 xl:grid-cols-3` of theme cards.

Each card is a `<button type="button">` — the whole card selects the theme, and the "Use This" text inside it is a `<span>`, not a nested button. A button inside a button is invalid HTML and the inner one stops working. The selected card gets `border-[#0D6EFD] ring-1 ring-[#0D6EFD]/20`.

Card contents: the thumbnail (`themeThumb(theme.styleId)`, or a gradient built from `draft.brand.colors.primary` when it returns null, exactly as onboarding does), the name at 12.5px/600, the description at 11.5px in `--octo-text-muted`, and the `Recommended` badge on the recommended theme.

Below the grid: the keeps-content banner — `rounded-[10px] bg-[#0D6EFD]/5 px-3 py-2.5 text-[11.5px] text-[#0D6EFD]` with an `Info` icon.

Selecting dispatches `{ type: "patchTheme", patch: { id } }`; a filter chip dispatches `{ type: "patchTheme", patch: { filter } }` so the choice survives a refresh.

- [ ] **Step 3: Verify**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
```

Then in the browser: clicking a theme visibly changes the preview's corner radius and heading treatment; the filter chips narrow the grid; `all` shows six.

- [ ] **Step 4: Screenshot EN and AR, compare against the frame, then commit**

```bash
git add apps/merchant/src/pages/public-link packages/i18n/src/locales
git commit -m "Build the theme step"
```

---

## Task 11: The Brand step

**Files:**
- Modify: `apps/merchant/src/pages/public-link/steps/brand-step.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `FONTS` (Task 2), `DeviceFrame` (Task 9), `Switch` (Task 8)
- Produces: nothing later tasks consume

- [ ] **Step 1: Add the keys**

`publicLink.stepTitle.brand` ("Brand Identity"), `publicLink.brand.subtitle` ("Make it yours. This will represent your restaurant online."), `.logo` ("Business Logo"), `.changeLogo`, `.remove`, `.logoHint` ("Recommended: PNG/SVG · Size: 512×512px"), `.businessName`, `.businessNamePlaceholder`, `.colors`, `.primaryColor`, `.lightColor`, `.accentColor`, `.darkColor`, `.typographyEn`, `.typographyAr`, `.titles`, `.body`, `.titlesSample`, `.bodySample`, `.titlesSampleAr`, `.bodySampleAr`, `.assets`, `.favicon`, `.heroPattern`, `.change`, `.resetDefaults`.

- [ ] **Step 2: Build the form**

One card in the start column with the sections in frame order: logo, business name, colours, typography EN, typography AR, assets, reset link. `DeviceFrame` in the end column with all three devices and a `Refresh` icon button in its `actions` slot (re-renders the preview; it exists in the frame and costs one `useState` counter).

- **Logo / favicon / hero pattern** — a `<label>` wrapping a visually hidden `<input type="file" accept="image/*">`, read with `FileReader.readAsDataURL` into the draft. Follow `pages/onboarding/_shared/logo-file.ts` if it already does this; reuse it rather than writing a second reader.
- **Colours** — four cells, each a swatch (`<input type="color">` styled as a 28px square) beside a text input holding the hex. Typing a hex updates the swatch; both dispatch `patchColors`. Validate loosely: accept anything, and let `readableOn` handle what it cannot parse — it already falls back.
- **Typography** — two `Select`s per locale over `FONTS`, each followed by a live sample rendered with `style={{ fontFamily: fontStack(id, "en"|"ar") }}` so the merchant sees the face rather than its name. Arabic samples use Arabic text.
- **Reset to Theme Defaults** — a `ghost` button that dispatches `patchColors` and `patchTypography` back to `EMPTY_SITE_DRAFT`'s values for the currently selected theme.

Every text input is a controlled component dispatching on `onChange`; the preview updates per keystroke, which is the point of the step.

- [ ] **Step 3: Verify, screenshot both locales, commit**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
git add apps/merchant/src/pages/public-link packages/i18n/src/locales
git commit -m "Build the brand identity step"
```

**PHASE 2 GATE — stop here for review.**

---

# Phase 3 — Pages and Navigation

## Task 12: Reorderable list and navigation previews

**Files:**
- Create: `apps/merchant/src/pages/public-link/ui/reorder-list.tsx`
- Create: `apps/merchant/src/pages/public-link/ui/nav-preview.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `PAGE_MODULES` (Task 5)
- Produces:
  - `<ReorderList items={T[]} getId={(item)=>string} onReorder={(next: T[])=>void} renderRow={(item, index)=>ReactNode} />`
  - `<DrawerNavPreview draft />` — the dark sidebar mock from step 3
  - `<WebNavPreview draft />` and `<MobileDrawerPreview draft />` — the pair from step 4

- [ ] **Step 1: Add the keys**

`publicLink.reorder.hint` ("Drag to reorder sections"), `publicLink.reorder.move` ("Move up / Move down"), `publicLink.nav.bookTable` ("Book a Table"), `publicLink.nav.viewMenu` ("View Menu"), `publicLink.pages.enabledCount` ("{n} of {total} pages enabled").

- [ ] **Step 2: Build `ReorderList`**

Lift the drag logic already proven in `pages/onboarding/steps/public-link-sections.tsx` — the `dragging` id in React state (because `dataTransfer` is unreadable during `dragover`), `setData("text/plain", id)` so Firefox starts the drag at all, and a grip that is a **real button** handling ArrowUp/ArrowDown. Three steps need this; one generic component, not three copies.

- [ ] **Step 3: Build the nav previews**

`DrawerNavPreview` is the dark panel from the step-3 frame: `bg-[#081026]`, the Octopus logo, the enabled pages as rows with their icons, a white `Book a Table` pill and a translucent `View Menu` pill, and the `publicLink.pages.enabledCount` line beneath the card. It renders `draft.pages.filter(p => p.inNav)`.

`WebNavPreview` and `MobileDrawerPreview` are the step-4 pair: a scaled storefront header strip, and a phone-shaped drawer listing the same items with the hidden ones absent. Both are decorative — no buttons, no inputs, `aria-hidden` on the purely visual parts. This is a picture of the merchant's own navigation, and a screen reader must not announce it as one.

- [ ] **Step 4: Typecheck and commit**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
git add apps/merchant/src/pages/public-link/ui packages/i18n/src/locales
git commit -m "Add a reusable reorder list and the navigation previews"
```

---

## Task 13: The Pages step

**Files:**
- Modify: `apps/merchant/src/pages/public-link/steps/pages-step.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

- [ ] **Step 1: Add the keys**

`publicLink.stepTitle.pages` ("Choose Your Pages"), `.subtitle` ("Select the modules you want to include in your Public Link."), `.pageModule`, `.showInNav`, `.showOnHome`, `.customize`, `.tip` ("Tip: You can change the order of pages in your navigation"), plus `publicLink.page.<id>` for the nine modules.

- [ ] **Step 2: Build the table**

Three columns at `xl`: the table card, `DrawerNavPreview`, and `DeviceFrame` (desktop/tablet/mobile). Below `xl` they stack.

The table is a real `<table>` with `<th scope="col">` headers — the frame draws a table, and a grid of divs would leave the toggles unlabelled for anyone not looking at it. Each row: a `ReorderList` grip, the module icon at 14px in `--octo-text-faint`, the label, two `Switch`es, and either a `Customize` link (dispatches `selectSection` for the matching section then `goTo` step 5) or an em dash for `events`.

Toggling dispatches `togglePageFlag`; dragging dispatches `setPages`.

- [ ] **Step 3: Verify, screenshot both locales, commit**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
git add apps/merchant/src/pages/public-link packages/i18n/src/locales
git commit -m "Build the pages step"
```

---

## Task 14: The Navigation step

**Files:**
- Modify: `apps/merchant/src/pages/public-link/steps/navigation-step.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

- [ ] **Step 1: Add the keys**

`publicLink.stepTitle.navigation` ("Navigation Settings"), `.subtitle` ("Reorder your pages and control how they appear in navigation"), `.display` ("Navigation Display"), `.showInHeader`, `.showInDrawer`, `.globalOptions`, `.stickyHeader` + `.stickyHeaderNote`, `.activeIndicator` + note, `.showIcons` + note, `.sameTab` + note, `.pageOrder`, `.pageOrderHint` ("Drag to reorder. Toggle eye icon to show/hide"), `.updatesInstantly`.

- [ ] **Step 2: Build the three columns**

Start column: the Navigation Display card (two `Checkbox`es) and the Global Options card (four `Switch` rows, each with a label at 12.5px/500 and a note at 11px muted). Middle: the Page Order `ReorderList`, each row carrying an `Eye`/`EyeOff` button that dispatches `toggleNavHidden` — with an `aria-label` naming the page, since the icon alone says nothing. End: `WebNavPreview` and `MobileDrawerPreview` side by side, and the instant-update banner below them.

- [ ] **Step 3: Verify, screenshot both locales, commit**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
git add apps/merchant/src/pages/public-link packages/i18n/src/locales
git commit -m "Build the navigation settings step"
```

**PHASE 3 GATE — stop here for review.**

---

# Phase 4 — Customize

## Task 15: The section list and the shared controls

**Files:**
- Modify: `apps/merchant/src/pages/public-link/steps/customize-step.tsx`
- Create: `apps/merchant/src/pages/public-link/steps/customize/controls.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `SITE_SECTIONS` (Task 5), `ReorderList` (Task 12), `Switch` (Task 8)
- Produces, from `controls.tsx` — every inspector in Tasks 16–18 uses these and defines no controls of its own:
  - `<FieldRow label>{children}</FieldRow>` — label at 12.5px/500 above its control
  - `<ToggleRow label note checked onChange />`
  - `<RadioCard title note selected onSelect />` — the bordered card with a trailing radio dot
  - `<CheckCard title note checked onToggle />` — the same card with a trailing checkbox
  - `<NumberedHeading n title note />` — the "1- Reservation Module" heading
  - `<InspectorTabs items value onChange />` — thin wrapper over `Tabs`

- [ ] **Step 1: Add the keys**

`publicLink.stepTitle.customize` ("Customize Sections"), `.subtitle` ("Add, remove and reorder sections on your homepage."), `.homepageSections`, `.addSection`, `.selectedSection`, `.settingForSelected` ("Setting for Selected Section"), `.deleteSection`, plus `publicLink.section.<id>` for the eight sections.

- [ ] **Step 2: Build `controls.tsx`**

Six small presentational components, each under 30 lines, each taking exactly the props above. `RadioCard` and `CheckCard` are `<button type="button">` with `aria-pressed`, styled `rounded-[10px] border px-3 py-2.5`, selected state `border-[#0D6EFD] bg-[#0D6EFD]/5` with the title in `#0D6EFD`.

- [ ] **Step 3: Build the section list column**

The start column: a header row with `publicLink.homepageSections` and an `Add Section` button (opens a `Modal` listing the catalog sections not currently in `draft.sections`; picking one dispatches `setSections`), then the `ReorderList` of `draft.sections` — each row a grip, the section icon, the label (in `#0D6EFD` when selected), a `Pencil` button dispatching `selectSection`, and a `Switch` dispatching `toggleSection` — then the dashed drag hint.

- [ ] **Step 4: Route the inspector**

The middle column renders by `SITE_SECTIONS.find(s => s.id === draft.selectedSection)?.inspector`, with a `generic` fallback. Tasks 16–18 fill the branches; until then, `generic` for everything.

The end column is `DeviceFrame` with `devices={["desktop"]}` — the frames show no device toggle on this step.

- [ ] **Step 5: Verify, screenshot, commit**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
git add apps/merchant/src/pages/public-link packages/i18n/src/locales
git commit -m "Build the customize section list and its shared controls"
```

---

## Task 16: The Hero and generic inspectors

**Files:**
- Create: `apps/merchant/src/pages/public-link/steps/customize/hero-inspector.tsx`
- Create: `apps/merchant/src/pages/public-link/steps/customize/generic-inspector.tsx`
- Modify: `apps/merchant/src/pages/public-link/steps/customize-step.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

- [ ] **Step 1: Add the keys**

`publicLink.hero.content` / `.style` / `.advanced`, `.backgroundType`, `.image` / `.video` / `.slider`, `.changeImage`, `.imageHint` ("Recommended Size: 1440×900px"), `.heading`, `.headingPlaceholder`, `.subheading`, `.subheadingPlaceholder`, `.primaryCta`, `.ctaPlaceholder`, `.linkAction`, `.secondaryCta`, `.optional`, `.defaultHeadline`, plus the link-target option keys (`publicLink.target.reservations`, `.menu`, `.offers`, `.waitlist`, `.contact`).

- [ ] **Step 2: Build the hero inspector**

`InspectorTabs` over Content / Style / Advanced. Content holds the fields in frame order: a `Segmented` for background type, the image thumbnail with `Change Image` and the size hint, `Heading`, `Subheading`, `Primary CTA` + `Link/Action` select, `Secondary CTA (Optional)` + `Link/Action` select, and a full-width `Delete Section` button (`text-[#EF4444] bg-[#EF4444]/5`) that dispatches `setSections` without this id.

Style and Advanced are not drawn in any frame. Render each as an `EmptyState` from `@ui/primitives` with a "coming soon" line rather than inventing controls — a tab that silently shows nothing reads as a bug.

- [ ] **Step 3: Build the generic inspector**

Reads `SITE_SECTIONS.find(...)!.fields` and renders one `FieldRow` per entry — `Select` for `kind: "select"`, `ToggleRow` for `kind: "toggle"` — dispatching `patchGeneric`. This is what Offers-Banner-shaped sections get, and it is why `testimonials`, `instagram`, `events` and `reservationsCta` need no file each.

- [ ] **Step 4: Verify, screenshot, commit**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
git add apps/merchant/src/pages/public-link packages/i18n/src/locales
git commit -m "Build the hero and generic section inspectors"
```

---

## Task 17: The Reservations and Waiting List inspectors

**Files:**
- Create: `apps/merchant/src/pages/public-link/steps/customize/reservations-inspector.tsx`
- Create: `apps/merchant/src/pages/public-link/steps/customize/waitlist-inspector.tsx`
- Modify: `apps/merchant/src/pages/public-link/steps/customize-step.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

- [ ] **Step 1: Add the keys**

Tabs `publicLink.inspector.module` / `.setting` / `.policies` / `.notifications`.

Reservations: `.reservationModule`, `.reservationModuleNote`, `.enableReservation`, `.enableReservationNote`, `.moduleActive`, `.moduleSetting`, `.menuDisplay`, `.menuDisplayNote`, `.reservationWidget` + note, `.buttonLink` + note, `.primaryActionReservation`, `.availabilityPreview` + note, `.showNextAvailable`, `.label`, `.dateRange`, `.bookingWindow`, `.cutOff`, `.partySize`, `.min`, `.max`, `.tableHold`, `.autoConfirm` + note, `.deposit` + `.optional` + note.

Waitlist: `.waitlistModule`, `.enableWaitlist` + note, `.queueMethod`, `.fifo` + note, `.priority` + note, `.waitTimeDisplay` + note, `.updateInterval`, `.notifications`, `.whatsapp`, `.sms`, `.email`, `.autoRemove`, `.autoRemoveNote`, `.format`.

Option lists (each value an i18n key): booking window `30/60/90 days in advance`; cut-off `1/2/4 hours before`; table hold `10/15/30 minutes`; date range `next 7/14/30 days`; update interval `every 5/10/15 minutes`; auto-remove `10/20/30 minutes`; format `30min/1h`.

- [ ] **Step 2: Build the reservations inspector**

Module tab, in frame order: `NumberedHeading n={1}`, an enable card holding a `ToggleRow` plus a green `CheckCircle2` status line; a full-width `moduleSetting` button (`bg-[#0D6EFD]/5 text-[#0D6EFD]`); `NumberedHeading n={2}` over two `CheckCard`s; `NumberedHeading n={3}` over a `Select`; an `availabilityPreview` `ToggleRow`; and a two-column `Label` + `Date range` row.

Setting tab: `bookingWindow` select, `cutOff` select, a two-column min/max party-size row of `Input type="number"`, `tableHold` select, `autoConfirm` toggle with its note, `deposit` toggle with `(Optional)` beside the label.

Policies and Notifications are not drawn for this section in the frames — render the same `EmptyState` treatment Task 16 uses for the hero's undrawn tabs.

- [ ] **Step 3: Build the waitlist inspector**

Same structure. Module tab mirrors Reservations with `enableWaitlist` and the waitlist drawer as the primary action; Setting tab is Queue Method (two `RadioCard`s), min/max party size, wait-time display toggle, update interval, the three notification toggles under a `notifications` heading, and auto-remove.

Both inspectors dispatch `patchSection` with their own `section` discriminant, so a change in one can never reach the other.

- [ ] **Step 4: Verify, screenshot both inspectors in both locales, commit**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
git add apps/merchant/src/pages/public-link packages/i18n/src/locales
git commit -m "Build the reservations and waiting list inspectors"
```

---

## Task 18: The Menu & Order and Offers inspectors

**Files:**
- Create: `apps/merchant/src/pages/public-link/steps/customize/menu-inspector.tsx`
- Create: `apps/merchant/src/pages/public-link/steps/customize/offers-inspector.tsx`
- Create: `apps/merchant/src/shared/api/mock-site-menus.ts`
- Modify: `apps/merchant/src/pages/public-link/steps/customize-step.tsx`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

- [ ] **Step 1: Write the mock menus**

`shared/api/mock-site-menus.ts`, shaped like a real API response so swapping it later is a one-file change:

```ts
export interface SavedMenu {
  id: string;
  name: string;
  itemCount: number;
  updatedDaysAgo: number;
  thumbnail: string;
}

export const savedMenus: readonly SavedMenu[] = [ /* three entries; the frame shows "Ocean table main menu — Updated 2 days ago · 86 Items" */ ];
```

- [ ] **Step 2: Add the keys**

`publicLink.menu.connectSaved`, `.connectNote`, `.selectMenu`, `.connected` ("Successfully Connected"), `.manageMenus`, `.updatedAgo` ("Updated {n} days ago"), `.itemCount` ("{n} Items"), `.displayHighlighted` + note, `.displayCategories` + note, `.displayPreview` + note, `.displayFull` + note, `.primaryActionMenu`, `.openMenuPage` + note, `.openMenuDrawer` + note, `.openOrdering` + note, `.moduleSetting`, `.orderingMode`, `.ordering`, `.reservation`, `.view`, `.minOrder` ("Min Order (SAR)"), `.enterPrice`, `.orderAhead` + note, `.prepTime`, `.prepTimeNote`, `.serviceAreas` ("Services Area (Delivery)"), `.edit`, `.taxDisplay`, `.taxNote`, `.taxInclusive` / `.taxExclusive`.

Offers: `publicLink.offers.displayStyle`, `.cardList` / `.grid` / `.carousel`, `.filterCategories`, `.on` / `.off`, `.sortOrder`, `.dateEarliest` / `.dateLatest` / `.discount`, `.ctaButton`, `.viewAllOffers` / `.claimNow` / `.none`, `.visibility`, `.visibleHomepage` / `.hidden`.

- [ ] **Step 3: Build the menu inspector**

Four numbered blocks: connect a saved menu (a `Select` over `savedMenus` rendering thumbnail, name and the updated/items line, then the green connected line and the `Manage Menus` button); homepage display (four `CheckCard`s over `MenuSettings.homepageDisplay`, which is multi-select — toggling adds or removes an id); primary action (three `RadioCard`s); and the module settings block — ordering mode `Segmented`, min order `Input`, order-ahead `ToggleRow`, prep-time `Input` with its note, service areas `Input` with an `Edit` link, tax display `Select` with its note.

- [ ] **Step 4: Build the offers inspector**

Five `FieldRow`s of `Select`, except Filter Categories which is a `Select`-shaped row with a trailing `Switch` exactly as the frame draws it, all under a `publicLink.settingForSelected` heading.

- [ ] **Step 5: Verify, screenshot, commit**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
git add apps/merchant/src/pages/public-link apps/merchant/src/shared/api packages/i18n/src/locales
git commit -m "Build the menu and offers inspectors"
```

**PHASE 4 GATE — stop here for review.**

---

# Phase 5 — Preview and Publish

## Task 19: The QR encoder

A real QR code, generated in the browser, with no dependency. Scope it to exactly what the page needs: a version-4 byte-mode symbol at error-correction level L holds 78 bytes, and `ocean-table.octopus.app` is 23. Fixing the version keeps this to one Reed–Solomon block and no version-information module.

**Files:**
- Create: `apps/merchant/src/pages/public-link/ui/qr-encode.ts`
- Create: `apps/merchant/src/pages/public-link/ui/qr-code.tsx`
- Test: `apps/merchant/src/pages/public-link/ui/qr-encode.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `encodeQr(text: string): boolean[][]` — a square matrix, `true` for a dark module; `<QrCode value size? />`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { encodeQr } from "./qr-encode";

const URL = "ocean-table.octopus.app";

describe("encodeQr", () => {
  it("returns a square version-4 matrix", () => {
    const matrix = encodeQr(URL);
    expect(matrix).toHaveLength(33);
    for (const row of matrix) expect(row).toHaveLength(33);
  });

  it("draws the three finder patterns", () => {
    const m = encodeQr(URL);
    for (const [r, c] of [[0, 0], [0, 26], [26, 0]] as const) {
      expect(m[r][c], `finder at ${r},${c}`).toBe(true);
      expect(m[r + 1][c + 1]).toBe(false);
      expect(m[r + 2][c + 2]).toBe(true);
    }
  });

  it("draws the timing patterns as alternating modules", () => {
    const m = encodeQr(URL);
    for (let i = 8; i < 25; i++) expect(m[6][i]).toBe(i % 2 === 0);
  });

  it("is deterministic", () => {
    expect(encodeQr(URL)).toEqual(encodeQr(URL));
  });

  it("produces a different matrix for a different url", () => {
    expect(encodeQr(URL)).not.toEqual(encodeQr("other.octopus.app"));
  });

  it("refuses input it cannot encode rather than emitting a corrupt symbol", () => {
    expect(() => encodeQr("x".repeat(200))).toThrow();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd apps/merchant && npm test -- qr-encode
```

- [ ] **Step 3: Implement the encoder**

Fixed version 4 (33×33), byte mode, EC level L: 80 total codewords, 64 data and 16 error-correction, one block. In order: build the bit stream (mode indicator `0100`, 8-bit length, the UTF-8 bytes, terminator, pad to a byte boundary, then alternate `0xEC`/`0x11`); compute the Reed–Solomon remainder over GF(256) with the generator polynomial for 16 codewords; place finder patterns with separators, the one alignment pattern at (26,26), the timing rows, and the dark module; reserve the format areas; lay the data in the standard two-column zigzag skipping reserved modules; apply mask pattern 0 (`(row + col) % 2 === 0`); and write the 15-bit format string for level L with mask 0. Throw a `RangeError` when the encoded byte length exceeds 78.

Keep the tables (`GF` log/antilog, the generator polynomial, the format bits) as named `readonly` consts at module scope with a comment naming the ISO clause each comes from. A future reader must be able to check this against the spec without reverse-engineering the arithmetic.

- [ ] **Step 4: Run the tests and watch them pass**

```bash
cd apps/merchant && npm test -- qr-encode
```

- [ ] **Step 5: Build the renderer**

`<QrCode value size={96} />` renders one `<svg viewBox="0 0 33 33">` with a white `<rect>` background and one `<rect>` per dark module, `shapeRendering="crispEdges"`, `role="img"`, and an `<title>` naming the URL. Do not use `currentColor` — a QR code inverted by dark mode does not scan; hardcode `#16161d` on `#ffffff`.

- [ ] **Step 6: Verify with a phone**

Render it, point a phone camera at the screen, and confirm it resolves to the URL. A QR code that passes unit tests but does not scan is not done.

- [ ] **Step 7: Commit**

```bash
git add apps/merchant/src/pages/public-link/ui
git commit -m "Generate the share QR code without a dependency"
```

---

## Task 20: The Preview step

**Files:**
- Modify: `apps/merchant/src/pages/public-link/steps/preview-step.tsx`
- Create: `apps/merchant/src/pages/public-link/_shared/simulation.ts`
- Test: `apps/merchant/src/pages/public-link/_shared/simulation.test.ts`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `SiteDraft` (Task 4), `DeviceFrame` (Task 9)
- Produces: `SIM_STEPS: readonly { id: string; labelKey: string; noteKey: string; detailKey: string; seconds: number }[]`, `resultsFor(completed: number): SimResult[]`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { SIM_STEPS, resultsFor } from "./simulation";

describe("simulation", () => {
  it("rehearses the seven journey steps the frame lists", () => {
    expect(SIM_STEPS.map((s) => s.id)).toEqual([
      "landing", "browseMenu", "reservation", "waitlist", "order", "checkout", "confirmation",
    ]);
  });

  it("reports only the steps that actually ran", () => {
    expect(resultsFor(0)).toEqual([]);
    expect(resultsFor(3)).toHaveLength(3);
    expect(resultsFor(SIM_STEPS.length)).toHaveLength(SIM_STEPS.length);
  });

  it("marks a completed step successful and carries its timing", () => {
    const [first] = resultsFor(1);
    expect(first).toMatchObject({ stepId: "landing", status: "success" });
    expect(first.seconds).toBe(SIM_STEPS[0].seconds);
  });

  it("clamps a count past the end rather than inventing steps", () => {
    expect(resultsFor(99)).toHaveLength(SIM_STEPS.length);
  });
});
```

- [ ] **Step 2: Run it and watch it fail, then implement**

```bash
cd apps/merchant && npm test -- simulation
```

- [ ] **Step 3: Add the keys**

`publicLink.stepTitle.preview` ("Preview Mode"), `.subtitle`, `.testMode`, `.testModeNote` ("Your site is in private test mode. Only you and invited audiences can access it"), `.testModeOn` ("Test mode is ON"), `.testModeSetting`, `.startSimulation`, `.endSimulation`, `.simulationResults`, `.allStepsPassed`, `.step` / `.status` / `.time` / `.details`, `.success`, `.performanceScore`, `.noBrokenLinks`, `.formsWorking`, `.paymentsWorking`, `.notificationsWorking`, `.previewUrl` ("Preview URL (Test Mode)"), `.copyLink`, `.copied`, `.inviteTesters`, `.inviteNote`, `.email`, `.emailPlaceholder`, `.canViewTest`, `.sendInvitation`, `.tester`, `.owner`, `.tested`, plus a label, note and detail key per `SIM_STEPS` entry.

- [ ] **Step 4: Build the step**

Left card: the test-mode status line, the `testModeSetting` button, the seven-step checklist — each row a number badge, label, note and a `CheckCircle2` that is `#0D6EFD` filled once `index < draft.preview.completed` and faint before — then the Start/End button.

The runner is one `useEffect` keyed on `draft.preview.simulation`: while `"running"`, a `setTimeout` per step advances `completed` by one, and when it reaches `SIM_STEPS.length` it dispatches `{ simulation: "done", results: resultsFor(SIM_STEPS.length) }`. Clear the timer in the cleanup — a merchant who navigates away mid-run must not leave a timer dispatching into an unmounted tree. Pressing End dispatches `{ simulation: "idle", completed: 0, results: null }`.

Middle column (after a run): the results table and the performance-score card. End column: `DeviceFrame` with the preview URL above it and a copy button that writes to `navigator.clipboard` and swaps its label to `.copied` for two seconds.

Below all three: the Invite Testers card — an email `Input`, a `canViewTest` `Switch`, a `Send Invitation` button that appends to `draft.preview.testers` (validating that the field is non-empty and contains an `@`; do nothing and focus the field otherwise), and the tester list with role and a green `Tested` badge.

- [ ] **Step 5: Verify, screenshot idle / running / done in both locales, commit**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
git add apps/merchant/src/pages/public-link packages/i18n/src/locales
git commit -m "Build the preview step and its journey simulation"
```

---

## Task 21: The Publish step

**Files:**
- Modify: `apps/merchant/src/pages/public-link/steps/publish-step.tsx`
- Create: `apps/merchant/src/pages/public-link/_shared/checklist.ts`
- Test: `apps/merchant/src/pages/public-link/_shared/checklist.test.ts`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: `SiteDraft` (Task 4), `QrCode` (Task 19), `previewModelFromSite` (Task 7)
- Produces: `GO_LIVE_ITEMS: readonly { id: string; labelKey: string; noteKey: string; done: (d: SiteDraft) => boolean }[]`, `goLiveReady(d: SiteDraft): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { EMPTY_SITE_DRAFT, type SiteDraft } from "./site-draft";
import { GO_LIVE_ITEMS, goLiveReady } from "./checklist";

function complete(): SiteDraft {
  return {
    ...EMPTY_SITE_DRAFT,
    brand: { ...EMPTY_SITE_DRAFT.brand, businessName: "Ocean Table", logoDataUrl: "data:image/png;base64,x" },
    preview: { ...EMPTY_SITE_DRAFT.preview, simulation: "done", completed: 7 },
    publish: {
      ...EMPTY_SITE_DRAFT.publish,
      seo: { title: "Ocean Table", description: "Seafood in Jeddah", socialImageDataUrl: "data:image/png;base64,x" },
    },
  };
}

describe("go-live checklist", () => {
  it("lists the nine items the frame shows", () => {
    expect(GO_LIVE_ITEMS).toHaveLength(9);
  });

  it("is not ready on a fresh draft", () => {
    expect(goLiveReady(EMPTY_SITE_DRAFT)).toBe(false);
  });

  it("is ready once the draft actually carries what each item checks", () => {
    expect(goLiveReady(complete())).toBe(true);
  });

  it("fails the SEO item when the title is blank, rather than always showing green", () => {
    const draft = complete();
    const seo = GO_LIVE_ITEMS.find((item) => item.id === "seo")!;
    expect(seo.done(draft)).toBe(true);
    expect(seo.done({ ...draft, publish: { ...draft.publish, seo: { ...draft.publish.seo, title: "   " } } })).toBe(false);
  });

  it("fails the navigation item when every page is hidden", () => {
    const draft = complete();
    const nav = GO_LIVE_ITEMS.find((item) => item.id === "navigation")!;
    expect(nav.done({ ...draft, pages: draft.pages.map((p) => ({ ...p, inNav: false })) })).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail, then implement**

The nine items and what each genuinely checks: `pages` (at least one page `onHome`), `navigation` (at least one page `inNav` and not hidden), `menu` (`sectionSettings.menu.connectedMenuId` set), `reservations` (`reservations.enabled`), `waitlist` (`waitlist.enabled`), `payments` (`menu.orderingMode === "ordering"` implies a payment path — otherwise satisfied), `responsive` (always true; the app is responsive by construction, and the item exists to say so), `seo` (a non-blank `title` and `description`), `analytics` (mock; always true, labelled as connected). Blank-string checks must `trim()` — a title of spaces is not a title.

- [ ] **Step 3: Add the keys**

`publicLink.stepTitle.publish` ("Publish"), `.goLiveChecklist`, `.checklistNote`, a label and note per item, `.yourPublicLink`, `.publicLinkNote`, `.liveUrl`, `.live`, `.visitAsCustomer`, `.openWebsite`, `.copyLink`, `.customDomain`, `.optional`, `.customDomainNote`, `.primary`, `.sslCertificate`, `.sslActive` ("Active (auto-renew)"), `.mockNote` ("Domain and certificate are simulated in this build"), `.shareYourLink`, `.shareNote`, `.qrCode`, `.scanToOpen`, `.download`, `.whatsapp`, `.shareLink`, `.share`, `.emailShare`, `.sendByEmail`, `.send`, `.socialMedia`, `.shareWith`, `.embed`, `.addToYourSite`, `.getCode`, `.seoSocial`, `.seoNote`, `.siteTitle`, `.metaDescription`, `.metaPlaceholder`, `.socialImage`, `.socialImageHint` ("Recommended Size: 1200×630px"), `.changeImage`, `.published`.

- [ ] **Step 4: Build the step**

Three columns at `xl`, then a full-width `StorefrontPreview` below them, matching the frame.

- **Checklist card** — nine rows, each a `CheckCircle2` filled `#0D6EFD` when `item.done(draft)` and an outline circle in `--octo-text-faint` when not, with the label at 12.5px/500 and the note at 11px muted.
- **Public link card** — the URL in a bordered row with a green `Live` dot when `publish.published`, then three buttons. `Copy Link` writes to `navigator.clipboard`; `Open Website` and `Visit as customer` are `<a>` elements with `target="_blank" rel="noreferrer"` pointing at the customer app's own route, not `#`.
- **Custom domain card** — the host `Input`, a `Primary` badge, the SSL row, and the mock note. Never render `Connected`/`Active` unless `customDomain.host` is non-blank; a green "Active" over an empty field is the one thing on this screen that could actually mislead someone.
- **Share row** — five tiles. QR renders `<QrCode>` with a `Download` button that serialises the SVG to a Blob and triggers an `<a download>`; WhatsApp opens `https://wa.me/?text=<encoded url>`; Email opens a `mailto:`; Social copies the link; Embed opens a `Modal` holding a read-only `<iframe …>` snippet with a copy button.
- **SEO card** — `Site Title` `Input`, `Meta Description` `Textarea`, social image with its hint and `Change Image`.
- **Publish Now** is the shell's footer button on step 7; it dispatches `patchPublish` with `published: true` and is `disabled` until `goLiveReady(draft)`, with the reason named beside it.

- [ ] **Step 5: Verify, screenshot both locales, commit**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
git add apps/merchant/src/pages/public-link packages/i18n/src/locales
git commit -m "Build the publish step"
```

**PHASE 5 GATE — stop here for review.**

---

# Phase 6 — Verification sweep

## Task 22: Locale, direction and theme sweep

**Files:** whatever the sweep finds. No new files expected.

- [ ] **Step 1: Grep for physical properties**

```bash
cd apps/merchant/src/pages/public-link
grep -rnE '\b(ml|mr|pl|pr|text-left|text-right|border-l|border-r)-' . && echo "FOUND — fix each" || echo "clean"
```

Every hit is a bug. `left`/`right` inside a `translate` is fine only when paired with an `rtl:` counterpart, as `Switch` does.

- [ ] **Step 2: Grep for untranslated strings**

```bash
grep -rnE '>[A-Za-z][A-Za-z ]{3,}<' . | grep -v 't(' | head -40
```

Review each hit. Brand names and typeface names are legitimately untranslated; sentences are not.

- [ ] **Step 3: Run the parity test and the full suite**

```bash
cd apps/merchant && npm test && npx tsc --noEmit
```

- [ ] **Step 4: Screenshot all seven steps in four combinations**

EN light, EN dark, AR light, AR dark. For each, confirm against the frame: the rail, the column layout, the preview, and that no text is clipped when Arabic runs longer than English. Arabic labels are frequently 30% wider — fixed-width buttons are where this breaks first.

- [ ] **Step 5: Check the dark theme has no hardcoded light surfaces**

```bash
grep -rn 'bg-white\|text-black\|#ffffff\|#fff\b' . | grep -v 'qr-code'
```

`qr-code.tsx` is the deliberate exception — a QR code must stay dark-on-light in both themes to scan.

- [ ] **Step 6: Commit any fixes**

```bash
git add apps/merchant/src packages/i18n/src/locales
git commit -m "Fix the RTL, locale and dark-mode issues the sweep found"
```

**PHASE 6 GATE — final review.**
