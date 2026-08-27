# Merchant Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the merchant signup wizard as the ten steps in the new design — dropping Goals, Data & Security and Team & Workflows, adding Get Started, Brand Setup, Public Link Preview, Dashboard Preview and Payment — on a two-column shell with an AI panel.

**Architecture:** `pages/onboarding/index.tsx` becomes an orchestrator over a `STEPS` registry and a single `useReducer` draft. Each step is a self-contained component receiving `{ draft, dispatch }`. Layout lives in `StepShell`, never in the wizard widgets — those are shared with the Create Business modal and must stay layout-agnostic.

**Tech Stack:** React 19 + TypeScript, Vite, Tailwind utility classes with `--octo-*` custom properties, `clsx`, `lucide-react`, `@ui/primitives`, flat-key i18n in `packages/i18n`.

**Spec:** `docs/superpowers/specs/2026-08-25-merchant-onboarding-redesign-design.md`

## Global Constraints

- **No test framework exists in this repo.** Do not add one. Every task verifies with `pnpm --filter merchant build` (runs `tsc -b`) and `pnpm --filter merchant lint`, plus a browser check via `pnpm --filter merchant dev`.
- **Every user-visible string comes from i18n.** Add the key to BOTH `packages/i18n/src/locales/en/index.ts` and `packages/i18n/src/locales/ar/index.ts`. The two files must contain exactly the same key set — they are currently 2948 lines each, and that symmetry is load-bearing.
- **Direction:** use logical properties only — `start`/`end`, `ms-`/`me-`, `ps-`/`pe-`, `text-start`/`text-end`. Never `left`/`right`/`ml-`/`pl-`.
- **Colour:** use `var(--octo-*)` custom properties. The two literals allowed are `#0D6EFD` (brand blue) and `BRAND_GRADIENT` from `@/shared/lib/brand`. Status colours already in use: `#22C55E` success, `#EF4444` error.
- **Asset URLs** are resolved with `new URL("../../../../../assets/<folder>/<file>", import.meta.url).href` from `pages/onboarding/**` (five levels up), and four levels up from `widgets/**`. Never hardcode a path in a component — go through `_shared/assets.ts`.
- **`widgets/business-wizard/*` is shared** with `pages/settings/businesses/create.tsx`. Those four components may be restyled but must not gain layout wrappers, asides, or props that only onboarding can supply.
- **Brand colour and logo never reach `TenantConfig`.** They live in the draft and are shown back inside the wizard only.
- **Commit after every task**, using the message given in that task's final step.

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `pages/onboarding/_shared/assets.ts` | Every asset URL used by the wizard, one exported helper per folder |
| `pages/onboarding/_shared/draft.ts` | `OnboardingDraft` type, `EMPTY_DRAFT`, `draftReducer`, `DraftAction` |
| `pages/onboarding/_shared/use-onboarding-draft.ts` | `useReducer` + versioned sessionStorage persistence |
| `pages/onboarding/_shared/brand-catalog.ts` | Cities, currencies, branch types, audiences, palettes, theme templates |
| `pages/onboarding/_shared/ai-insights.ts` | Pure derivations that feed the aside panels |
| `pages/onboarding/_shared/payment-catalog.ts` | Payment methods + `simulatePayment()` |
| `pages/onboarding/_shared/step-shell.tsx` | Two-column grid; content + optional aside |
| `pages/onboarding/_shared/steps.tsx` | `STEPS` registry — the single source of step order |
| `pages/onboarding/steps/get-started-step.tsx` | Step 1 |
| `pages/onboarding/steps/business-details-step.tsx` | Step 4 content |
| `pages/onboarding/steps/business-details-aside.tsx` | Step 4 AI Assistant panel |
| `pages/onboarding/steps/insights-aside.tsx` | Shared AI panel for steps 2 and 5 |
| `pages/onboarding/steps/review-step.tsx` | Step 7 |
| `pages/onboarding/steps/public-link-step.tsx` | Step 8 |
| `pages/onboarding/steps/dashboard-preview-step.tsx` | Step 9 |
| `pages/onboarding/steps/payment-step.tsx` | Step 10 |
| `pages/onboarding/steps/create-account-modal.tsx` | Step 10's account modal |

**Modified**

| File | Change |
|---|---|
| `pages/onboarding/index.tsx` | Reduced to an orchestrator over `STEPS` |
| `pages/onboarding/_shared/step-rail.tsx` | New visual treatment; driven by `STEPS` |
| `pages/onboarding/_shared/price-bar.tsx` | Wider container; integration prices in the total |
| `pages/onboarding/_shared/extras-catalog.ts` | Keep `INTEGRATIONS` (+ `priceSar`); delete the rest |
| `widgets/business-wizard/vertical-step.tsx` | Card restyle |
| `widgets/business-wizard/type-step.tsx` | Card restyle |
| `widgets/business-wizard/modules-step.tsx` | Search + selected-count badge |
| `pages/onboarding/steps/integrations-step.tsx` | Price per card |
| `packages/i18n/src/locales/{en,ar}/index.ts` | Add new keys; delete dead ones |

**Deleted**

`steps/goals-step.tsx`, `steps/data-security-step.tsx`, `steps/team-workflows-step.tsx`, `steps/summary-step.tsx`, `steps/launch-step.tsx`, `steps/account-step.tsx`, `apps/assets/Ch/Gemini_Generated_Image_wl737iwl737iwl73.jfif`.

---

### Task 1: Asset hygiene and the asset module

Assets are ~28MB and Vite bundles them as-is. `public-link/hero.png` alone is 5760×2400 at 8.9MB for a ~1100px render. Fix the files, then put every path behind one module so a later image swap is a file drop.

**Files:**
- Rename: `apps/assets/public-link/de.png` → `apps/assets/public-link/dish-3.png`
- Delete: `apps/assets/Ch/Gemini_Generated_Image_wl737iwl737iwl73.jfif`
- Create: `apps/merchant/src/pages/onboarding/_shared/assets.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `verticalIcon(file)`, `typeIcon(file)`, `integrationLogo(file)`, `goalIcon` is NOT produced (goals are deleted), `themeThumb(id)`, `publicLinkAsset(file)`, `paymentLogo(file)`, `getStartedAsset(file)`, `LOGO_URL`, `HERO_URL`, `IPHONE_FRAME_URL`, `DASHBOARD_MOCKUP_URL` — all `(...) => string`

- [ ] **Step 1: Rename the ambiguous dish and drop the unused file**

```bash
cd apps/assets
git mv public-link/de.png public-link/dish-3.png
git rm "Ch/Gemini_Generated_Image_wl737iwl737iwl73.jfif"
```

- [ ] **Step 2: Resize the oversized images**

`sharp` is not a dependency and must not become one — run it through `pnpm dlx`. Each target width is the largest size the image is ever rendered at, doubled for retina.

```bash
cd apps/assets
pnpm dlx sharp-cli --input public-link/hero.png       --output public-link/ resize 2200 --format webp
pnpm dlx sharp-cli --input public-link/cat-mains.png  --output public-link/ resize 400  --format webp
pnpm dlx sharp-cli --input public-link/cat-desserts.png --output public-link/ resize 400 --format webp
pnpm dlx sharp-cli --input public-link/cat-breakfast.png --output public-link/ resize 400 --format webp
pnpm dlx sharp-cli --input public-link/cat-drinks.png --output public-link/ resize 400  --format webp
pnpm dlx sharp-cli --input public-link/dish-1.png     --output public-link/ resize 800  --format webp
pnpm dlx sharp-cli --input public-link/dish-2.png     --output public-link/ resize 800  --format webp
pnpm dlx sharp-cli --input public-link/dish-3.png     --output public-link/ resize 800  --format webp
pnpm dlx sharp-cli --input "Get Started/section image.png" --output "Get Started/" resize 900 --format webp
pnpm dlx sharp-cli --input Review.png                 --output ./ resize 900 --format webp
pnpm dlx sharp-cli --input "Iphone 14.png"            --output ./ resize 700 --format webp
```

Then delete the originals that now have a `.webp` twin:

```bash
git rm public-link/hero.png public-link/cat-*.png public-link/dish-*.png Review.png "Iphone 14.png" "Get Started/section image.png"
git add public-link/*.webp Review.webp "Iphone 14.webp" "Get Started/section image.webp"
```

If `pnpm dlx sharp-cli` fails (offline, or a native build error), skip this step, keep the PNGs, and record it in the commit body. Do not substitute an image from any external source.

- [ ] **Step 3: Write the asset module**

Create `apps/merchant/src/pages/onboarding/_shared/assets.ts`:

```ts
// Every image the onboarding wizard reaches for, in one place. Components never
// build an asset path themselves — swapping a placeholder for a real photo is a
// file drop plus a line here, never a component edit.
//
// Paths are relative to this file: five levels up lands on `apps/`.

function url(path: string): string {
  return new URL(`../../../../../assets/${path}`, import.meta.url).href;
}

export const LOGO_URL = url("Logo/OCTOPUS LOGO.svg");
export const HERO_URL = url("Get Started/section image.webp");
export const IPHONE_FRAME_URL = url("Iphone 14.webp");
export const DASHBOARD_MOCKUP_URL = url("Review.webp");

/** `apps/assets/onboarding-Business/<file>` — vertical cards, step 2. */
export function verticalIcon(file: string): string {
  return url(`onboarding-Business/${file}`);
}

/** `apps/assets/onboarding-Type/<file>` — service cards, step 3. */
export function typeIcon(file: string): string {
  return url(`onboarding-Type/${file}`);
}

/** `apps/assets/onboarding-Integrations/<file>` — vendor logos, step 6. */
export function integrationLogo(file: string): string {
  return url(`onboarding-Integrations/${file}`);
}

/** `apps/assets/payment/<file>` — payment method marks, step 10. */
export function paymentLogo(file: string): string {
  return url(`payment/${file}`);
}

/** `apps/assets/Get Started/<file>` — the three entry cards, step 1. */
export function getStartedAsset(file: string): string {
  return url(`Get Started/${file}`);
}

/** `apps/assets/public-link/<file>` — storefront preview imagery, step 8. */
export function publicLinkAsset(file: string): string {
  return url(`public-link/${file}`);
}

// Only one real theme thumbnail exists. `elegant` uses it; `modern` and `warm`
// fall back to a gradient built from the merchant's own palette (see
// ThemeTemplate.thumb in brand-catalog.ts). Returning null is how a component
// learns to render the gradient instead of an <img>.
export function themeThumb(id: string): string | null {
  return id === "elegant" ? url("onboarding-Themes/Brand Theme.png") : null;
}
```

- [ ] **Step 4: Point existing components at the module**

In `widgets/business-wizard/vertical-step.tsx`, delete the local `iconUrl` function and import `verticalIcon` from `@/pages/onboarding/_shared/assets`, replacing the call site. Do the same for `type-step.tsx` (`typeIcon`), `steps/integrations-step.tsx` (`integrationLogo`, deleting its local `imageUrl`), and `index.tsx` (`LOGO_URL`, deleting its local `const LOGO_URL`).

- [ ] **Step 5: Verify the build and the images**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. Then `pnpm --filter merchant dev`, open `/onboarding`, and confirm the vertical icons on step 1 and the vendor logos on step 6 still render — a broken `new URL` path shows as an empty box, not an error.

- [ ] **Step 6: Commit**

```bash
git add -A apps/assets apps/merchant/src
git commit -m "Route onboarding assets through one module and shrink the oversized ones"
```

---

### Task 2: Draft state and the new catalogs

Pure modules, no UI. Nothing imports them yet, so the app is unaffected — but every later task depends on these exact names.

**Files:**
- Create: `pages/onboarding/_shared/draft.ts`
- Create: `pages/onboarding/_shared/use-onboarding-draft.ts`
- Create: `pages/onboarding/_shared/brand-catalog.ts`
- Create: `pages/onboarding/_shared/ai-insights.ts`
- Create: `pages/onboarding/_shared/payment-catalog.ts`

**Interfaces:**
- Consumes: `@/shared/catalog` (`ModuleId`, `TypeCode`, `VerticalId`, `baseModuleIds`, `availabilityFor`, `addOnModules`), `IntegrationId` from `./extras-catalog`
- Produces:
  - `OnboardingDraft`, `EMPTY_DRAFT`, `DraftAction`, `draftReducer(state, action): OnboardingDraft`
  - `useOnboardingDraft(): { draft: OnboardingDraft; dispatch: Dispatch<DraftAction>; clear: () => void }`
  - `CITIES`, `CURRENCIES`, `BRANCH_TYPES`, `AUDIENCES`, `PALETTES`, `THEME_TEMPLATES`, `DEFAULT_HOURS`
  - `insightsFor(vertical, type): InsightRow[]`, `brandToneFor(type): string[]`, `serviceCategoriesFor(type): string[]`
  - `PAYMENT_METHODS`, `simulatePayment(): Promise<void>`

- [ ] **Step 1: Write the draft module**

Create `pages/onboarding/_shared/draft.ts`:

```ts
// The whole wizard in one value. Ten steps' worth of answers used to be eleven
// separate useState hooks in the page component; as a single reducer the page
// stops being a state container and becomes an orchestrator.
import type { ModuleId, TypeCode, VerticalId } from "@/shared/catalog";
import { baseModuleIds } from "@/shared/catalog";
import type { IntegrationId } from "./extras-catalog";

export type EntryPath = "ai" | "template" | "scratch";

/** One weekday's opening window. `open: false` means closed that day. */
export interface DayHours {
  open: boolean;
  from: string; // "09:00"
  to: string;   // "12:00"
}

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface BrandDetails {
  businessName: string;
  city: string;
  branchType: string;
  branchCount: number;
  currency: string;
  hours: Record<Weekday, DayHours>;
  audiences: string[];
  /** Data URL from the file input — never uploaded anywhere. */
  logoDataUrl: string | null;
  primary: string;
  secondary: string;
  themeTemplate: string | null;
}

export interface PublicLinkSettings {
  tag: string;
  /** Section ids in display order, for the customise list on step 8. */
  sections: string[];
}

export interface AccountFields {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
}

export interface OnboardingDraft {
  step: number;
  entryPath: EntryPath | null;
  vertical: VerticalId | null;
  type: TypeCode | null;
  answers: Record<string, string>;
  enabled: ModuleId[];
  brand: BrandDetails;
  integrations: IntegrationId[];
  publicLink: PublicLinkSettings;
  account: AccountFields;
  accountCreated: boolean;
  paymentMethod: string | null;
  paid: boolean;
}

const CLOSED_DEFAULT: DayHours = { open: true, from: "09:00", to: "12:00" };

export const EMPTY_DRAFT: OnboardingDraft = {
  step: 1,
  entryPath: null,
  vertical: null,
  type: null,
  answers: {},
  enabled: [...baseModuleIds],
  brand: {
    businessName: "",
    city: "",
    branchType: "",
    branchCount: 1,
    currency: "SAR",
    hours: {
      sun: { ...CLOSED_DEFAULT }, mon: { ...CLOSED_DEFAULT }, tue: { ...CLOSED_DEFAULT },
      wed: { ...CLOSED_DEFAULT }, thu: { ...CLOSED_DEFAULT }, fri: { ...CLOSED_DEFAULT },
      sat: { ...CLOSED_DEFAULT },
    },
    audiences: [],
    logoDataUrl: null,
    primary: "#001EC9",
    secondary: "#1D1D1D",
    themeTemplate: null,
  },
  integrations: [],
  publicLink: { tag: "restaurant", sections: ["hero", "offers", "menu", "bestSeller"] },
  account: { fullName: "", email: "", password: "", companyName: "" },
  accountCreated: false,
  paymentMethod: null,
  paid: false,
};

export type DraftAction =
  | { type: "goTo"; step: number }
  | { type: "next" }
  | { type: "back" }
  | { type: "setEntryPath"; path: EntryPath }
  | { type: "setVertical"; id: VerticalId }
  | { type: "setType"; code: TypeCode }
  | { type: "answer"; questionId: string; optionId: string }
  | { type: "setModules"; ids: ModuleId[] }
  | { type: "patchBrand"; patch: Partial<BrandDetails> }
  | { type: "setDayHours"; day: Weekday; hours: DayHours }
  | { type: "toggleAudience"; id: string }
  | { type: "toggleIntegration"; id: IntegrationId }
  | { type: "patchPublicLink"; patch: Partial<PublicLinkSettings> }
  | { type: "patchAccount"; patch: Partial<AccountFields> }
  | { type: "accountCreated" }
  | { type: "setPaymentMethod"; id: string }
  | { type: "paid" };

