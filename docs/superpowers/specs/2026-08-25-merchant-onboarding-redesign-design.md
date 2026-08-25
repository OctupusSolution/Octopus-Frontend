# Merchant Onboarding Redesign

**Date:** 2026-08-25
**Scope:** `apps/merchant` — the ten-step signup wizard
**Status:** Approved for planning

## Why

The onboarding flow is being rebuilt against a new design. The change is
structural, not cosmetic: three steps are dropped, five are new, and every
remaining step moves from a single 900px column to a two-column layout with an
AI insight panel beside it.

## Decisions

These were settled before design and are not open questions:

| Question | Decision |
|---|---|
| Scope | Full restructure — all ten steps |
| Backend | None. Every new step is UI over local mock state |
| Get Started's three paths | All three enter the same wizard; the difference is visual only |
| Goals / Data & Security / Team & Workflows | Deleted outright, with their i18n keys |
| RTL and dark mode | Both supported, exactly as the rest of the app |
| Brand colour and logo | Live inside the wizard only — never written to `TenantConfig` |

## Step Map

| # | New step | Origin |
|---|---|---|
| 1 | Get Started — hero, three entry cards | new |
| 2 | Business Type + AI Insights | `VerticalStep`, restyled |
| 3 | Services | `TypeStep`, restyled |
| 4 | Business Details & Brand Setup + AI Assistant | new; absorbs `QuestionsStep` as form fields |
| 5 | Modules + AI Summary | `ModulesStep` plus search and a selected-count badge |
| 6 | Integrations — grouped by category, priced | `IntegrationsStep`, restyled |
| 7 | Review + Your Plan | `SummaryStep`, rewritten |
| 8 | Public Link Preview | new |
| 9 | Dashboard Preview | new |
| 10 | Payment, behind a Create Account modal | `LaunchStep` + `AccountStep`, rewritten |

Deleted: `steps/goals-step.tsx`, `steps/data-security-step.tsx`,
`steps/team-workflows-step.tsx`, their sections of `_shared/extras-catalog.ts`,
and every `onboarding.goals.*`, `onboarding.security.*`,
`onboarding.workflows.*`, `onboarding.team.*` key in both locales.

## Architecture

`pages/onboarding/index.tsx` becomes an orchestrator and nothing else. Today it
owns eleven `useState` hooks and a chain of `step === n &&` conditions; five
more steps would push it past six hundred lines and make the continue-guard
unreadable. Two pieces replace that:

**`_shared/use-onboarding-draft.ts`** — one `useReducer` over the whole draft,
plus the sessionStorage persistence that currently lives in an effect. The
stored payload gains a `version` field so a draft written by the old flow is
discarded rather than rehydrated into a shape that no longer exists.

**`_shared/steps.ts`** — a `STEPS` array, one entry per step:

```ts
interface StepDef {
  id: StepId;
  labelKey: string;      // rail label
  Component: ComponentType<StepProps>;
  Aside?: ComponentType<StepProps>;
  canContinue(draft: OnboardingDraft): boolean;
  showPriceBar: boolean;
}
```

Adding or reordering a step is an edit to this array. Each step component
receives `{ draft, dispatch }` rather than a hand-picked prop list.

### Layout

`_shared/step-shell.tsx` owns the two-column grid: content plus an optional
`~330px` aside, collapsing to one column below `lg`. Steps without an aside
render full width. The page's max width grows from `900px` to `1180px`.

**The aside belongs to the shell, never to a wizard widget.** The four widgets
under `widgets/business-wizard/` are also used by the Create Business modal in
`pages/settings/businesses/create.tsx`; they stay layout-agnostic — a grid of
cards and nothing more — so restyling them cannot break the modal.

`_shared/step-rail.tsx` keeps its current logic and gains the new visual
treatment. `_shared/price-bar.tsx` stays, but appears from step 5 instead of
step 4, and integration prices now feed the total.

### New data modules

All pure data and pure functions, no React — the same contract as
`shared/catalog`.

- **`_shared/brand-catalog.ts`** — cities, currencies, branch types, target
  audiences, suggested colour palettes, theme templates.
- **`_shared/ai-insights.ts`** — derives the aside panels from the draft:
  `insightsFor(vertical, type)`, `brandToneFor(type)`,
  `serviceCategoriesFor(type)`. Derived, not hardcoded strings, so the panel
  changes when the merchant's answers change.
- **`_shared/payment-catalog.ts`** — payment methods and a promise that
  simulates `processing → success`.
- `IntegrationOption` gains `priceSar` (200, per the design) and is included in
  `computePrice`.

### Draft shape

Existing fields (`vertical`, `type`, `answers`, `enabled`, `details`) are kept.
Added:

- `brand` — name, city, branchType, branches, currency, hours, audience,
  logoDataUrl, primary, secondary, themeTemplate
- `publicLink` — tag, section order
- `payment` — selected method
- `account` — the Create Account modal's fields

Removed: `goals`, `security`, `team`, `workflows`. `integrations` keeps its
current shape.

## Assets

Present and usable: `payment/` (mada, apple pay, stc, VISA), `public-link/`
(hero, four category cutouts, three dishes), `Get Started/`, `Iphone 14.png`,
`Review.png`, and the existing vertical, type and integration icon sets.

Two gaps, both handled without blocking:

- **Brand theme thumbnails.** `onboarding-Themes/Brand Theme.png` is a full
  storefront mockup, not the three 16:9 card backgrounds step 4 needs. One
  template crops from its banner; the other two render as gradients built from
  the merchant's chosen palette until real images arrive.
- **Dishes.** Three exist where the design shows six; the three repeat.
  `public-link/de.png` is renamed `dish-3.png`.

Every asset path lives in one module per group, so replacing a placeholder is a
file drop plus one line — never a component edit.

`public-link/hero.png` is 5760×2400 and 8.9MB against a ~1100px render, and the
folder totals ~28MB that Vite bundles as-is. Images are resized to their render
size and converted to WebP as part of this work. `Ch/Gemini_Generated_*.jfif`
(7.5MB) is unreferenced and is deleted.

## Conventions

Non-negotiable, because they are what the rest of the app already does:

- Every string comes from i18n with both `ar` and `en` keys.
- Direction uses logical properties (`start`/`end`), never `left`/`right`.
- Colour comes from `--octo-*` custom properties; `#0D6EFD` is the one literal,
  as it is the brand mark.
- Step 9's Dashboard Preview is built from real components, not a screenshot,
  so it honours the active theme and direction.

## Verification

There is no test suite for these pages today, and this design does not invent
one. Verification is `pnpm --filter merchant build` (which runs `tsc -b`) and
`pnpm --filter merchant lint` clean, plus walking all
ten steps in the browser in four combinations — ar/en × light/dark — checking
that the draft survives a refresh mid-flow and that the Create Business modal
still renders correctly after the widget restyle.