function toggle<T>(list: readonly T[], id: T): T[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function draftReducer(state: OnboardingDraft, action: DraftAction): OnboardingDraft {
  switch (action.type) {
    case "goTo":
      return { ...state, step: action.step };
    case "next":
      return { ...state, step: state.step + 1 };
    case "back":
      return { ...state, step: Math.max(1, state.step - 1) };
    case "setEntryPath":
      return { ...state, entryPath: action.path };
    case "setVertical":
      return { ...state, vertical: action.id };
    // A question relevant to the old type may not exist for the new one, and a
    // stale answer would silently keep a module switched on.
    case "setType":
      return { ...state, type: action.code, answers: {} };
    case "answer":
      return { ...state, answers: { ...state.answers, [action.questionId]: action.optionId } };
    case "setModules":
      return { ...state, enabled: action.ids };
    case "patchBrand":
      return { ...state, brand: { ...state.brand, ...action.patch } };
    case "setDayHours":
      return { ...state, brand: { ...state.brand, hours: { ...state.brand.hours, [action.day]: action.hours } } };
    case "toggleAudience":
      return { ...state, brand: { ...state.brand, audiences: toggle(state.brand.audiences, action.id) } };
    case "toggleIntegration":
      return { ...state, integrations: toggle(state.integrations, action.id) };
    case "patchPublicLink":
      return { ...state, publicLink: { ...state.publicLink, ...action.patch } };
    case "patchAccount":
      return { ...state, account: { ...state.account, ...action.patch } };
    case "accountCreated":
      return { ...state, accountCreated: true };
    case "setPaymentMethod":
      return { ...state, paymentMethod: action.id };
    case "paid":
      return { ...state, paid: true };
  }
}
```

- [ ] **Step 2: Write the persistence hook**

Create `pages/onboarding/_shared/use-onboarding-draft.ts`:

```ts
// Session-scoped draft persistence. A mid-flow refresh resumes exactly where
// the merchant left off; an abandoned signup does not haunt the browser
// forever, so this is sessionStorage and it clears once the business exists.
//
// DRAFT_VERSION guards the shape: a draft written by the previous ten-step
// flow has fields this one no longer understands, so it is discarded rather
// than rehydrated into something half-valid.
import { useEffect, useReducer, useCallback } from "react";
import { draftReducer, EMPTY_DRAFT, type OnboardingDraft } from "./draft";

const DRAFT_KEY = "octopus.onboarding.draft";
const DRAFT_VERSION = 2;

function readDraft(): OnboardingDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    const parsed = JSON.parse(raw) as { version?: number; draft?: OnboardingDraft };
    if (parsed.version !== DRAFT_VERSION || !parsed.draft) return EMPTY_DRAFT;
    // Merge over EMPTY_DRAFT so a key added after this draft was written is
    // present rather than undefined.
    return { ...EMPTY_DRAFT, ...parsed.draft };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function useOnboardingDraft() {
  const [draft, dispatch] = useReducer(draftReducer, undefined, readDraft);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ version: DRAFT_VERSION, draft }));
    } catch {
      // Private browsing or a full quota — the wizard still works, it just
      // will not survive a refresh. Not worth interrupting signup over.
    }
  }, [draft]);

  const clear = useCallback(() => {
    window.sessionStorage.removeItem(DRAFT_KEY);
  }, []);

  return { draft, dispatch, clear };
}
```

- [ ] **Step 3: Write the brand catalog**

Create `pages/onboarding/_shared/brand-catalog.ts`:

```ts
// Reference data for step 4. Presentational only — none of this reaches
// TenantConfig, and none of it is billed.
import type { Weekday } from "./draft";

export interface Option { id: string; labelKey: string }

export const CITIES: readonly Option[] = [
  { id: "riyadh", labelKey: "onboarding.city.riyadh" },
  { id: "jeddah", labelKey: "onboarding.city.jeddah" },
  { id: "dammam", labelKey: "onboarding.city.dammam" },
  { id: "mecca", labelKey: "onboarding.city.mecca" },
  { id: "medina", labelKey: "onboarding.city.medina" },
  { id: "khobar", labelKey: "onboarding.city.khobar" },
  { id: "abha", labelKey: "onboarding.city.abha" },
  { id: "tabuk", labelKey: "onboarding.city.tabuk" },
];

export const CURRENCIES: readonly Option[] = [
  { id: "SAR", labelKey: "onboarding.currency.sar" },
  { id: "AED", labelKey: "onboarding.currency.aed" },
  { id: "KWD", labelKey: "onboarding.currency.kwd" },
  { id: "USD", labelKey: "onboarding.currency.usd" },
];

export const BRANCH_TYPES: readonly Option[] = [
  { id: "single", labelKey: "onboarding.branchType.single" },
  { id: "multi", labelKey: "onboarding.branchType.multi" },
  { id: "franchise", labelKey: "onboarding.branchType.franchise" },
];

export const AUDIENCES: readonly Option[] = [
  { id: "families", labelKey: "onboarding.audience.families" },
  { id: "students", labelKey: "onboarding.audience.students" },
  { id: "groups", labelKey: "onboarding.audience.groups" },
  { id: "budget", labelKey: "onboarding.audience.budget" },
  { id: "premium", labelKey: "onboarding.audience.premium" },
  { id: "quick", labelKey: "onboarding.audience.quick" },
];

export const WEEKDAYS: readonly Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const DEFAULT_HOURS = { open: true, from: "09:00", to: "12:00" };

/** A suggested primary/secondary pair plus the tints shown under it. */
export interface Palette {
  id: string;
  primary: string;
  secondary: string;
  tints: readonly string[];
}

export const PALETTES: readonly Palette[] = [
  { id: "crimson", primary: "#7A1420", secondary: "#1D1D1D", tints: ["#7A1420", "#C05A63", "#E9A7AC", "#F6DCDE"] },
  { id: "ocean",   primary: "#0B4C8C", secondary: "#1D1D1D", tints: ["#0B4C8C", "#3F7FBF", "#8FBCE2", "#D6E7F5"] },
  { id: "amber",   primary: "#B37A0B", secondary: "#1D1D1D", tints: ["#B37A0B", "#D8A63F", "#EBCB86", "#F7E9C6"] },
  { id: "graphite",primary: "#1D1D1D", secondary: "#4A4A4A", tints: ["#1D1D1D", "#4A4A4A", "#8A8A8A", "#C9C9C9"] },
];

export interface ThemeTemplate {
  id: string;
  nameKey: string;
  descKey: string;
  /** Types this template suits, shown as chips on the card. */
  bestForKeys: readonly string[];
}

export const THEME_TEMPLATES: readonly ThemeTemplate[] = [
  { id: "elegant", nameKey: "onboarding.theme.elegant.name", descKey: "onboarding.theme.elegant.desc",
    bestForKeys: ["onboarding.theme.tag.fineDining", "onboarding.theme.tag.luxury"] },
  { id: "modern",  nameKey: "onboarding.theme.modern.name",  descKey: "onboarding.theme.modern.desc",
    bestForKeys: ["onboarding.theme.tag.quickService", "onboarding.theme.tag.cafe"] },
  { id: "warm",    nameKey: "onboarding.theme.warm.name",    descKey: "onboarding.theme.warm.desc",
    bestForKeys: ["onboarding.theme.tag.family", "onboarding.theme.tag.traditional"] },
];
```

- [ ] **Step 4: Write the AI insights module**

Create `pages/onboarding/_shared/ai-insights.ts`. These are derivations, not canned copy — the panel must change when the merchant's answers change, or it is a lie:

```ts
// What the aside panels say. Derived from the draft so the panel reflects the
// merchant's actual answers; a hardcoded list would be a screenshot pretending
// to be a recommendation.
import {
  addOnModules, availabilityFor, baseModuleIds, getModule,
  type ModuleId, type TypeCode, type VerticalId,
} from "@/shared/catalog";

export interface InsightRow {
  id: ModuleId;
  /** lucide-react icon name, resolved by CatalogIcon in the UI layer. */
  icon: string;
  nameKey: string;
  descKey: string;
}

/**
 * The modules we would switch on for this vertical/type before the merchant
 * touches anything — base modules plus everything the type profile marks
 * `core` or `recommended`.
 */
export function insightsFor(vertical: VerticalId | null, type: TypeCode | null): InsightRow[] {
  if (!vertical) return [];
  const ids: ModuleId[] = [...baseModuleIds];
  if (type) {
    for (const module of addOnModules) {
      const availability = availabilityFor(type, module.id);
      if (availability === "core" || availability === "recommended") ids.push(module.id);
    }
  }
  const seen = new Set<ModuleId>();
  return ids.flatMap((id) => {
    if (seen.has(id)) return [];
    seen.add(id);
    const module = getModule(id);
    return module ? [{ id, icon: module.icon, nameKey: module.nameKey, descKey: module.descKey }] : [];
  });
}

/** Three tone words for the Brand Tone chips, keyed off the service model. */
export function brandToneFor(type: TypeCode | null): string[] {
  switch (type) {
    case "T1": case "T11": return ["onboarding.tone.refined", "onboarding.tone.premium", "onboarding.tone.calm"];
    case "T3": case "T7":  return ["onboarding.tone.bold", "onboarding.tone.fast", "onboarding.tone.playful"];
    case "T4": case "T5":  return ["onboarding.tone.warm", "onboarding.tone.artisan", "onboarding.tone.cosy"];
    default:               return ["onboarding.tone.modern", "onboarding.tone.premium", "onboarding.tone.welcoming"];
  }
}

/** Menu section names to seed the storefront preview with. */
export function serviceCategoriesFor(type: TypeCode | null): string[] {
  switch (type) {
    case "T5": return ["onboarding.category.pastries", "onboarding.category.cakes", "onboarding.category.drinks", "onboarding.category.desserts"];
    case "T4": return ["onboarding.category.coffee", "onboarding.category.drinks", "onboarding.category.pastries", "onboarding.category.breakfast"];
    default:   return ["onboarding.category.signature", "onboarding.category.appetizers", "onboarding.category.drinks", "onboarding.category.desserts"];
  }
}
```

- [ ] **Step 5: Write the payment catalog**

Create `pages/onboarding/_shared/payment-catalog.ts`:

```ts
// MOCK. There is no payment backend — `simulatePayment` resolves after a beat
// so the processing and success states in the design are reachable and honest
// about being a demo, the same way the mock auth provider is.

export interface PaymentMethod {
  id: string;
  labelKey: string;
  /** Filename inside apps/assets/payment; null means render a lucide card icon. */
  logo: string | null;
}

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { id: "card",     labelKey: "onboarding.payment.card",     logo: "VISA.svg" },
  { id: "mada",     labelKey: "onboarding.payment.mada",     logo: "mada.svg" },
  { id: "applepay", labelKey: "onboarding.payment.applePay", logo: "apple pay.svg" },
  { id: "stcpay",   labelKey: "onboarding.payment.stcPay",   logo: "stc.svg" },
];

/** Resolves after 2.2s — long enough for the processing dialog to be read. */
export function simulatePayment(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2200));
}
```

- [ ] **Step 6: Verify it compiles**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. The new modules are unreferenced, so nothing in the running app changes yet — `tsc -b` succeeding is the whole check.

- [ ] **Step 7: Commit**

```bash
git add apps/merchant/src/pages/onboarding/_shared
git commit -m "Add the onboarding draft reducer and the brand, insight and payment catalogs"
```

---

### Task 3: The i18n keys

Every string the new steps need, in both locales, before any component asks for one. Doing this first means no later task ships a raw English literal "just for now".

**Files:**
- Modify: `packages/i18n/src/locales/en/index.ts`
- Modify: `packages/i18n/src/locales/ar/index.ts`

**Interfaces:**
- Consumes: the key names referenced by `brand-catalog.ts`, `ai-insights.ts` and `payment-catalog.ts` from Task 2
- Produces: all `onboarding.*` keys the remaining tasks call `t()` with

- [ ] **Step 1: Add the new key block to the English locale**

Insert before the closing `} as const;` in `packages/i18n/src/locales/en/index.ts`:

```ts
  /* ------------------------------------------------- onboarding: rail + chrome */
  "onboarding.rail.getStarted": "Get Started",
  "onboarding.rail.businessType": "Business Type",
  "onboarding.rail.services": "Services",
  "onboarding.rail.businessDetails": "Business Details",
  "onboarding.rail.modules": "Modules",
  "onboarding.rail.integrations": "Integrations",
  "onboarding.rail.review": "Review",
  "onboarding.rail.publicLink": "Public Link",
  "onboarding.rail.dashboardPreview": "Dashboard Preview",
  "onboarding.rail.payment": "Payment",

  /* ------------------------------------------------ onboarding: step 1 */
  "onboarding.getStarted.title.a": "Everything",
  "onboarding.getStarted.title.b": "Your Business Needs, All in",
  "onboarding.getStarted.title.c": "One Place.",
  "onboarding.getStarted.subtitle": "Build your workspace around the way your business works, with the tools, services, and features you need to manage everything seamlessly in one place.",
  "onboarding.getStarted.cta": "Get Started",
  "onboarding.getStarted.ai.name": "Start With AI",
  "onboarding.getStarted.ai.desc": "Answer a few questions and let Octopus build your OS in minutes.",
  "onboarding.getStarted.template.name": "Use a template",
  "onboarding.getStarted.template.desc": "Choose a proven template and customize it for your business.",
  "onboarding.getStarted.scratch.name": "Start from scratch",
  "onboarding.getStarted.scratch.desc": "Build your OS your way with full control from the ground up.",
  "onboarding.getStarted.easy.title": "Getting started is easy",
  "onboarding.getStarted.easy.one": "Follow the 10-Step builder.",
  "onboarding.getStarted.easy.two": "Save and return anytime.",
  "onboarding.getStarted.easy.three": "We will guide you every step of the way.",

  /* ------------------------------------------------ onboarding: asides */
  "onboarding.aside.insights.title": "AI Insights",
  "onboarding.aside.insights.lead": "Here's what your Business OS will include",
  "onboarding.aside.insights.note": "Based on your answers, we've personalized these tools to support your business.",
  "onboarding.aside.assistant.title": "AI Business Assistant",
  "onboarding.aside.assistant.lead": "Here's what I recommend for your business",
  "onboarding.aside.brandTone": "Brand Tone",
  "onboarding.aside.serviceCategories": "Services Categories",
  "onboarding.aside.publicIdentity": "Public Identity Preview",
  "onboarding.aside.regenerate": "Regenerate Suggestions",
  "onboarding.aside.summary.title": "AI Summary",
  "onboarding.aside.summary.lead": "Great choices!",
  "onboarding.aside.summary.count": "Your OS will include {n} core modules.",
  "onboarding.aside.summary.note": "Octopus AI will automatically create personalized dashboards for each selected module.",
  "onboarding.aside.summary.youGet": "You'll get:",
  "onboarding.aside.summary.roleDashboards": "Role-based dashboards",
  "onboarding.aside.summary.realtime": "Real-time KPIs & insights",
  "onboarding.aside.summary.automations": "Smart automations & alerts",
  "onboarding.aside.summary.mobile": "Beautiful, mobile-ready views",

  /* ------------------------------------------------ onboarding: step 4 */
  "onboarding.details.title": "Business Details & Brand Setup",
  "onboarding.details.subtitle": "Let's define the essentials of your business and shape its identity — we'll handle the rest.",
  "onboarding.details.city": "City",
  "onboarding.details.cityPlaceholder": "Choose city",
  "onboarding.details.branchType": "Branch Type",
  "onboarding.details.branchTypePlaceholder": "Choose branch type",
  "onboarding.details.branchCount": "Branches Number",
  "onboarding.details.currency": "Currency",
  "onboarding.details.currencyPlaceholder": "Choose currency",
  "onboarding.details.hours": "Operating Hours",
  "onboarding.details.hoursPlaceholder": "Choose your operating hours",
  "onboarding.details.audience": "Target Audience",
  "onboarding.details.audiencePlaceholder": "Choose your target audience",
  "onboarding.details.logo": "Business Logo",
  "onboarding.details.uploadLogo": "Upload your business logo",
  "onboarding.details.changeLogo": "Change Logo",
  "onboarding.details.palette": "Color Pallet",
  "onboarding.details.addCustomColor": "Add Custom Color",
  "onboarding.details.suggested": "Suggested Combinations",
  "onboarding.details.brandTheme": "Brand Theme",
  "onboarding.details.useTemplate": "Use This Template",
  "onboarding.details.bestFor": "Best for:",
  "onboarding.city.riyadh": "Riyadh",
  "onboarding.city.jeddah": "Jeddah",
  "onboarding.city.dammam": "Dammam",
  "onboarding.city.mecca": "Mecca",
  "onboarding.city.medina": "Medina",
  "onboarding.city.khobar": "Khobar",
  "onboarding.city.abha": "Abha",
  "onboarding.city.tabuk": "Tabuk",
  "onboarding.currency.sar": "SAR — Saudi Riyal",
  "onboarding.currency.aed": "AED — UAE Dirham",
  "onboarding.currency.kwd": "KWD — Kuwaiti Dinar",
  "onboarding.currency.usd": "USD — US Dollar",
  "onboarding.branchType.single": "Single location",
  "onboarding.branchType.multi": "Multiple branches",
  "onboarding.branchType.franchise": "Franchise",
  "onboarding.audience.families": "Families & Kids",
  "onboarding.audience.students": "Students & Young Adults",
  "onboarding.audience.groups": "Groups & Gatherings",
  "onboarding.audience.budget": "Budget-Friendly Diners",
  "onboarding.audience.premium": "Premium Diners",
  "onboarding.audience.quick": "Quick & Casual Diners",
  "onboarding.day.sun": "Sun",
  "onboarding.day.mon": "Mon",
  "onboarding.day.tue": "Tue",
  "onboarding.day.wed": "Wed",
  "onboarding.day.thu": "Thu",
  "onboarding.day.fri": "Fri",
  "onboarding.day.sat": "Sat",
  "onboarding.theme.elegant.name": "Elegant Dining",
  "onboarding.theme.elegant.desc": "Refined and sophisticated design with a luxurious feel, perfect for creating an elevated dining experience.",
  "onboarding.theme.modern.name": "Modern Counter",
  "onboarding.theme.modern.desc": "Clean and fast-moving design built around speed of service and a bright, uncluttered menu.",
  "onboarding.theme.warm.name": "Warm Table",
  "onboarding.theme.warm.desc": "Earthy and welcoming design that suits family tables and generous, shared plates.",
  "onboarding.theme.tag.fineDining": "Fine Dining",
  "onboarding.theme.tag.luxury": "Luxury Restaurants",
  "onboarding.theme.tag.quickService": "Quick Service",
  "onboarding.theme.tag.cafe": "Cafés",
  "onboarding.theme.tag.family": "Family Dining",
  "onboarding.theme.tag.traditional": "Traditional Grills",
  "onboarding.tone.refined": "Refined",
  "onboarding.tone.premium": "Premium",
  "onboarding.tone.calm": "Calm",
  "onboarding.tone.bold": "Bold",
  "onboarding.tone.fast": "Fast",
  "onboarding.tone.playful": "Playful",
  "onboarding.tone.warm": "Warm",
  "onboarding.tone.artisan": "Artisan",
  "onboarding.tone.cosy": "Cosy",
  "onboarding.tone.modern": "Modern",
  "onboarding.tone.welcoming": "Welcoming",
  "onboarding.category.signature": "Signature Menu",
  "onboarding.category.appetizers": "Artisanal Appetizers",
  "onboarding.category.drinks": "Fresh Beverages & Mocktails",
  "onboarding.category.desserts": "Gourmet Desserts",
  "onboarding.category.pastries": "Pastries",
  "onboarding.category.cakes": "Cakes",
  "onboarding.category.coffee": "Coffee",
  "onboarding.category.breakfast": "Breakfast",

  /* ------------------------------------------------ onboarding: step 5 */
  "onboarding.modules.title": "Select Modules & Dashboard",
  "onboarding.modules.subtitle": "Choose the operating modules you want in your business OS.",
  "onboarding.modules.search": "Search",
  "onboarding.modules.all": "All Modules",
  "onboarding.modules.selected": "Selected \"{n}\"",

  /* ------------------------------------------------ onboarding: step 6 */
  "onboarding.integrations.title": "Connect the tools you already use",
  "onboarding.integrations.optional": "Optional — you can always do this later from Settings.",

  /* ------------------------------------------------ onboarding: step 7 */
  "onboarding.review.title": "Review Your Setup",
  "onboarding.review.subtitle": "Everything looks good? Review your selections before creating your workspace.",
  "onboarding.review.business": "Business",
  "onboarding.review.industry": "Industry",
  "onboarding.review.type": "Type",
  "onboarding.review.city": "City",
  "onboarding.review.branches": "Branches NO.",
  "onboarding.review.currency": "Currency",
  "onboarding.review.primaryColor": "Primary Color",
  "onboarding.review.logo": "Logo",
  "onboarding.review.modules": "Connected OS Modules",
  "onboarding.review.integrations": "Integrations",
  "onboarding.review.completed": "Completed",
  "onboarding.review.plan": "Your Plan",
  "onboarding.review.subscription": "OCTOPUS Subscription",
  "onboarding.review.total": "Total",
  "onboarding.review.continueToPreview": "Continue to Preview",
  "onboarding.review.none": "None selected",

  /* ------------------------------------------------ onboarding: step 8 */
  "onboarding.publicLink.title": "Public Link Preview",
  "onboarding.publicLink.subtitle": "See your business through your customers' eyes. Your public experience is ready — here's how your customers will discover and interact with your business.",
  "onboarding.publicLink.viewAsCustomer": "View as customer",
  "onboarding.publicLink.yourLink": "Your Public Link",
  "onboarding.publicLink.yourLinkNote": "This is your customer-facing link, share it to start.",
  "onboarding.publicLink.customTag": "Custom Tag",
  "onboarding.publicLink.theming": "Theme & Branding",
  "onboarding.publicLink.themingNote": "Customize how your page looks.",
  "onboarding.publicLink.primaryColor": "Primary Color",
  "onboarding.publicLink.secondaryColor": "Secondary Color",
  "onboarding.publicLink.font": "Font",
  "onboarding.publicLink.style": "Style",
  "onboarding.publicLink.logo": "Logo",
  "onboarding.publicLink.connectedModules": "Connected OS Modules",
  "onboarding.publicLink.connectedNote": "This page is powered by {n} OS modules.",
  "onboarding.publicLink.live": "Live",
  "onboarding.publicLink.customize": "Customize your public link",
  "onboarding.publicLink.customizeNote": "Manage sections, their order and how they appear to customers.",
  "onboarding.publicLink.dropHint": "Drag and drop to add a new tab.",
  "onboarding.publicLink.saveDraft": "Save As Draft",
  "onboarding.publicLink.section.hero": "Hero Section",
  "onboarding.publicLink.section.offers": "Offers Banner",
  "onboarding.publicLink.section.menu": "Menu",
  "onboarding.publicLink.section.bestSeller": "Best Seller",
  "onboarding.publicLink.desktop": "Desktop",
  "onboarding.publicLink.mobile": "Mobile",

  /* ------------------------------------------------ onboarding: step 9 */
  "onboarding.dashboardPreview.title": "Your Dashboard Is Ready!",
  "onboarding.dashboardPreview.subtitle": "We've built your workspace around the way your business works. Take a quick look and explore it before you launch.",
  "onboarding.dashboardPreview.summary": "Setup Summary",
  "onboarding.dashboardPreview.configured": "Everything is configured based on your setup.",
  "onboarding.dashboardPreview.backToSetup": "Back to setup",
  "onboarding.dashboardPreview.continueToPayment": "Continue to Payment",

  /* ------------------------------------------------ onboarding: step 10 */
  "onboarding.payment.title": "Complete Your Setup",
  "onboarding.payment.subtitle": "Your workspace is ready. Complete your payment to launch your OCTOPUS setup.",
  "onboarding.payment.plan": "OCTOPUS Business Plan",
  "onboarding.payment.includes": "Includes:",
  "onboarding.payment.includesDashboard": "Business Dashboard",
  "onboarding.payment.includesModules": "Selected Modules",
  "onboarding.payment.includesPublicLink": "Public Link",
  "onboarding.payment.renewNote": "Your subscription will renew monthly.",
  "onboarding.payment.methods": "Payment Methods",
  "onboarding.payment.card": "Pay with Credit Card",
  "onboarding.payment.mada": "Pay with MADA",
  "onboarding.payment.applePay": "Pay with Apple Pay",
  "onboarding.payment.stcPay": "Pay with STC Pay",
  "onboarding.payment.pay": "Pay {amount} / month",
  "onboarding.payment.processing": "Processing your payment...",
  "onboarding.payment.processingNote": "Please do not close or reload this page.",
  "onboarding.payment.success": "Payment Successful!",
  "onboarding.payment.successNote": "Your payment has been completed successfully. Your OCTOPUS account is ready. You can now launch your business and share your public link.",
  "onboarding.payment.goToDashboard": "Go To My Dashboard",
  "onboarding.payment.demoNote": "Demo checkout — no card is charged and nothing is sent anywhere.",
  "onboarding.account.title": "Create Account!",
  "onboarding.account.fullName": "Full Name",
  "onboarding.account.fullNamePlaceholder": "Enter your name",
  "onboarding.account.emailPlaceholder": "Enter your email",
  "onboarding.account.createPassword": "Create Password",
  "onboarding.account.passwordPlaceholder": "Enter your Password",
  "onboarding.account.companyName": "Company Name",
  "onboarding.account.companyNamePlaceholder": "Enter company name",
  "onboarding.account.submit": "Create Account",
  "onboarding.account.createdTitle": "Account Created Successfully!",
  "onboarding.account.createdNote": "Your account has been created and your business setup has been saved. Complete your payment to activate your workspace and get started with OCTOPUS.",
  "onboarding.account.continueToPayment": "Continue to Payment",
  "onboarding.account.panelTitle": "Create your account and launch",
  "onboarding.account.panelNote": "Enter your data and start your OS.",
```

- [ ] **Step 2: Add the same keys to the Arabic locale**

Insert the identical key list, in the identical order, before the closing `} as const;` in `packages/i18n/src/locales/ar/index.ts`, with Arabic values. Brand names (OCTOPUS, MADA, Apple Pay, STC Pay, SAR) are not translated. Example of the first block:

```ts
  /* ------------------------------------------------- onboarding: rail + chrome */
  "onboarding.rail.getStarted": "البداية",
  "onboarding.rail.businessType": "نوع النشاط",
  "onboarding.rail.services": "الخدمات",
  "onboarding.rail.businessDetails": "بيانات النشاط",
  "onboarding.rail.modules": "الوحدات",
  "onboarding.rail.integrations": "التكاملات",
  "onboarding.rail.review": "المراجعة",
  "onboarding.rail.publicLink": "الرابط العام",
  "onboarding.rail.dashboardPreview": "معاينة اللوحة",
  "onboarding.rail.payment": "الدفع",
```

Translate the remainder in the same fashion. `{n}` and `{amount}` placeholders must survive translation verbatim.

- [ ] **Step 3: Verify the two locales stayed in sync**

```bash
grep -o '"[a-zA-Z0-9._]*":' packages/i18n/src/locales/en/index.ts | sort > /tmp/en.keys
grep -o '\"[a-zA-Z0-9._]*\":' packages/i18n/src/locales/ar/index.ts | sort > /tmp/ar.keys
diff /tmp/en.keys /tmp/ar.keys && echo "IN SYNC"
```
Expected: `IN SYNC` with no diff output. If keys differ, add the missing ones before continuing.

- [ ] **Step 4: Verify the build**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add packages/i18n/src/locales
git commit -m "Add the i18n keys for the redesigned onboarding steps"
```

---

### Task 4: The shell, the rail and the cutover

The structural change. `index.tsx` stops owning state and starts reading a registry. The registry begins with the seven steps that already have components; Tasks 5, 11 and 12 grow it to ten.

**Files:**
- Create: `pages/onboarding/_shared/step-shell.tsx`
- Create: `pages/onboarding/_shared/steps.tsx`
- Modify: `pages/onboarding/_shared/step-rail.tsx`
- Modify: `pages/onboarding/_shared/price-bar.tsx`
- Rewrite: `pages/onboarding/index.tsx`
- Delete: `pages/onboarding/steps/goals-step.tsx`, `steps/data-security-step.tsx`, `steps/team-workflows-step.tsx`

**Interfaces:**
- Consumes: `useOnboardingDraft`, `OnboardingDraft`, `DraftAction` (Task 2)
- Produces:
  - `StepProps = { draft: OnboardingDraft; dispatch: Dispatch<DraftAction> }`
  - `StepDef = { id: string; labelKey: string; titleKey: string; subtitleKey: string; Component: ComponentType<StepProps>; Aside?: ComponentType<StepProps>; canContinue: (d: OnboardingDraft) => boolean; showPriceBar: boolean }`
  - `STEPS: readonly StepDef[]`
  - `<StepShell aside={ReactNode}>{children}</StepShell>`

- [ ] **Step 1: Write the shell**

Create `pages/onboarding/_shared/step-shell.tsx`:

```tsx
// The two-column layout every step sits in: content, and an optional panel
// beside it. The panel belongs here rather than inside a step widget, because
// the wizard widgets are also rendered by the Create Business modal, which has
// no room for an aside and no draft to derive one from.
import type { ReactNode } from "react";
import clsx from "clsx";

export function StepShell({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
  return (
    <div className={clsx("grid gap-5", aside && "lg:grid-cols-[minmax(0,1fr)_330px]")}>
      <div className="min-w-0">{children}</div>
      {aside && <aside className="min-w-0">{aside}</aside>}
    </div>
  );
}
```

- [ ] **Step 2: Restyle the rail**

Replace the body of `pages/onboarding/_shared/step-rail.tsx` so it takes the labels directly rather than building keys from an index — the registry owns the order now:

```tsx
// A numbered rail, not a plain progress bar — the flow genuinely is a set of
// ordered steps, and the merchant benefits from seeing how many are left,
// which are behind them, and what each one is.
import { Fragment } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";

export function StepRail({ step, labelKeys }: { step: number; labelKeys: readonly string[] }) {
  const { t } = useI18n();

  return (
    <div className="flex w-full items-start" role="presentation">
      {labelKeys.map((labelKey, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;

        return (
          <Fragment key={labelKey}>
            <div className="flex w-7 flex-col items-center gap-1.5">
              <div
                className={clsx(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-all duration-300",
                  (done || active) && "bg-[#0D6EFD] text-white",
                  active && "ring-4 ring-[#0D6EFD]/15",
                  !done && !active &&
                    "border border-[var(--octo-border-card)] bg-[var(--octo-card)] text-[var(--octo-text-faint)]"
                )}
              >
                {done ? <Check size={12} strokeWidth={3} /> : n}
              </div>
              <span
                className={clsx(
                  "w-[72px] text-center text-[10px] font-medium leading-tight",
                  done || active ? "text-[#0D6EFD]" : "text-[var(--octo-text-faint)]"
                )}
              >
                {t(labelKey)}
              </span>
            </div>
            {i < labelKeys.length - 1 && (
              <div
                className={clsx(
                  "mx-1 mt-3.5 h-[2px] flex-1 rounded-full transition-colors duration-500 sm:mx-1.5",
                  n < step ? "bg-[#0D6EFD]" : "bg-[var(--octo-track)]"
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Widen the price bar**

In `pages/onboarding/_shared/price-bar.tsx`, change both occurrences of `max-w-[900px]` to `max-w-[1180px]`. No other change in this task.

- [ ] **Step 4: Write the registry**

Create `pages/onboarding/_shared/steps.tsx`. Seven entries now; Tasks 5, 11 and 12 insert the remaining three. Note the extension: several entries hold inline JSX adapters, so this must be `.tsx`, not `.ts`.

```tsx
// The single source of step order. Adding, removing or reordering a step is an
// edit to this array — the rail, the continue guard and the price bar all read
// from it, so they cannot drift out of sync with each other.
import type { ComponentType, Dispatch } from "react";
import type { DraftAction, OnboardingDraft } from "./draft";
import { VerticalStep, TypeStep, ModulesStep } from "@/widgets/business-wizard";
import { QuestionsStepSlot } from "../steps/questions-step-slot";
import { IntegrationsStepSlot } from "../steps/integrations-step-slot";
import { ReviewStepSlot } from "../steps/review-step-slot";
import { PaymentStepSlot } from "../steps/payment-step-slot";

export interface StepProps {
  draft: OnboardingDraft;
  dispatch: Dispatch<DraftAction>;
}

export interface StepDef {
  id: string;
  labelKey: string;
  titleKey: string;
  subtitleKey: string;
  Component: ComponentType<StepProps>;
  Aside?: ComponentType<StepProps>;
  canContinue: (draft: OnboardingDraft) => boolean;
  showPriceBar: boolean;
}

export const STEPS: readonly StepDef[] = [
  {
    id: "businessType",
    labelKey: "onboarding.rail.businessType",
    titleKey: "onboarding.step1.title",
    subtitleKey: "onboarding.step1.subtitle",
    Component: ({ draft, dispatch }) => (
      <VerticalStep selected={draft.vertical} onSelect={(id) => dispatch({ type: "setVertical", id })} />
    ),
    canContinue: (d) => d.vertical !== null,
    showPriceBar: false,
  },
  {
    id: "services",
    labelKey: "onboarding.rail.services",
    titleKey: "onboarding.step2.title",
    subtitleKey: "onboarding.step2.subtitle",
    Component: ({ draft, dispatch }) => (
      <TypeStep selected={draft.type} onSelect={(code) => dispatch({ type: "setType", code })} />
    ),
    canContinue: (d) => d.type !== null,
    showPriceBar: false,
  },
  {
    id: "businessDetails",
    labelKey: "onboarding.rail.businessDetails",
    titleKey: "onboarding.details.title",
    subtitleKey: "onboarding.details.subtitle",
    Component: QuestionsStepSlot,
    canContinue: () => true,
    showPriceBar: true,
  },
  {
    id: "modules",
    labelKey: "onboarding.rail.modules",
    titleKey: "onboarding.modules.title",
    subtitleKey: "onboarding.modules.subtitle",
    Component: ({ draft, dispatch }) =>
      draft.type ? (
        <ModulesStep
          type={draft.type}
          answers={draft.answers}
          enabled={draft.enabled}
          onToggle={(id, next) => dispatch({ type: "setModules", ids: next ? [...draft.enabled, id] : draft.enabled.filter((m) => m !== id) })}
        />
      ) : null,
    canContinue: () => true,
    showPriceBar: true,
  },
  {
    id: "integrations",
    labelKey: "onboarding.rail.integrations",
    titleKey: "onboarding.integrations.title",
    subtitleKey: "onboarding.integrations.optional",
    Component: IntegrationsStepSlot,
    canContinue: () => true,
    showPriceBar: true,
  },
  {
    id: "review",
    labelKey: "onboarding.rail.review",
    titleKey: "onboarding.review.title",
    subtitleKey: "onboarding.review.subtitle",
    Component: ReviewStepSlot,
    canContinue: () => true,
    showPriceBar: false,
  },
  {
    id: "payment",
    labelKey: "onboarding.rail.payment",
    titleKey: "onboarding.payment.title",
    subtitleKey: "onboarding.payment.subtitle",
    Component: PaymentStepSlot,
    canContinue: (d) => d.account.email.trim() !== "" && d.brand.businessName.trim() !== "",
    showPriceBar: false,
  },
];
```

- [ ] **Step 5: Write the four adapter slots**

These exist so the registry can hold real components today. Tasks 7, 9, 10 and 13 replace each one's body with the redesigned step; the file names and exports stay put so the registry never changes for that reason.

Create `pages/onboarding/steps/questions-step-slot.tsx`:

```tsx
// Step 4's current occupant: the qualifying questions, until the Business
// Details & Brand Setup form replaces them.
import { QuestionsStep } from "@/widgets/business-wizard";
import type { StepProps } from "../_shared/steps";

export function QuestionsStepSlot({ draft, dispatch }: StepProps) {
  if (!draft.type) return null;
  return (
    <QuestionsStep
      type={draft.type}
      answers={draft.answers}
      onAnswer={(questionId, optionId) => dispatch({ type: "answer", questionId, optionId })}
    />
  );
}
```

Create `pages/onboarding/steps/integrations-step-slot.tsx`:

```tsx
import { IntegrationsStep } from "./integrations-step";
import type { StepProps } from "../_shared/steps";

export function IntegrationsStepSlot({ draft, dispatch }: StepProps) {
  return (
    <IntegrationsStep
      selected={draft.integrations}
      onToggle={(id) => dispatch({ type: "toggleIntegration", id })}
    />
  );
}
```

Create `pages/onboarding/steps/review-step-slot.tsx`:

```tsx
import { SummaryStep } from "./summary-step";
import type { StepProps } from "../_shared/steps";

export function ReviewStepSlot({ draft, dispatch }: StepProps) {
  return (
    <SummaryStep
      vertical={draft.vertical}
      type={draft.type}
      enabled={draft.enabled}
      branchCount={draft.brand.branchCount}
      integrations={draft.integrations}
      onEditStep={(step) => dispatch({ type: "goTo", step })}
    />
  );
}
```

Create `pages/onboarding/steps/payment-step-slot.tsx`:

```tsx
import { AccountStep } from "./account-step";
import type { StepProps } from "../_shared/steps";

export function PaymentStepSlot({ draft, dispatch }: StepProps) {
  if (!draft.type) return null;
  return (
    <AccountStep
      type={draft.type}
      details={{
        businessName: draft.brand.businessName,
        email: draft.account.email,
        phone: "",
        password: draft.account.password,
      }}
      onChange={(next) => {
        dispatch({ type: "patchBrand", patch: { businessName: next.businessName } });
        dispatch({ type: "patchAccount", patch: { email: next.email, password: next.password } });
      }}
    />
  );
}
```

- [ ] **Step 6: Trim `summary-step.tsx` to its surviving props**

`SummaryStep` currently takes `goals`, `security`, `team` and `workflows`. Delete those four props from its signature and delete the JSX sections that render them, along with the now-unused imports from `../_shared/extras-catalog`. Keep the business, modules and integrations sections.

- [ ] **Step 7: Delete the three dropped steps**

```bash
git rm apps/merchant/src/pages/onboarding/steps/goals-step.tsx
git rm apps/merchant/src/pages/onboarding/steps/data-security-step.tsx
git rm apps/merchant/src/pages/onboarding/steps/team-workflows-step.tsx
```

- [ ] **Step 8: Rewrite the page**

Replace `pages/onboarding/index.tsx` entirely:

```tsx
// The signup flow. An ordered set of steps that turns "what kind of business
// are you?" into a provisioned dashboard, a module set and a monthly price.
//
// This component owns no answers. The draft lives in a reducer, the order
// lives in the STEPS registry, and each step is handed { draft, dispatch }.
// Rendered outside the app shell — no sidebar, no top bar — because the
// sidebar it would show does not exist yet at this point.
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Languages, Moon, Sun } from "lucide-react";
import { Button } from "@ui/primitives";
import { defaultModulesFor, questionsFor, withDependencies } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { useTheme } from "@/app/providers/theme-provider";
import { PriceBar } from "./_shared/price-bar";
import { StepRail } from "./_shared/step-rail";
import { StepShell } from "./_shared/step-shell";
import { STEPS } from "./_shared/steps";
import { useOnboardingDraft } from "./_shared/use-onboarding-draft";
import { LOGO_URL } from "./_shared/assets";

export function OnboardingPage() {
  const { t, dir, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { createBusiness } = useTenantConfig();
  const { draft, dispatch, clear } = useOnboardingDraft();

  const index = Math.min(draft.step, STEPS.length) - 1;
  const current = STEPS[index];
  const labelKeys = useMemo(() => STEPS.map((s) => s.labelKey), []);

  // The module set is derived from the type profile plus whatever the answers
  // switched on. Re-derived only when the type or an answer changes, so manual
  // toggles on the Modules step are never clobbered.
  useEffect(() => {
    if (!draft.type) return;
    const fromAnswers = questionsFor(draft.type).flatMap((question) => {
      const option = question.options.find((o) => o.id === draft.answers[question.id]);
      return option ? [...option.enables] : [];
    });
    dispatch({ type: "setModules", ids: withDependencies([...defaultModulesFor(draft.type), ...fromAnswers]) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.type, draft.answers]);

  function handleFinish() {
    if (!draft.vertical || !draft.type) return;
    createBusiness({
      vertical: draft.vertical,
      businessType: draft.type,
      enabledModules: draft.enabled,
      branchCount: draft.brand.branchCount,
      businessName: draft.brand.businessName.trim() || "My Business",
    });
    signIn(draft.account.email.trim() || "owner@octopus.sa", draft.account.password.trim() !== "");
    clear();
    navigate("/", { replace: true });
  }

  const canContinue = current.canContinue(draft);
  const isLast = index === STEPS.length - 1;
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const NextArrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const actions = (
    <>
      {index > 0 && (
        <Button variant="secondary" onClick={() => dispatch({ type: "back" })} icon={<BackArrow size={14} />}>
          {t("onboarding.back")}
        </Button>
      )}
      {isLast ? (
        <Button variant="primary" disabled={!canContinue} onClick={handleFinish}>
          {t("onboarding.create")}
        </Button>
      ) : (
        <Button variant="primary" disabled={!canContinue} onClick={() => dispatch({ type: "next" })}>
          {t("onboarding.next")}
          <NextArrow size={14} />
        </Button>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[var(--octo-page-bg)]">
      <header className="border-b border-[var(--octo-border-card)] bg-[var(--octo-card)]">
        <div className="mx-auto grid max-w-[1180px] grid-cols-[1fr_auto_1fr] items-center px-5 py-4">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-1.5 justify-self-start text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:text-[var(--octo-text-primary)]"
          >
            <BackArrow size={14} />
            <span className="hidden sm:inline">{t("onboarding.backToSignIn")}</span>
          </button>
          <div className="flex items-center gap-2 justify-self-center">
            <img src={LOGO_URL} alt="OCTOPUS" width={30} height={30} className="rounded-lg object-contain" />
            <span className="text-[15px] font-bold tracking-tight text-[var(--octo-text-primary)]">OCTOPUS</span>
          </div>
          <div className="flex items-center justify-self-end gap-2">
            <button
              type="button"
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              aria-label={t("topbar.language")}
              className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              <Languages size={15} />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t("topbar.theme")}
              className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-8">
        <StepRail step={index + 1} labelKeys={labelKeys} />

        <span className="mt-8 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#0D6EFD]">
          {t("onboarding.step").replace("{n}", String(index + 1)).replace("{total}", String(STEPS.length))}
        </span>
        <h1 className="mt-1.5 text-[24px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)] sm:text-[28px]">
          {t(current.titleKey)}
        </h1>
        <p className="mt-2 text-[13px] text-[var(--octo-text-muted)]">{t(current.subtitleKey)}</p>

        <div className="mt-6">
          <StepShell aside={current.Aside ? <current.Aside draft={draft} dispatch={dispatch} /> : undefined}>
            <current.Component draft={draft} dispatch={dispatch} />
          </StepShell>
        </div>
      </main>

      {current.showPriceBar ? (
        <PriceBar modules={draft.enabled} branchCount={draft.brand.branchCount} action={actions} />
      ) : (
        <div className="sticky bottom-0 border-t border-[var(--octo-border-card)] bg-[var(--octo-card)]/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1180px] items-center justify-end gap-2 px-5 py-3.5">{actions}</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Verify**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. Then `pnpm --filter merchant dev` and walk `/onboarding` end to end. The rail now shows seven steps, the price bar appears from step 3, and a mid-flow refresh resumes on the same step. Also open Settings → My Businesses → Create Business and confirm the modal still works — it imports the same wizard widgets.

- [ ] **Step 10: Commit**

```bash
git add -A apps/merchant/src/pages/onboarding
git commit -m "Drive onboarding from a step registry and a single draft reducer"
```

---

### Task 5: Step 1 — Get Started

**Files:**
- Create: `pages/onboarding/steps/get-started-step.tsx`
- Modify: `pages/onboarding/_shared/steps.tsx`
- Modify: `pages/onboarding/index.tsx`

**Interfaces:**
- Consumes: `StepProps` (Task 4), `HERO_URL` and `getStartedAsset` (Task 1), `EntryPath` (Task 2)
- Produces: `GetStartedStep: ComponentType<StepProps>`

- [ ] **Step 1: Write the step**

Create `pages/onboarding/steps/get-started-step.tsx`:

```tsx
// Step 1 — the doorway. Three entry cards and a headline; picking a card
// records the merchant's intent and moves on. All three lead to the same
// wizard today, so the card is a stated preference, not a different flow —
// and it is not dressed up as one.
import { Check, Sparkles } from "lucide-react";
import clsx from "clsx";
import { Button } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { HERO_URL, getStartedAsset } from "../_shared/assets";
import type { EntryPath } from "../_shared/draft";
import type { StepProps } from "../_shared/steps";

const PATHS: readonly { id: EntryPath; image: string; nameKey: string; descKey: string }[] = [
  { id: "ai",       image: "AI.png",           nameKey: "onboarding.getStarted.ai.name",       descKey: "onboarding.getStarted.ai.desc" },
  { id: "template", image: "templete.png",     nameKey: "onboarding.getStarted.template.name", descKey: "onboarding.getStarted.template.desc" },
  { id: "scratch",  image: "from scratch.png", nameKey: "onboarding.getStarted.scratch.name",  descKey: "onboarding.getStarted.scratch.desc" },
];

const EASY_POINTS = [
  "onboarding.getStarted.easy.one",
  "onboarding.getStarted.easy.two",
  "onboarding.getStarted.easy.three",
];

export function GetStartedStep({ draft, dispatch }: StepProps) {
  const { t } = useI18n();

  function choose(path: EntryPath) {
    dispatch({ type: "setEntryPath", path });
    dispatch({ type: "next" });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <div>
          <h2 className="text-[30px] font-bold leading-[1.15] tracking-tight text-[var(--octo-text-primary)] sm:text-[38px]">
            <span className="text-[#0D6EFD]">{t("onboarding.getStarted.title.a")}</span>{" "}
            {t("onboarding.getStarted.title.b")}{" "}
            <span className="text-[#0D6EFD]">{t("onboarding.getStarted.title.c")}</span>
          </h2>
          <p className="mt-4 max-w-[520px] text-[13px] leading-relaxed text-[var(--octo-text-muted)]">
            {t("onboarding.getStarted.subtitle")}
          </p>
          <Button
            variant="primary"
            className="mt-6 w-full max-w-[440px] justify-center !py-3 !text-[14px]"
            onClick={() => choose(draft.entryPath ?? "scratch")}
          >
            {t("onboarding.getStarted.cta")}
          </Button>
        </div>
        <img src={HERO_URL} alt="" className="mx-auto w-full max-w-[440px] object-contain" />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {PATHS.map((path) => {
          const active = draft.entryPath === path.id;
          return (
            <button
              key={path.id}
              type="button"
              onClick={() => choose(path.id)}
              aria-pressed={active}
              className={clsx(
                "flex flex-col items-start gap-2 rounded-xl border p-5 text-start transition-all duration-200",
                active
                  ? "border-[#0D6EFD] bg-[var(--octo-selected)] shadow-[0_0_0_3px_rgba(13,110,253,0.08)]"
                  : "border-[var(--octo-border-card)] bg-[var(--octo-card)] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
              )}
            >
              <img src={getStartedAsset(path.image)} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
              <span className="mt-1 text-[16px] font-bold text-[var(--octo-text-primary)]">{t(path.nameKey)}</span>
              <span className="text-[12px] leading-relaxed text-[var(--octo-text-muted)]">{t(path.descKey)}</span>
            </button>
          );
        })}

        <section className="rounded-xl border border-[#0D6EFD]/20 bg-[var(--octo-selected)] p-5">
          <h3 className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--octo-text-primary)]">
            <Sparkles size={14} className="text-[#0D6EFD]" />
            {t("onboarding.getStarted.easy.title")}
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {EASY_POINTS.map((key) => (
              <li key={key} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-[var(--octo-text-secondary)]">
                <Check size={12} strokeWidth={3} className="mt-0.5 shrink-0 text-[#0D6EFD]" />
                {t(key)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register it as step 1**

In `_shared/steps.tsx`, import `GetStartedStep` from `../steps/get-started-step` and insert this entry as the first element of `STEPS`:

```ts
  {
    id: "getStarted",
    labelKey: "onboarding.rail.getStarted",
    titleKey: "onboarding.getStarted.title.c",
    subtitleKey: "onboarding.getStarted.subtitle",
    Component: GetStartedStep,
    canContinue: () => true,
    showPriceBar: false,
  },
```

- [ ] **Step 3: Hide the page heading on this step**

Step 1 carries its own headline, so the shared `<h1>`/subtitle above it would repeat the copy. In `index.tsx`, wrap the step counter, `<h1>` and `<p>` block in `{current.id !== "getStarted" && ( ... )}`.

- [ ] **Step 4: Verify**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. In the browser, `/onboarding` now opens on Get Started with an eight-step rail; clicking any of the three cards or the Get Started button advances to Business Type.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/pages/onboarding
git commit -m "Add the Get Started entry step"
```

---

### Task 6: Steps 2 and 3 — card restyle and the insights aside

**Files:**
- Modify: `widgets/business-wizard/vertical-step.tsx`
- Modify: `widgets/business-wizard/type-step.tsx`
- Create: `pages/onboarding/steps/insights-aside.tsx`
- Modify: `pages/onboarding/_shared/steps.tsx`

**Interfaces:**
- Consumes: `insightsFor` (Task 2), `CatalogIcon` from `@/shared/lib/catalog-icon`, `StepProps` (Task 4)
- Produces: `InsightsAside: ComponentType<StepProps>`

- [ ] **Step 1: Restyle the vertical cards**

In `widgets/business-wizard/vertical-step.tsx`, change the grid to `grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4`, raise the card padding to `p-6`, centre the icon at `h-16 w-16`, and drop the `descKey` line and the green "available" pill — the design shows an icon and a name only. Keep the lock badge for `coming-soon` verticals and the check badge for the active one; both carry meaning the design still needs.

- [ ] **Step 2: Restyle the service cards**

In `widgets/business-wizard/type-step.tsx`, move to a `grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4` layout of text cards: icon at `h-9 w-9` top-left, name at `text-[13.5px] font-bold`, description at `text-[11px] text-[var(--octo-text-muted)]`, and the "right for you if…" line in a `rounded-[8px] bg-[var(--octo-selected)] px-2 py-1.5 text-[10.5px] text-[#0D6EFD]` strip with a `Check` icon. Read the existing file first and preserve whichever i18n keys it already uses for those three strings.

- [ ] **Step 3: Write the insights aside**

Create `pages/onboarding/steps/insights-aside.tsx`:

```tsx
// The panel beside steps 2 and 5. Everything in it is derived from the draft —
// change the vertical or the type and the list changes with it.
import { Check, Sparkles } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { insightsFor } from "../_shared/ai-insights";
import type { StepProps } from "../_shared/steps";

export function InsightsAside({ draft }: StepProps) {
  const { t } = useI18n();
  const rows = insightsFor(draft.vertical, draft.type);
  if (rows.length === 0) return null;

  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] p-4">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0D6EFD]">
        <Sparkles size={12} />
        {t("onboarding.aside.insights.title")}
      </h3>
      <p className="mt-2 text-[14px] font-bold leading-snug text-[var(--octo-text-primary)]">
        {t("onboarding.aside.insights.lead")}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--octo-text-muted)]">
        {t("onboarding.aside.insights.note")}
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-2.5 py-2"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-[var(--octo-selected)] text-[#0D6EFD]">
              <CatalogIcon name={row.icon} size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11.5px] font-semibold text-[var(--octo-text-primary)]">{t(row.nameKey)}</span>
              <span className="block truncate text-[10px] text-[var(--octo-text-muted)]">{t(row.descKey)}</span>
            </span>
            <Check size={13} strokeWidth={3} className="shrink-0 text-[#0D6EFD]" />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Attach the aside to step 2**

In `_shared/steps.tsx`, import `InsightsAside` and add `Aside: InsightsAside,` to the `businessType` entry.

- [ ] **Step 5: Verify**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. In the browser: step 2 shows the four-column vertical grid with the insights panel beside it, and the panel's list grows once a type is chosen on step 3. Then open Settings → My Businesses → Create Business and confirm the restyled cards still fit inside the modal — this is the regression the shared-widget constraint exists for.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src
git commit -m "Restyle the vertical and service cards and add the AI insights panel"
```

---

### Task 7: Step 4 — Business Details & Brand Setup

The largest step. Its content replaces `QuestionsStepSlot`'s body; the branch-count question becomes a numeric field, and the remaining qualifying questions move under the form so the module derivation still has its inputs.

**Files:**
- Create: `pages/onboarding/steps/business-details-step.tsx`
- Create: `pages/onboarding/steps/business-details-aside.tsx`
- Delete: `pages/onboarding/steps/questions-step-slot.tsx`
- Modify: `pages/onboarding/_shared/steps.tsx`

**Interfaces:**
- Consumes: `CITIES`, `CURRENCIES`, `BRANCH_TYPES`, `AUDIENCES`, `WEEKDAYS`, `PALETTES`, `THEME_TEMPLATES` (Task 2), `themeThumb` (Task 1), `brandToneFor`, `serviceCategoriesFor` (Task 2), `QuestionsStep` from `@/widgets/business-wizard`
- Produces: `BusinessDetailsStep`, `BusinessDetailsAside` — both `ComponentType<StepProps>`

- [ ] **Step 1: Write the form step**

Create `pages/onboarding/steps/business-details-step.tsx`:

```tsx
// Step 4 — the essentials plus the brand. Two cards: the details form, and the
// theme templates under it. The qualifying questions live at the bottom of the
// form card because the module set is still derived from them; they are the
// same questions, asked as fields rather than as a separate screen.
import { useRef } from "react";
import { ChevronDown, Upload } from "lucide-react";
import clsx from "clsx";
import { Input, Select } from "@ui/primitives";
import { QuestionsStep } from "@/widgets/business-wizard";
import { useI18n } from "@/app/providers/i18n-provider";
import {
  AUDIENCES, BRANCH_TYPES, CITIES, CURRENCIES, PALETTES, THEME_TEMPLATES, WEEKDAYS,
} from "../_shared/brand-catalog";
import { themeThumb } from "../_shared/assets";
import type { StepProps } from "../_shared/steps";

export function BusinessDetailsStep({ draft, dispatch }: StepProps) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const { brand } = draft;

  function handleLogo(file: File | undefined) {
    if (!file) return;
    // Read to a data URL — there is no upload endpoint, and the logo only ever
    // needs to render inside this wizard.
    const reader = new FileReader();
    reader.onload = () => dispatch({ type: "patchBrand", patch: { logoDataUrl: String(reader.result) } });
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("onboarding.businessName")}
            value={brand.businessName}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { businessName: e.target.value } })}
            className="!py-2.5 !text-[13px]"
          />
          <Select
            label={t("onboarding.details.city")}
            value={brand.city}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { city: e.target.value } })}
          >
            <option value="">{t("onboarding.details.cityPlaceholder")}</option>
            {CITIES.map((c) => <option key={c.id} value={c.id}>{t(c.labelKey)}</option>)}
          </Select>
          <Select
            label={t("onboarding.details.branchType")}
            value={brand.branchType}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { branchType: e.target.value } })}
          >
            <option value="">{t("onboarding.details.branchTypePlaceholder")}</option>
            {BRANCH_TYPES.map((b) => <option key={b.id} value={b.id}>{t(b.labelKey)}</option>)}
          </Select>
          <Select
            label={t("onboarding.details.currency")}
            value={brand.currency}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { currency: e.target.value } })}
          >
            {CURRENCIES.map((c) => <option key={c.id} value={c.id}>{t(c.labelKey)}</option>)}
          </Select>
          <Input
            type="number"
            min={1}
            label={t("onboarding.details.branchCount")}
            value={String(brand.branchCount)}
            onChange={(e) => dispatch({ type: "patchBrand", patch: { branchCount: Math.max(1, Number(e.target.value) || 1) } })}
            className="!py-2.5 !text-[13px]"
          />
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("onboarding.details.audience")}
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {AUDIENCES.map((a) => {
                const on = brand.audiences.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => dispatch({ type: "toggleAudience", id: a.id })}
                    className={clsx(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      on
                        ? "border-[#0D6EFD] bg-[var(--octo-selected)] text-[#0D6EFD]"
                        : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                    )}
                  >
                    {t(a.labelKey)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <fieldset className="mt-5">
          <legend className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("onboarding.details.hours")}
          </legend>
          <div className="mt-2 flex flex-col gap-1.5">
            {WEEKDAYS.map((day) => {
              const hours = brand.hours[day];
              return (
                <div key={day} className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-2.5 py-1.5">
                  <span className="w-9 text-[11.5px] font-medium text-[var(--octo-text-secondary)]">{t(`onboarding.day.${day}`)}</span>
                  <input
                    type="time"
                    value={hours.from}
                    onChange={(e) => dispatch({ type: "setDayHours", day, hours: { ...hours, from: e.target.value } })}
                    className="rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1 text-[11.5px] text-[var(--octo-text-primary)]"
                  />
                  <span className="text-[var(--octo-text-faint)]">—</span>
                  <input
                    type="time"
                    value={hours.to}
                    onChange={(e) => dispatch({ type: "setDayHours", day, hours: { ...hours, to: e.target.value } })}
                    className="rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1 text-[11.5px] text-[var(--octo-text-primary)]"
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hours.open}
                    aria-label={t(`onboarding.day.${day}`)}
                    onClick={() => dispatch({ type: "setDayHours", day, hours: { ...hours, open: !hours.open } })}
                    className={clsx(
                      "relative ms-auto h-5 w-9 shrink-0 rounded-full transition-colors",
                      hours.open ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"
                    )}
                  >
                    <span className={clsx(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-[var(--octo-knob)] shadow transition-all",
                      hours.open ? "start-[18px]" : "start-0.5"
                    )} />
                  </button>
                </div>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("onboarding.details.logo")}
          </legend>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleLogo(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 flex w-full flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[var(--octo-border-input)] px-3 py-6 text-[11.5px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            {brand.logoDataUrl ? (
              <img src={brand.logoDataUrl} alt="" className="max-h-24 object-contain" />
            ) : (
              <Upload size={16} />
            )}
            {t(brand.logoDataUrl ? "onboarding.details.changeLogo" : "onboarding.details.uploadLogo")}
          </button>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("onboarding.details.palette")}
          </legend>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {PALETTES.map((palette) => (
              <button
                key={palette.id}
                type="button"
                aria-pressed={brand.primary === palette.primary}
                onClick={() => dispatch({ type: "patchBrand", patch: { primary: palette.primary, secondary: palette.secondary } })}
                className={clsx(
                  "h-12 w-24 rounded-[10px] border-2 transition-all",
                  brand.primary === palette.primary ? "border-[#0D6EFD]" : "border-transparent"
                )}
                style={{ backgroundColor: palette.primary }}
              />
            ))}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2 text-[11.5px] font-medium text-[#0D6EFD]">
              {t("onboarding.details.addCustomColor")}
              <input
                type="color"
                value={brand.primary}
                onChange={(e) => dispatch({ type: "patchBrand", patch: { primary: e.target.value } })}
                className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
              />
            </label>
          </div>

          <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("onboarding.details.suggested")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PALETTES.map((palette) => (
              <button
                key={palette.id}
                type="button"
                onClick={() => dispatch({ type: "patchBrand", patch: { primary: palette.primary, secondary: palette.secondary } })}
                className="flex overflow-hidden rounded-[8px] border border-[var(--octo-border-card)]"
              >
                {palette.tints.map((tint) => (
                  <span key={tint} className="h-8 w-8" style={{ backgroundColor: tint }} />
                ))}
              </button>
            ))}
          </div>
        </fieldset>

        {draft.type && (
          <div className="mt-6 border-t border-[var(--octo-divider)] pt-5">
            <QuestionsStep
              type={draft.type}
              answers={draft.answers}
              onAnswer={(questionId, optionId) => dispatch({ type: "answer", questionId, optionId })}
            />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-5">
        <h3 className="text-[18px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.details.brandTheme")}</h3>
        <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{t("onboarding.details.subtitle")}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_TEMPLATES.map((template) => {
            const thumb = themeThumb(template.id);
            const active = brand.themeTemplate === template.id;
            return (
              <article
                key={template.id}
                className={clsx(
                  "flex flex-col overflow-hidden rounded-xl border transition-all",
                  active ? "border-[#0D6EFD] shadow-[0_0_0_3px_rgba(13,110,253,0.08)]" : "border-[var(--octo-border-card)]"
                )}
              >
                {thumb ? (
                  <img src={thumb} alt="" className="h-28 w-full object-cover" />
                ) : (
                  // No photo for this template yet — a gradient from the
                  // merchant's own palette, rather than someone else's stock image.
                  <div
                    className="h-28 w-full"
                    style={{ background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.secondary} 100%)` }}
                  />
                )}
                <div className="flex flex-1 flex-col gap-2 p-3.5">
                  <p className="text-[13.5px] font-bold text-[var(--octo-text-primary)]">{t(template.nameKey)}</p>
                  <p className="text-[11px] leading-relaxed text-[var(--octo-text-muted)]">{t(template.descKey)}</p>
                  <p className="text-[10.5px] text-[var(--octo-text-faint)]">{t("onboarding.details.bestFor")}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.bestForKeys.map((key) => (
                      <span key={key} className="rounded-full bg-[var(--octo-selected)] px-2 py-0.5 text-[10px] text-[#0D6EFD]">
                        {t(key)}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "patchBrand", patch: { themeTemplate: template.id } })}
                    className={clsx(
                      "mt-auto rounded-[9px] border px-3 py-2 text-[11.5px] font-semibold transition-colors",
                      active
                        ? "border-[#0D6EFD] bg-[#0D6EFD] text-white"
                        : "border-[#0D6EFD] text-[#0D6EFD] hover:bg-[var(--octo-selected)]"
                    )}
                  >
                    {t("onboarding.details.useTemplate")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Write the assistant aside**

Create `pages/onboarding/steps/business-details-aside.tsx`:

```tsx
// The panel beside step 4. Brand tone and menu categories come from the chosen
// business type; the identity preview is the merchant's own logo and colour,
// so it updates as they pick.
import { RefreshCw, Sparkles } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { brandToneFor, serviceCategoriesFor } from "../_shared/ai-insights";
import type { StepProps } from "../_shared/steps";

export function BusinessDetailsAside({ draft }: StepProps) {
  const { t } = useI18n();
  const { brand } = draft;
  const tones = brandToneFor(draft.type);
  const categories = serviceCategoriesFor(draft.type);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] p-4">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0D6EFD]">
        <Sparkles size={12} />
        {t("onboarding.aside.assistant.title")}
      </h3>
      <p className="text-[13.5px] font-bold leading-snug text-[var(--octo-text-primary)]">
        {t("onboarding.aside.assistant.lead")}
      </p>

      <div className="rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3">
        <p className="text-[11px] font-semibold text-[var(--octo-text-primary)]">{t("onboarding.aside.brandTone")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tones.map((key) => (
            <span key={key} className="rounded-full bg-[var(--octo-selected)] px-2 py-0.5 text-[10.5px] text-[#0D6EFD]">
              {t(key)}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3">
        <p className="text-[11px] font-semibold text-[var(--octo-text-primary)]">{t("onboarding.aside.serviceCategories")}</p>
        <ul className="mt-2 flex flex-col gap-1">
          {categories.map((key) => (
            <li key={key} className="text-[10.5px] text-[var(--octo-text-muted)]">{t(key)}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3">
        <p className="text-[11px] font-semibold text-[var(--octo-text-primary)]">{t("onboarding.aside.publicIdentity")}</p>
        <div
          className="mt-2 grid h-20 place-items-center rounded-[8px]"
          style={{ background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.secondary} 100%)` }}
        >
          {brand.logoDataUrl ? (
            <img src={brand.logoDataUrl} alt="" className="max-h-14 max-w-[70%] object-contain" />
          ) : (
            <span className="px-3 text-center text-[13px] font-bold text-white">
              {brand.businessName || t("onboarding.businessName")}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        className="inline-flex items-center justify-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[11px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
      >
        <RefreshCw size={12} />
        {t("onboarding.aside.regenerate")}
      </button>
    </section>
  );
}
```

The regenerate button is deliberately inert: there is no generator behind it, and wiring it to shuffle a static list would be pretending otherwise.

- [ ] **Step 3: Swap it into the registry**

In `_shared/steps.tsx`, replace the `businessDetails` entry's `Component: QuestionsStepSlot` with `Component: BusinessDetailsStep`, add `Aside: BusinessDetailsAside`, and change `canContinue` to `(d) => d.brand.businessName.trim() !== "" && d.brand.city !== ""`. Update the imports and delete the now-unused `QuestionsStepSlot` import.

```bash
git rm apps/merchant/src/pages/onboarding/steps/questions-step-slot.tsx
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. In the browser: step 4 shows the form, the hours rows, the palette, and the three theme cards; typing a business name and picking a colour updates the identity preview in the aside immediately; Continue stays disabled until the name and city are filled; the branch count field moves the price bar total.

- [ ] **Step 5: Commit**

```bash
git add -A apps/merchant/src/pages/onboarding
git commit -m "Add the Business Details and Brand Setup step"
```

---

### Task 8: Step 5 — Modules search, count badge and summary aside

**Files:**
- Modify: `widgets/business-wizard/modules-step.tsx`
- Create: `pages/onboarding/steps/modules-summary-aside.tsx`
- Modify: `pages/onboarding/_shared/steps.tsx`

**Interfaces:**
- Consumes: `StepProps` (Task 4), `HERO_URL` (Task 1)
- Produces: `ModulesSummaryAside: ComponentType<StepProps>`; `ModulesStep` gains an optional `searchable?: boolean` prop defaulting to `false`

- [ ] **Step 1: Add search and the count badge to the widget**

In `widgets/business-wizard/modules-step.tsx`, add `searchable` to the props and render a header above the three sections when it is true. `searchable` defaults to `false` so the Create Business modal is untouched:

```tsx
export function ModulesStep({
  type, answers, enabled, onToggle, searchable = false,
}: {
  type: TypeCode;
  answers: Answers;
  enabled: readonly ModuleId[];
  onToggle: (id: ModuleId, next: boolean) => void;
  /** Onboarding shows a search field and a selected-count badge; the Create
   *  Business modal does not have room for either. */
  searchable?: boolean;
}) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");

  const applicable = addOnModules
    .filter((m) => availabilityFor(type, m.id) !== "na")
    .filter((m) => !query.trim() || t(m.nameKey).toLowerCase().includes(query.trim().toLowerCase()));
  // ...selected / available as before, derived from `applicable`
```

Add `import { useState } from "react";` and `import { Search } from "lucide-react";`, then render this immediately inside the returned fragment when `searchable`:

```tsx
      {searchable && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="relative flex min-w-[200px] flex-1 items-center">
            <span className="pointer-events-none absolute start-3 text-[var(--octo-text-muted)]"><Search size={14} /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("onboarding.modules.search")}
              className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-2 ps-9 pe-3 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30"
            />
          </span>
          <span className="rounded-full bg-[var(--octo-hover)] px-3 py-1.5 text-[11.5px] text-[var(--octo-text-secondary)]">
            {t("onboarding.modules.all")}
          </span>
          <span className="rounded-full bg-[#0D6EFD] px-3 py-1.5 text-[11.5px] font-semibold text-white">
            {t("onboarding.modules.selected").replace("{n}", String(enabled.length))}
          </span>
        </div>
      )}
```

- [ ] **Step 2: Write the summary aside**

Create `pages/onboarding/steps/modules-summary-aside.tsx`:

```tsx
// The panel beside step 5. The count is the merchant's actual selection, so it
// moves as they toggle — it is a readout, not a boast.
import { Check, Sparkles } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { HERO_URL } from "../_shared/assets";
import type { StepProps } from "../_shared/steps";

const BENEFITS = [
  "onboarding.aside.summary.roleDashboards",
  "onboarding.aside.summary.realtime",
  "onboarding.aside.summary.automations",
  "onboarding.aside.summary.mobile",
];

export function ModulesSummaryAside({ draft }: StepProps) {
  const { t } = useI18n();

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] p-4">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0D6EFD]">
        <Sparkles size={12} />
        {t("onboarding.aside.summary.title")}
      </h3>
      <p className="text-[14px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.aside.summary.lead")}</p>
      <p className="text-[12px] text-[var(--octo-text-secondary)]">
        {t("onboarding.aside.summary.count").replace("{n}", String(draft.enabled.length))}
      </p>
      <p className="text-[11px] leading-relaxed text-[#0D6EFD]">{t("onboarding.aside.summary.note")}</p>

      <img src={HERO_URL} alt="" className="mx-auto w-full max-w-[180px] object-contain" />

      <p className="text-[11px] font-semibold text-[var(--octo-text-primary)]">{t("onboarding.aside.summary.youGet")}</p>
      <ul className="flex flex-col gap-1.5">
        {BENEFITS.map((key) => (
          <li key={key} className="flex items-start gap-2 text-[11px] text-[var(--octo-text-secondary)]">
            <Check size={12} strokeWidth={3} className="mt-0.5 shrink-0 text-[#0D6EFD]" />
            {t(key)}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Wire both into the registry**

In `_shared/steps.tsx`, pass `searchable` to `ModulesStep` in the `modules` entry and add `Aside: ModulesSummaryAside`.

- [ ] **Step 4: Verify**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. In the browser: typing in the search box filters the module rows, the badge count changes as modules are toggled, and the aside count matches. Open Create Business and confirm no search box appears there.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src
git commit -m "Add module search, a selected count and the AI summary panel"
```

---

### Task 9: Step 6 — priced integrations

**Files:**
- Modify: `pages/onboarding/_shared/extras-catalog.ts`
- Modify: `pages/onboarding/steps/integrations-step.tsx`
- Modify: `pages/onboarding/_shared/price-bar.tsx`
- Modify: `pages/onboarding/_shared/steps.tsx`

**Interfaces:**
- Consumes: `computePrice` from `@/shared/catalog`
- Produces: `IntegrationOption.priceSar: number`; `integrationsTotal(ids): number` exported from `extras-catalog.ts`; `PriceBar` gains a required `integrations: readonly IntegrationId[]` prop

- [ ] **Step 1: Price the integrations**

In `pages/onboarding/_shared/extras-catalog.ts`, add `priceSar` to the `IntegrationOption` interface and `priceSar: 200` to all ten entries, then append:

```ts
/** SAR per month for the selected connectors. Every vendor is 200 today, but
 *  reading it off the catalog means a per-vendor price is a data edit. */
export function integrationsTotal(ids: readonly IntegrationId[]): number {
  return INTEGRATIONS.filter((i) => ids.includes(i.id)).reduce((sum, i) => sum + i.priceSar, 0);
}
```

- [ ] **Step 2: Show the price on each card**

In `pages/onboarding/steps/integrations-step.tsx`, inside `IntegrationCard`, add under the description:

```tsx
        <p className="mt-1 text-[11.5px] font-semibold text-[var(--octo-text-primary)]">
          {formatSar(item.priceSar, locale)} <span className="font-normal text-[var(--octo-text-muted)]">{t("pricing.perMonth")}</span>
        </p>
```

Thread `locale` in from `useI18n()` in `IntegrationsStep` and pass it to `IntegrationCard` alongside `t`. Import `formatSar` from `@/shared/catalog`.

- [ ] **Step 3: Fold integrations into the running total**

In `pages/onboarding/_shared/price-bar.tsx`, add the prop and the extra line:

```tsx
export function PriceBar({
  modules, branchCount, integrations, action,
}: {
  modules: readonly ModuleId[];
  branchCount: number;
  integrations: readonly IntegrationId[];
  action: React.ReactNode;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const price = computePrice(modules, branchCount);
  const connectors = integrationsTotal(integrations);
  const total = price.total + connectors;
```

Render an extra `<li>` after the existing lines when `connectors > 0`, labelled `t("onboarding.integrations.category.delivery")`-style with a new key — use `"pricing.line.integrations"`, adding it to both locales as `"Integrations"` / `"التكاملات"`. Replace the two `price.total` reads with `total`.

- [ ] **Step 4: Pass the new prop**

In `index.tsx`, add `integrations={draft.integrations}` to the `<PriceBar>` call.

- [ ] **Step 5: Verify**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. In the browser: each integration card shows `SAR 200 / month`, and selecting one raises the price bar total by 200 with a new line in the expanded breakdown.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src packages/i18n
git commit -m "Price the onboarding integrations and add them to the running total"
```

---

### Task 10: Step 7 — Review Your Setup

**Files:**
- Create: `pages/onboarding/steps/review-step.tsx`
- Delete: `pages/onboarding/steps/summary-step.tsx`, `pages/onboarding/steps/review-step-slot.tsx`
- Modify: `pages/onboarding/_shared/steps.tsx`

**Interfaces:**
- Consumes: `computePrice`, `formatSar`, `getRestaurantType`, `getModule`, `verticals` from `@/shared/catalog`; `INTEGRATIONS`, `integrationsTotal` (Task 9); `CITIES` (Task 2)
- Produces: `ReviewStep: ComponentType<StepProps>`

- [ ] **Step 1: Write the step**

Create `pages/onboarding/steps/review-step.tsx`:

```tsx
// Step 7 — everything the merchant chose, in one place, with an edit link per
// card back to the step that owns it, and the plan beside it. Nothing new is
// decided here; this is the last look before the previews.
import { CheckCircle2, Pencil } from "lucide-react";
import {
  computePrice, formatSar, getModule, getRestaurantType, verticals,
} from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { INTEGRATIONS, integrationsTotal } from "../_shared/extras-catalog";
import { CITIES } from "../_shared/brand-catalog";
import type { StepProps } from "../_shared/steps";

export function ReviewStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
  const { brand } = draft;

  const vertical = verticals.find((v) => v.id === draft.vertical);
  const type = draft.type ? getRestaurantType(draft.type) : undefined;
  const city = CITIES.find((c) => c.id === brand.city);
  const selectedIntegrations = INTEGRATIONS.filter((i) => draft.integrations.includes(i.id));
  const price = computePrice(draft.enabled, brand.branchCount);
  const connectors = integrationsTotal(draft.integrations);

  const rows: { labelKey: string; value: string }[] = [
    { labelKey: "onboarding.review.industry", value: vertical ? t(vertical.nameKey) : "—" },
    { labelKey: "onboarding.review.type", value: type ? t(type.nameKey) : "—" },
    { labelKey: "onboarding.review.city", value: city ? t(city.labelKey) : "—" },
    { labelKey: "onboarding.review.branches", value: String(brand.branchCount) },
    { labelKey: "onboarding.review.currency", value: brand.currency },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <div className="flex flex-col gap-3">
        <Section titleKey="onboarding.review.business" onEdit={() => dispatch({ type: "goTo", step: 4 })} t={t}>
          <dl className="flex flex-col gap-2">
            {rows.map((row) => (
              <div key={row.labelKey} className="flex items-center justify-between gap-3 text-[12px]">
                <dt className="text-[var(--octo-text-muted)]">{t(row.labelKey)}</dt>
                <dd className="font-medium text-[var(--octo-text-primary)]">{row.value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 text-[12px]">
              <dt className="text-[var(--octo-text-muted)]">{t("onboarding.review.primaryColor")}</dt>
              <dd className="inline-flex items-center gap-1.5 rounded-[7px] border border-[var(--octo-border-card)] px-2 py-1">
                <span className="h-3.5 w-3.5 rounded-[4px]" style={{ backgroundColor: brand.primary }} />
                <span className="font-medium text-[var(--octo-text-primary)]">{brand.primary}</span>
              </dd>
            </div>
            {brand.logoDataUrl && (
              <div className="flex items-center justify-between gap-3 text-[12px]">
                <dt className="text-[var(--octo-text-muted)]">{t("onboarding.review.logo")}</dt>
                <dd><img src={brand.logoDataUrl} alt="" className="h-7 rounded-[6px] object-contain" /></dd>
              </div>
            )}
          </dl>
        </Section>

        <Section titleKey="onboarding.review.modules" onEdit={() => dispatch({ type: "goTo", step: 5 })} t={t}>
          <div className="flex flex-wrap gap-1.5">
            {draft.enabled.map((id) => {
              const module = getModule(id);
              return module ? (
                <span key={id} className="rounded-full bg-[var(--octo-hover)] px-2.5 py-1 text-[11.5px] text-[var(--octo-text-secondary)]">
                  {t(module.nameKey)}
                </span>
              ) : null;
            })}
          </div>
        </Section>

        <Section titleKey="onboarding.review.integrations" onEdit={() => dispatch({ type: "goTo", step: 6 })} t={t}>
          {selectedIntegrations.length === 0 ? (
            <p className="text-[11.5px] text-[var(--octo-text-faint)]">{t("onboarding.review.none")}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedIntegrations.map((item) => (
                <span key={item.id} className="rounded-full bg-[var(--octo-hover)] px-2.5 py-1 text-[11.5px] text-[var(--octo-text-secondary)]">
                  {item.name}
                </span>
              ))}
            </div>
          )}
        </Section>
      </div>

      <aside className="h-fit rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <h3 className="text-[14px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.review.plan")}</h3>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] bg-[#0D6EFD] px-3 py-2.5 text-white">
          <span className="text-[11.5px] font-medium">{t("onboarding.review.subscription")}</span>
          <span className="text-[12.5px] font-bold">{formatSar(price.total, locale)}</span>
        </div>

        {selectedIntegrations.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5 border-b border-[var(--octo-divider)] pb-3">
            {selectedIntegrations.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-[11.5px]">
                <span className="text-[var(--octo-text-secondary)]">{item.name}</span>
                <span className="font-medium text-[var(--octo-text-primary)]">{formatSar(item.priceSar, locale)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] bg-[var(--octo-hover)] px-3 py-2.5">
          <span className="text-[11.5px] font-semibold text-[var(--octo-text-secondary)]">{t("onboarding.review.total")}</span>
          <span className="text-[15px] font-bold text-[#0D6EFD]">{formatSar(price.total + connectors, locale)}</span>
        </div>

        {price.hasQuotedItems && (
          <p className="mt-2 text-[10.5px] text-[var(--octo-text-faint)]">{t("pricing.quoted")}</p>
        )}
      </aside>
    </div>
  );
}

function Section({
  titleKey, onEdit, t, children,
}: {
  titleKey: string;
  onEdit: () => void;
  t: (key: string) => string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[12.5px] font-bold text-[var(--octo-text-primary)]">{t(titleKey)}</h3>
        <button
          type="button"
          onClick={onEdit}
          aria-label={t("common.edit")}
          className="text-[var(--octo-text-faint)] transition-colors hover:text-[#0D6EFD]"
        >
          <Pencil size={13} />
        </button>
      </div>
      <div className="mt-3">{children}</div>
      <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#22C55E]">
        <CheckCircle2 size={12} />
        {t("onboarding.review.completed")}
      </p>
    </section>
  );
}
```

If `common.edit` is not already a key in the locales, add it (`"Edit"` / `"تعديل"`).

- [ ] **Step 2: Swap it in and delete the old summary**

In `_shared/steps.tsx`, replace `Component: ReviewStepSlot` with `Component: ReviewStep` in the `review` entry and fix the import.

```bash
git rm apps/merchant/src/pages/onboarding/steps/summary-step.tsx
git rm apps/merchant/src/pages/onboarding/steps/review-step-slot.tsx
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. In the browser: step 7 lists the industry, type, city, branches, currency, colour and logo the merchant actually entered; the pencil on each card jumps to the right step; the plan total equals the price bar total from step 6.

- [ ] **Step 4: Commit**

```bash
git add -A apps/merchant/src packages/i18n
git commit -m "Replace the onboarding summary with the Review Your Setup step"
```

---

### Task 11: Step 8 — Public Link Preview

**Files:**
- Create: `pages/onboarding/steps/public-link-step.tsx`
- Modify: `pages/onboarding/_shared/steps.tsx`

**Interfaces:**
- Consumes: `publicLinkAsset`, `IPHONE_FRAME_URL` (Task 1), `serviceCategoriesFor` (Task 2), `getModule` from `@/shared/catalog`, `Segmented` from `@ui/primitives`
- Produces: `PublicLinkStep: ComponentType<StepProps>`

- [ ] **Step 1: Write the step**

Create `pages/onboarding/steps/public-link-step.tsx`:

```tsx
// Step 8 — the customer-facing page, rendered rather than screenshotted, so it
// honours the merchant's colour, logo and language instead of showing someone
// else's restaurant. Desktop and mobile are the same markup at two widths.
import { useState } from "react";
import { Check, Copy, GripVertical, Link2, Monitor, Smartphone } from "lucide-react";
import clsx from "clsx";
import { Input, Segmented } from "@ui/primitives";
import { getModule } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { publicLinkAsset } from "../_shared/assets";
import { serviceCategoriesFor } from "../_shared/ai-insights";
import type { StepProps } from "../_shared/steps";

const CATEGORY_IMAGES = ["cat-desserts.webp", "cat-mains.webp", "cat-breakfast.webp", "cat-drinks.webp"];
// Three dishes exist where the design shows six; they repeat until the rest arrive.
const DISH_IMAGES = ["dish-1.webp", "dish-2.webp", "dish-3.webp", "dish-1.webp", "dish-2.webp", "dish-3.webp"];

const SECTION_LABELS: Record<string, string> = {
  hero: "onboarding.publicLink.section.hero",
  offers: "onboarding.publicLink.section.offers",
  menu: "onboarding.publicLink.section.menu",
  bestSeller: "onboarding.publicLink.section.bestSeller",
};

export function PublicLinkStep({ draft, dispatch }: StepProps) {
  const { t } = useI18n();
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const { brand, publicLink } = draft;

  const categories = serviceCategoriesFor(draft.type);
  const url = `https://${publicLink.tag || "restaurant"}.octopus.app`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              options={[
                { id: "desktop", label: <Monitor size={14} /> },
                { id: "mobile", label: <Smartphone size={14} /> },
              ]}
              value={view}
              onChange={(id) => setView(id as "desktop" | "mobile")}
            />
            <span className="text-[11.5px] text-[var(--octo-text-muted)]">{t("onboarding.publicLink.viewAsCustomer")}</span>
          </div>

          <div className={clsx("mx-auto mt-4 overflow-hidden rounded-xl border border-[var(--octo-border-card)]", view === "mobile" && "max-w-[320px]")}>
            <header className="flex items-center justify-between gap-3 px-3 py-2" style={{ backgroundColor: brand.secondary }}>
              {brand.logoDataUrl ? (
                <img src={brand.logoDataUrl} alt="" className="h-6 object-contain" />
              ) : (
                <span className="text-[12px] font-bold text-white">{brand.businessName || "OCTOPUS"}</span>
              )}
              <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: brand.primary }}>
                {t("onboarding.publicLink.live")}
              </span>
            </header>

            <div className="relative">
              <img src={publicLinkAsset("hero.webp")} alt="" className="h-40 w-full object-cover" />
              <div className="absolute inset-0 grid place-items-center bg-black/45 px-4 text-center">
                <p className="text-[15px] font-bold text-white">{brand.businessName || t("onboarding.businessName")}</p>
              </div>
            </div>

            <div className="bg-[var(--octo-page-bg)] p-3">
              <div className={clsx("grid gap-2", view === "mobile" ? "grid-cols-2" : "grid-cols-4")}>
                {categories.map((key, i) => (
                  <div key={key} className="flex items-center gap-2 overflow-hidden rounded-[10px] bg-[var(--octo-card)] p-2">
                    <img src={publicLinkAsset(CATEGORY_IMAGES[i % CATEGORY_IMAGES.length])} alt="" className="h-9 w-9 shrink-0 object-contain" />
                    <span className="truncate text-[10.5px] font-medium text-[var(--octo-text-primary)]">{t(key)}</span>
                  </div>
                ))}
              </div>

              <div className={clsx("mt-3 grid gap-2", view === "mobile" ? "grid-cols-2" : "grid-cols-3")}>
                {DISH_IMAGES.map((image, i) => (
                  <div key={`${image}-${i}`} className="overflow-hidden rounded-[10px] bg-[var(--octo-card)] p-2">
                    <img src={publicLinkAsset(image)} alt="" className="h-20 w-full object-contain" />
                    <p className="mt-1.5 truncate text-[10.5px] font-medium text-[var(--octo-text-primary)]">
                      {t(categories[i % categories.length])}
                    </p>
                    <p className="text-[10.5px] font-bold" style={{ color: brand.primary }}>SAR {45 + i * 5}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="flex h-fit flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
          <div>
            <p className="text-[11.5px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.publicLink.yourLink")}</p>
            <p className="mt-1 text-[10.5px] text-[var(--octo-text-muted)]">{t("onboarding.publicLink.yourLinkNote")}</p>
            <p className="mt-2 flex items-center gap-1.5 rounded-[9px] bg-[var(--octo-hover)] px-2.5 py-2 text-[11px] text-[#0D6EFD]">
              <Link2 size={12} className="shrink-0" />
              <span className="truncate">{url}</span>
              <Copy size={12} className="ms-auto shrink-0 text-[var(--octo-text-faint)]" />
            </p>
          </div>

          <Input
            label={t("onboarding.publicLink.customTag")}
            value={publicLink.tag}
            onChange={(e) => dispatch({ type: "patchPublicLink", patch: { tag: e.target.value.replace(/[^a-z0-9-]/gi, "").toLowerCase() } })}
            className="!py-2 !text-[12px]"
          />

          <div>
            <p className="text-[11.5px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.publicLink.theming")}</p>
            <label className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[var(--octo-text-secondary)]">
              {t("onboarding.publicLink.primaryColor")}
              <input
                type="color"
                value={brand.primary}
                onChange={(e) => dispatch({ type: "patchBrand", patch: { primary: e.target.value } })}
                className="h-6 w-14 cursor-pointer rounded border border-[var(--octo-border-input)] bg-transparent p-0.5"
              />
            </label>
            <label className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[var(--octo-text-secondary)]">
              {t("onboarding.publicLink.secondaryColor")}
              <input
                type="color"
                value={brand.secondary}
                onChange={(e) => dispatch({ type: "patchBrand", patch: { secondary: e.target.value } })}
                className="h-6 w-14 cursor-pointer rounded border border-[var(--octo-border-input)] bg-transparent p-0.5"
              />
            </label>
          </div>

          <div>
            <p className="text-[11.5px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.publicLink.connectedModules")}</p>
            <p className="mt-1 text-[10.5px] text-[var(--octo-text-muted)]">
              {t("onboarding.publicLink.connectedNote").replace("{n}", String(draft.enabled.length))}
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {draft.enabled.map((id) => {
                const module = getModule(id);
                return module ? (
                  <li key={id} className="flex items-center justify-between gap-2 rounded-[8px] bg-[var(--octo-hover)] px-2.5 py-1.5 text-[10.5px]">
                    <span className="truncate text-[var(--octo-text-secondary)]">{t(module.nameKey)}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[#22C55E]">
                      <Check size={10} strokeWidth={3} />
                      {t("onboarding.publicLink.live")}
                    </span>
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        </aside>
      </div>

      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <h3 className="text-[13px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.publicLink.customize")}</h3>
        <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{t("onboarding.publicLink.customizeNote")}</p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {publicLink.sections.map((id) => (
            <li key={id} className="flex items-center gap-2 rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[11.5px] text-[var(--octo-text-secondary)]">
              <GripVertical size={13} className="text-[var(--octo-text-faint)]" />
              {t(SECTION_LABELS[id] ?? id)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

The section list is not draggable. Drag-and-drop reordering is not in scope here and a handle that does nothing when dragged would be worse than a handle that reads as an affordance for a later task — if the review objects to the icon, drop the `GripVertical` rather than fake the behaviour.

- [ ] **Step 2: Insert it as step 8**

In `_shared/steps.tsx`, import `PublicLinkStep` and insert this entry between `review` and `payment`:

```ts
  {
    id: "publicLink",
    labelKey: "onboarding.rail.publicLink",
    titleKey: "onboarding.publicLink.title",
    subtitleKey: "onboarding.publicLink.subtitle",
    Component: PublicLinkStep,
    canContinue: () => true,
    showPriceBar: false,
  },
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. If Task 1's `sharp` step was skipped, change the `.webp` filenames in `CATEGORY_IMAGES`, `DISH_IMAGES` and the hero to `.png`. In the browser: the rail shows nine steps; the desktop/mobile toggle changes the preview width; editing the custom tag updates the URL; changing the primary colour recolours the header badge and the prices.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/onboarding
git commit -m "Add the Public Link Preview step"
```

---

### Task 12: Step 9 — Dashboard Preview

**Files:**
- Create: `pages/onboarding/steps/dashboard-preview-step.tsx`
- Modify: `pages/onboarding/_shared/steps.tsx`

**Interfaces:**
- Consumes: `getModule`, `formatSar` from `@/shared/catalog`, `CatalogIcon`, `Tabs` from `@ui/primitives`, `CITIES` (Task 2)
- Produces: `DashboardPreviewStep: ComponentType<StepProps>`

- [ ] **Step 1: Write the step**

Create `pages/onboarding/steps/dashboard-preview-step.tsx`:

```tsx
// Step 9 — a small, real dashboard rather than a screenshot, so it follows the
// active theme and reading direction. The figures are obviously sample data and
// are labelled as such; the module list and the summary are the merchant's own.
import { useState } from "react";
import { CheckCircle2, Info, Pencil } from "lucide-react";
import { Tabs } from "@ui/primitives";
import { formatSar, getModule, getRestaurantType, verticals } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { CITIES } from "../_shared/brand-catalog";
import { INTEGRATIONS } from "../_shared/extras-catalog";
import type { StepProps } from "../_shared/steps";

const SAMPLE_TILES = [
  { labelKey: "dashboard.kpi.orders", value: "220" },
  { labelKey: "dashboard.kpi.reservations", value: "48" },
  { labelKey: "dashboard.kpi.revenue", value: 28000 },
  { labelKey: "dashboard.kpi.averageTicket", value: 145 },
];

export function DashboardPreviewStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState(draft.enabled[0] ?? "core");
  const { brand } = draft;

  const vertical = verticals.find((v) => v.id === draft.vertical);
  const type = draft.type ? getRestaurantType(draft.type) : undefined;
  const city = CITIES.find((c) => c.id === brand.city);
  const tabs = draft.enabled
    .map((id) => getModule(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => ({ id: m.id, label: t(m.nameKey) }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <Tabs items={tabs} value={tab} onChange={setTab} />

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLE_TILES.map((tile) => (
            <div key={tile.labelKey} className="rounded-[10px] border border-[var(--octo-border-card)] p-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t(tile.labelKey)}
              </p>
              <p className="mt-1 text-[19px] font-bold text-[var(--octo-text-primary)]">
                {typeof tile.value === "number" ? formatSar(tile.value, locale) : tile.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {draft.enabled.slice(0, 6).map((id) => {
            const module = getModule(id);
            return module ? (
              <div key={id} className="flex items-center gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-white" style={{ backgroundColor: brand.primary }}>
                  <CatalogIcon name={module.icon} size={14} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-[var(--octo-text-primary)]">{t(module.nameKey)}</span>
                  <span className="block truncate text-[10.5px] text-[var(--octo-text-muted)]">{t(module.descKey)}</span>
                </span>
              </div>
            ) : null;
          })}
        </div>

        <p className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--octo-hover)] px-2.5 py-1.5 text-[10.5px] text-[var(--octo-text-muted)]">
          <Info size={11} />
          {t("onboarding.dashboardPreview.sampleNote")}
        </p>
      </section>

      <aside className="h-fit rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <h3 className="text-[13px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.dashboardPreview.summary")}</h3>

        <SummaryBlock titleKey="onboarding.review.business" onEdit={() => dispatch({ type: "goTo", step: 4 })} t={t}>
          <Row labelKey="onboarding.review.industry" value={vertical ? t(vertical.nameKey) : "—"} t={t} />
          <Row labelKey="onboarding.review.type" value={type ? t(type.nameKey) : "—"} t={t} />
          <Row labelKey="onboarding.review.city" value={city ? t(city.labelKey) : "—"} t={t} />
          <Row labelKey="onboarding.review.branches" value={String(brand.branchCount)} t={t} />
          <Row labelKey="onboarding.review.currency" value={brand.currency} t={t} />
        </SummaryBlock>

        <SummaryBlock titleKey="onboarding.review.modules" onEdit={() => dispatch({ type: "goTo", step: 5 })} t={t}>
          <div className="flex flex-wrap gap-1">
            {draft.enabled.map((id) => {
              const module = getModule(id);
              return module ? (
                <span key={id} className="rounded-full bg-[var(--octo-hover)] px-2 py-0.5 text-[10.5px] text-[var(--octo-text-secondary)]">
                  {t(module.nameKey)}
                </span>
              ) : null;
            })}
          </div>
        </SummaryBlock>

        <SummaryBlock titleKey="onboarding.review.integrations" onEdit={() => dispatch({ type: "goTo", step: 6 })} t={t}>
          <div className="flex flex-wrap gap-1">
            {INTEGRATIONS.filter((i) => draft.integrations.includes(i.id)).map((i) => (
              <span key={i.id} className="rounded-full bg-[var(--octo-hover)] px-2 py-0.5 text-[10.5px] text-[var(--octo-text-secondary)]">
                {i.name}
              </span>
            ))}
          </div>
        </SummaryBlock>

        <p className="mt-3 flex items-start gap-1.5 rounded-[8px] bg-[var(--octo-hover)] px-2.5 py-2 text-[10.5px] text-[var(--octo-text-secondary)]">
          <Info size={11} className="mt-0.5 shrink-0 text-[#0D6EFD]" />
          {t("onboarding.dashboardPreview.configured")}
        </p>
      </aside>
    </div>
  );
}

function SummaryBlock({
  titleKey, onEdit, t, children,
}: {
  titleKey: string;
  onEdit: () => void;
  t: (key: string) => string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 border-t border-[var(--octo-divider)] pt-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11.5px] font-semibold text-[var(--octo-text-primary)]">{t(titleKey)}</p>
        <button type="button" onClick={onEdit} aria-label={t("common.edit")} className="text-[var(--octo-text-faint)] hover:text-[#0D6EFD]">
          <Pencil size={12} />
        </button>
      </div>
      <div className="mt-2">{children}</div>
      <p className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-[#22C55E]">
        <CheckCircle2 size={11} />
        {t("onboarding.review.completed")}
      </p>
    </div>
  );
}

function Row({ labelKey, value, t }: { labelKey: string; value: string; t: (key: string) => string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-[var(--octo-text-muted)]">{t(labelKey)}</span>
      <span className="font-medium text-[var(--octo-text-primary)]">{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Add the four sample-tile keys and the sample note**

Add to both locales, in the same order:

```ts
  "onboarding.dashboardPreview.sampleNote": "Sample figures — your real numbers appear once you start trading.",
```

Then check whether `dashboard.kpi.orders`, `dashboard.kpi.reservations`, `dashboard.kpi.revenue` and `dashboard.kpi.averageTicket` already exist:

```bash
grep -c "dashboard.kpi.orders\|dashboard.kpi.reservations\|dashboard.kpi.revenue\|dashboard.kpi.averageTicket" packages/i18n/src/locales/en/index.ts
```
If the count is below 4, add the missing keys with values `"Orders"`, `"Reservations"`, `"Revenue"`, `"Average Ticket"` and their Arabic equivalents.

- [ ] **Step 3: Insert it as step 9**

In `_shared/steps.tsx`, import `DashboardPreviewStep` and insert between `publicLink` and `payment`:

```ts
  {
    id: "dashboardPreview",
    labelKey: "onboarding.rail.dashboardPreview",
    titleKey: "onboarding.dashboardPreview.title",
    subtitleKey: "onboarding.dashboardPreview.subtitle",
    Component: DashboardPreviewStep,
    canContinue: () => true,
    showPriceBar: false,
  },
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. In the browser: the rail now shows ten steps; the module tabs match the merchant's selection; switching to Arabic mirrors the layout and switching to dark mode recolours it — this is the reason the step is components rather than an image.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src packages/i18n
git commit -m "Add the Dashboard Preview step"
```

---

### Task 13: Step 10 — Create Account modal and Payment

**Files:**
- Create: `pages/onboarding/steps/create-account-modal.tsx`
- Create: `pages/onboarding/steps/payment-step.tsx`
- Delete: `pages/onboarding/steps/payment-step-slot.tsx`, `pages/onboarding/steps/account-step.tsx`, `pages/onboarding/steps/launch-step.tsx`
- Modify: `pages/onboarding/_shared/steps.tsx`, `pages/onboarding/index.tsx`

**Interfaces:**
- Consumes: `PAYMENT_METHODS`, `simulatePayment` (Task 2), `paymentLogo` (Task 1), `Modal`, `Input`, `Button` from `@ui/primitives`, `GoogleIcon`/`AppleIcon`/`MicrosoftIcon` from `@/features/session/login/social-icons`
- Produces: `CreateAccountModal`, `PaymentStep: ComponentType<StepProps>`

- [ ] **Step 1: Write the account modal**

Create `pages/onboarding/steps/create-account-modal.tsx`:

```tsx
// The account gate in front of payment. MOCK: nothing is sent anywhere and the
// social buttons only fill in a demo address, the same shortcut the login
// screen takes — they do not authenticate against Google, Apple or Microsoft.
import { useState } from "react";
import { Building2, CheckCircle2, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button, Input, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { GoogleIcon, AppleIcon, MicrosoftIcon } from "@/features/session/login/social-icons";
import type { AccountFields } from "../_shared/draft";

const PROVIDERS = [
  { id: "google", Icon: GoogleIcon, labelKey: "login.google" },
  { id: "apple", Icon: AppleIcon, labelKey: "login.apple" },
  { id: "microsoft", Icon: MicrosoftIcon, labelKey: "login.microsoft" },
] as const;

export function CreateAccountModal({
  open, account, created, onPatch, onCreate, onContinue,
}: {
  open: boolean;
  account: AccountFields;
  created: boolean;
  onPatch: (patch: Partial<AccountFields>) => void;
  onCreate: () => void;
  onContinue: () => void;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  const valid = account.fullName.trim() !== "" && account.email.trim() !== "" && account.password.trim() !== "";

  if (created) {
    return (
      <Modal open={open} onClose={onContinue}>
        <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
          <CheckCircle2 size={40} className="text-[#22C55E]" />
          <p className="text-[17px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.account.createdTitle")}</p>
          <p className="max-w-[380px] text-[12px] leading-relaxed text-[var(--octo-text-muted)]">
            {t("onboarding.account.createdNote")}
          </p>
          <Button variant="primary" className="mt-2 w-full justify-center !py-2.5" onClick={onContinue}>
            {t("onboarding.account.continueToPayment")}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onContinue} title={t("onboarding.account.title")}>
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map(({ id, Icon, labelKey }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPatch({ email: account.email || `owner@${id}.demo` })}
            className="flex items-center justify-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-2.5 text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--octo-divider)]" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--octo-text-faint)]">
          {t("onboarding.account.or")}
        </span>
        <span className="h-px flex-1 bg-[var(--octo-divider)]" />
      </div>

      <div className="flex flex-col gap-3">
        <Input
          label={t("onboarding.account.fullName")}
          icon={<User size={15} />}
          placeholder={t("onboarding.account.fullNamePlaceholder")}
          value={account.fullName}
          onChange={(e) => onPatch({ fullName: e.target.value })}
          className="!py-2.5 !text-[13px]"
        />
        <Input
          type="email"
          label={t("onboarding.email")}
          icon={<Mail size={15} />}
          placeholder={t("onboarding.account.emailPlaceholder")}
          value={account.email}
          onChange={(e) => onPatch({ email: e.target.value })}
          className="!py-2.5 !text-[13px]"
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("onboarding.account.createPassword")}
          </span>
          <span className="relative flex items-center">
            <span className="pointer-events-none absolute start-3.5 text-[var(--octo-text-muted)]"><Lock size={15} /></span>
            <input
              type={visible ? "text" : "password"}
              value={account.password}
              onChange={(e) => onPatch({ password: e.target.value })}
              placeholder={t("onboarding.account.passwordPlaceholder")}
              className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3.5 py-2.5 ps-9 pe-10 text-[13px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={t(visible ? "common.hidePassword" : "common.showPassword")}
              className="absolute end-3.5 text-[var(--octo-text-muted)] transition-colors hover:text-[var(--octo-text-secondary)]"
            >
              {visible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </span>
        </label>
        <Input
          label={t("onboarding.account.companyName")}
          icon={<Building2 size={15} />}
          placeholder={t("onboarding.account.companyNamePlaceholder")}
          value={account.companyName}
          onChange={(e) => onPatch({ companyName: e.target.value })}
          className="!py-2.5 !text-[13px]"
        />

        <Button variant="primary" disabled={!valid} className="mt-1 w-full justify-center !py-2.5" onClick={onCreate}>
          {t("onboarding.account.submit")}
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Write the payment step**

Create `pages/onboarding/steps/payment-step.tsx`:

```tsx
// Step 10 — the plan, the methods, and a checkout that is honestly a demo.
// `simulatePayment` is a timer, not a gateway, and the page says so.
import { useState } from "react";
import { CheckCircle2, CreditCard, Info, Link2, Loader2 } from "lucide-react";
import clsx from "clsx";
import { Button, Modal } from "@ui/primitives";
import { computePrice, formatSar } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { INTEGRATIONS, integrationsTotal } from "../_shared/extras-catalog";
import { PAYMENT_METHODS, simulatePayment } from "../_shared/payment-catalog";
import { paymentLogo } from "../_shared/assets";
import { CreateAccountModal } from "./create-account-modal";
import type { StepProps } from "../_shared/steps";

const INCLUDES = [
  "onboarding.payment.includesDashboard",
  "onboarding.payment.includesModules",
  "onboarding.payment.includesPublicLink",
];

export function PaymentStep({ draft, dispatch }: StepProps) {
  const { t, locale } = useI18n();
  const [accountOpen, setAccountOpen] = useState(!draft.accountCreated);
  const [processing, setProcessing] = useState(false);

  const price = computePrice(draft.enabled, draft.brand.branchCount);
  const connectors = integrationsTotal(draft.integrations);
  const total = price.total + connectors;
  const selectedIntegrations = INTEGRATIONS.filter((i) => draft.integrations.includes(i.id));

  async function handlePay() {
    if (!draft.paymentMethod) return;
    setProcessing(true);
    await simulatePayment();
    setProcessing(false);
    dispatch({ type: "paid" });
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.payment.plan")}</p>
            <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("onboarding.payment.includes")}
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {INCLUDES.map((key) => (
                <li key={key} className="flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-secondary)]">
                  <CheckCircle2 size={12} className="text-[#0D6EFD]" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[17px] font-bold text-[#0D6EFD]">
            {formatSar(price.total, locale)} <span className="text-[11px] font-normal text-[var(--octo-text-muted)]">{t("pricing.perMonth")}</span>
          </p>
        </div>
      </section>

      {selectedIntegrations.length > 0 && (
        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
          <p className="text-[12px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.review.integrations")}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {selectedIntegrations.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-[11.5px]">
                <span className="text-[var(--octo-text-secondary)]">{item.name}</span>
                <span className="font-medium text-[var(--octo-text-primary)]">{formatSar(item.priceSar, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.review.total")}</p>
          <p className="text-[19px] font-bold text-[#0D6EFD]">{formatSar(total, locale)}</p>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-[var(--octo-text-muted)]">
          <Info size={11} />
          {t("onboarding.payment.renewNote")}
        </p>
      </section>

      <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <p className="text-[12.5px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.payment.methods")}</p>
        <div className="mt-3 flex flex-col gap-2">
          {PAYMENT_METHODS.map((method) => {
            const active = draft.paymentMethod === method.id;
            return (
              <button
                key={method.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => dispatch({ type: "setPaymentMethod", id: method.id })}
                className={clsx(
                  "flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-start transition-colors",
                  active
                    ? "border-[#0D6EFD] bg-[var(--octo-selected)]"
                    : "border-[var(--octo-border-input)] hover:bg-[var(--octo-hover)]"
                )}
              >
                {method.logo ? (
                  <img src={paymentLogo(method.logo)} alt="" className="h-5 w-10 shrink-0 object-contain" />
                ) : (
                  <CreditCard size={18} className="shrink-0 text-[var(--octo-text-muted)]" />
                )}
                <span className="flex-1 text-[12.5px] font-medium text-[var(--octo-text-primary)]">{t(method.labelKey)}</span>
                <span className={clsx(
                  "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                  active ? "border-[#0D6EFD]" : "border-[var(--octo-border-input)]"
                )}>
                  {active && <span className="h-2 w-2 rounded-full bg-[#0D6EFD]" />}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          variant="primary"
          disabled={!draft.paymentMethod || processing}
          className="mt-4 w-full justify-center !py-3 !text-[13.5px]"
          onClick={handlePay}
        >
          {t("onboarding.payment.pay").replace("{amount}", formatSar(total, locale))}
        </Button>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-[10.5px] text-[var(--octo-text-faint)]">
          <Info size={11} />
          {t("onboarding.payment.demoNote")}
        </p>
      </section>

      <CreateAccountModal
        open={accountOpen}
        account={draft.account}
        created={draft.accountCreated}
        onPatch={(patch) => dispatch({ type: "patchAccount", patch })}
        onCreate={() => dispatch({ type: "accountCreated" })}
        onContinue={() => setAccountOpen(false)}
      />

      <Modal open={processing} onClose={() => undefined}>
        <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
          <Loader2 size={34} className="animate-spin text-[#0D6EFD]" />
          <p className="text-[15px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.payment.processing")}</p>
          <p className="text-[11.5px] text-[var(--octo-text-muted)]">{t("onboarding.payment.processingNote")}</p>
        </div>
      </Modal>

      <Modal open={draft.paid} onClose={() => undefined}>
        <div className="flex flex-col items-center gap-3 px-2 py-4 text-center">
          <CheckCircle2 size={40} className="text-[#22C55E]" />
          <p className="text-[17px] font-bold text-[var(--octo-text-primary)]">{t("onboarding.payment.success")}</p>
          <p className="max-w-[380px] text-[12px] leading-relaxed text-[var(--octo-text-muted)]">
            {t("onboarding.payment.successNote")}
          </p>
          <p className="inline-flex items-center gap-1.5 text-[11.5px] text-[#0D6EFD]">
            <Link2 size={12} />
            {`https://${draft.publicLink.tag || "restaurant"}.octopus.app`}
          </p>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Make the final button finish the flow**

The success modal has no button of its own — the sticky footer's primary button is the one that calls `handleFinish`. In `_shared/steps.tsx`, change the `payment` entry to `Component: PaymentStep` and `canContinue: (d) => d.paid`, so the merchant cannot leave before the mock payment resolves. Then in `index.tsx`, change the last-step label from `t("onboarding.create")` to `t("onboarding.payment.goToDashboard")`.

- [ ] **Step 4: Delete the superseded files**

```bash
git rm apps/merchant/src/pages/onboarding/steps/payment-step-slot.tsx
git rm apps/merchant/src/pages/onboarding/steps/account-step.tsx
git rm apps/merchant/src/pages/onboarding/steps/launch-step.tsx
```

`AccountDetails` was exported from `account-step.tsx`; grep for it and remove any remaining import.

```bash
grep -rn "AccountDetails\|account-step\|launch-step" apps/merchant/src
```
Expected after the fix: no matches.

- [ ] **Step 5: Verify**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. In the browser: reaching step 10 opens the Create Account modal; filling it and submitting shows the success dialog, then the payment page; picking a method and paying shows the processing dialog for ~2s, then the success dialog; the footer button then lands on the dashboard with the new business selected.

- [ ] **Step 6: Commit**

```bash
git add -A apps/merchant/src/pages/onboarding
git commit -m "Add the Create Account modal and the Payment step"
```

---

### Task 14: Remove the dead code and keys

**Files:**
- Modify: `pages/onboarding/_shared/extras-catalog.ts`
- Modify: `packages/i18n/src/locales/{en,ar}/index.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: nothing new — this task only removes

- [ ] **Step 1: Confirm the dropped concepts have no callers**

```bash
grep -rn "GOALS\|GoalId\|SECURITY_OPTIONS\|SecuritySettings\|SecurityOption\|WORKFLOW_TEMPLATES\|WorkflowId\|TeamInvite\|TeamRole\|DEFAULT_SECURITY" apps/merchant/src
```
Expected: matches only inside `_shared/extras-catalog.ts` itself. If anything else matches, fix that file before deleting.

- [ ] **Step 2: Trim the catalog**

In `pages/onboarding/_shared/extras-catalog.ts`, delete everything except the `IntegrationCategory`, `IntegrationOption`, `IntegrationId` types, the `INTEGRATIONS` array and `integrationsTotal`. Update the file's header comment to describe only what remains:

```ts
// The connector list offered during onboarding. Nothing here actually connects
// anything — real setup happens later in Settings → Integrations, which lists
// this exact same vendor set so nothing here feels invented.
```

- [ ] **Step 3: Delete the dead i18n keys**

Remove every key matching these prefixes from BOTH locale files: `onboarding.goals.`, `onboarding.security.`, `onboarding.workflows.`, `onboarding.team.`, `onboarding.launch.checklist.`, `onboarding.launch.readiness`, `onboarding.rail.step` (the old numbered rail labels), `onboarding.step3.`, `onboarding.step7.`, `onboarding.step8.`, `onboarding.step9.`.

Before deleting each prefix, confirm nothing still reads it:

```bash
grep -rn "onboarding.goals.\|onboarding.security.\|onboarding.workflows.\|onboarding.team.\|onboarding.launch.\|onboarding.rail.step" apps/merchant/src
```
Expected: no matches. Do not delete a key that still has a caller — fix the caller or keep the key.

- [ ] **Step 4: Re-check locale symmetry**

```bash
grep -o '"[a-zA-Z0-9._]*":' packages/i18n/src/locales/en/index.ts | sort > /tmp/en.keys
grep -o '"[a-zA-Z0-9._]*":' packages/i18n/src/locales/ar/index.ts | sort > /tmp/ar.keys
diff /tmp/en.keys /tmp/ar.keys && echo "IN SYNC"
```
Expected: `IN SYNC`.

- [ ] **Step 5: Full verification pass**

```bash
pnpm --filter merchant build
pnpm --filter merchant lint
```
Expected: both pass. Then `pnpm --filter merchant dev` and walk all ten steps in four combinations — English light, English dark, Arabic light, Arabic dark. On each pass check that: no string renders as a raw key, nothing is clipped or mirrored wrongly in Arabic, no element is invisible in dark mode, and a refresh mid-flow resumes on the same step with the same answers. Finally open Settings → My Businesses → Create Business and complete that modal end to end.

- [ ] **Step 6: Commit**

```bash
git add -A apps/merchant/src packages/i18n
git commit -m "Remove the onboarding steps and keys the redesign dropped"
```

---

## Self-Review Notes

- **Spec coverage.** Step map → Tasks 4, 5, 7, 10, 11, 12, 13. Deletions → Tasks 4 and 14. `use-onboarding-draft` + `steps.tsx` + `StepShell` → Tasks 2 and 4. `brand-catalog` / `ai-insights` / `payment-catalog` / `priceSar` → Tasks 2 and 9. Asset gaps and image weight → Task 1. i18n, RTL and dark mode → Tasks 3 and 14. Widget/modal isolation → verified in Tasks 4, 6 and 8.
- **Known ordering hazard.** Task 1's `.webp` conversion changes the filenames Task 11 imports. If Step 2 of Task 1 was skipped, Task 11's constants must use `.png`; that instruction is inline in Task 11.
- **`PriceBar` signature changes in Task 9**, which means Task 4's call site is edited again there. That is deliberate — Task 4 must not depend on a prop that does not exist yet.
- **`Answers` compatibility.** `widgets/business-wizard/questions-step.tsx` exports `Answers`, and `ModulesStep`/`QuestionsStep` take it. `OnboardingDraft.answers` is typed `Record<string, string>`. Before Task 4, open `questions-step.tsx` and confirm `Answers` is structurally `Record<string, string>`; if it is narrower, widen the draft field to match rather than casting at each call site.
- **`Segmented` and `Tabs` label types.** Task 11 passes a lucide element as `Segmented`'s `label`, and Task 12 passes a string to `Tabs`. Both are typed `ReactNode`, so both are valid — but check the rendered width in the browser, as an icon-only segment may need a `className` nudge.
