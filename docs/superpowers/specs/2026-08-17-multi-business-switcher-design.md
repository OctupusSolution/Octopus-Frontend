# Multi-Business Switcher — Design Spec

Date: 2026-08-17
App: `apps/merchant` (React + Vite SPA)

## 1. Problem

One OCTOPUS account can currently hold exactly one business (tenant). A merchant who
runs both a restaurant and a salon under the same login has no way to manage both from
one account — `TenantConfigProvider` stores a single `TenantConfig` in
`localStorage["octopus.tenant"]`, and the sidebar/module gating reads that single value.

We're adding a **Settings page** where the signed-in merchant can see which business is
currently active, switch to another business they own, and create a new business without
leaving the account.

## 2. Scope

**In scope:**
- Multiple businesses (tenants) per account, with one marked "active" at a time.
- A new `/settings/businesses` page: list businesses, show which is active, switch active
  business, create a new business.
- A shorter, modal version of the existing onboarding wizard (vertical → type →
  qualifying questions → modules) to create additional businesses, reusing the same step
  components the 10-step signup flow already uses.

**Out of scope (explicitly deferred, not built now):**
- Per-business data partitioning. Orders, menu, staff, branches, etc. keep showing the
  same shared mock dataset regardless of which business is active. Only the business's
  **name, vertical, type and enabled modules** — i.e. what drives the sidebar and module
  gating — change on switch. This mirrors how the app already has no backend; adding
  per-tenant datasets for every mock file is a much larger effort than this feature needs.
- Renaming or deleting a business.
- A business switcher anywhere outside this Settings page (e.g. top bar, sidebar footer).
- Any vertical other than `restaurants` — `clinics`, `pets`, `salons`, `retail` remain
  "coming soon" and locked in the vertical picker, identical to the existing onboarding
  step. A merchant can create multiple *restaurant* businesses today; a real salon
  business isn't buildable until that vertical ships.

## 3. Data model — `app/providers/tenant-config-provider.tsx`

Replace the single-config shape with a list + active id.

```ts
export interface TenantConfig {
  id: string;
  vertical: VerticalId;
  businessType: TypeCode;
  enabledModules: ModuleId[];
  branchCount: number;
  businessName: string;
  createdAt: string;
}
```

Storage keys:
- `octopus.tenants` — `TenantConfig[]`
- `octopus.activeTenantId` — `string | null`

Context value:
```ts
interface TenantConfigContextValue {
  businesses: TenantConfig[];
  activeBusiness: TenantConfig | null;   // replaces old `config`
  activeTenantId: string | null;
  isProvisioned: boolean;                 // businesses.length > 0
  isModuleEnabled: (id: ModuleId) => boolean;  // reads activeBusiness only
  price: PriceBreakdown;                       // reads activeBusiness only
  createBusiness: (config: Omit<TenantConfig, "id" | "createdAt">) => void; // appends + activates
  switchBusiness: (id: string) => void;
  updateModules: (modules: ModuleId[]) => void; // targets activeBusiness only
  resetConfig: () => void;                      // clears everything (dev/logout use)
}
```

`createBusiness` replaces `saveConfig`: generates an id, appends the new config to
`businesses`, and sets it active. Both the onboarding flow (first business) and the new
Settings wizard (additional businesses) call this same function — no duplicated
creation logic.

**Migration:** on first read, if `octopus.tenants` is absent but the legacy
`octopus.tenant` key holds a valid config, wrap it into a one-item array (generating an
id), set it active, and drop the legacy key. Existing demo sessions keep working.

Consumers unaffected beyond a rename: `widgets/app-sidebar` only uses `isModuleEnabled`;
`pages/onboarding` swaps `saveConfig` for `createBusiness`.

## 4. Shared wizard steps — new `widgets/business-wizard/`

The onboarding flow's step components for vertical, type, qualifying questions and
modules are pure, prop-driven, and already exactly what the "create business" modal
needs. Per the project's Feature-Sliced layering (pages may not import another page's
internals), extract them into a widget so both `pages/onboarding` and the new
`pages/settings/businesses` can import from one public surface:

- Move `pages/onboarding/steps/vertical-step.tsx`, `type-step.tsx`,
  `questions-step.tsx`, `modules-step.tsx` → `widgets/business-wizard/`.
- Move the two generic helpers they depend on — `pages/onboarding/_shared/icon.tsx`
  (`CatalogIcon`) and `_shared/brand.ts` (`BRAND_GRADIENT`) — to `shared/lib/`, since
  they're business-agnostic (icon-name resolver, a color constant) and every step file
  (moved or not) imports them.
- `widgets/business-wizard/index.ts` exports `VerticalStep`, `TypeStep`, `QuestionsStep`,
  `ModulesStep`, and `type Answers`.
- `pages/onboarding/index.tsx` and its remaining steps import the two shared helpers from
  `shared/lib` and the four step components from `widgets/business-wizard` instead of
  `./steps/...`. No visual or behavioral change to the existing 10-step flow.

## 5. New page — `pages/settings/businesses/index.tsx`

Route: `/settings/businesses`, id `settings-businesses`, section "Settings", page
"My Businesses" — added to `app/routes/registry.tsx` following the exact pattern of the
other `/settings/*` routes.

**Layout** (matches `settings/branches` conventions — header, card grid, `Badge`,
`Button`, toast):
- Header: title + subtitle, "+ Create New Business" button (top-right, primary).
- Grid of business cards, one per entry in `businesses`. Each card shows:
  - Business name, vertical + type badges (e.g. "Restaurant · Fine Dining")
  - Branch count, created date
  - "Active" badge (tone success) when `id === activeTenantId`
  - Otherwise a "Switch to this business" button
- Clicking "Switch" calls `switchBusiness(id)` directly (no confirmation modal — consistent
  with the branch status toggle elsewhere in Settings) and shows a toast. The sidebar and
  module gating update immediately since they read the same context.

**Create Business modal** (`Modal` primitive, wide):
- Local step state (1–5): Name → Vertical → Type → Qualifying Questions → Modules review.
- Step 1 is a single `Input` for the business name (required to continue).
- Steps 2–5 render `VerticalStep`, `TypeStep`, `QuestionsStep`, `ModulesStep` from
  `widgets/business-wizard`, with the same derive-modules-from-type-and-answers logic
  currently in `pages/onboarding/index.tsx` (lifted into this modal's local state).
- Footer: Back / Next, and on the last step a "Create Business" button that calls
  `createBusiness({ businessName, vertical, businessType, enabledModules, branchCount })`
  then closes the modal and shows a toast. The new business becomes active immediately.
- The `coming-soon` verticals stay locked exactly as in onboarding — no special-casing.

## 6. Sidebar wiring — `widgets/app-sidebar/index.tsx`

Add "My Businesses" to `FOOTER_GROUPS[0].items` (the Settings group) and map it in
`ITEM_PATHS` to `/settings/businesses`, alongside the existing six Settings sub-items.

## 7. i18n — `packages/i18n/src/locales/{en,ar}/index.ts`

New keys, following the existing `settings.*` naming convention:
- `settings.businesses.title` = "My Businesses" (this value is also what the sidebar
  label resolves to via `labelKey`, so no separate nav string is needed)
- `settings.businesses.subtitle`
- `settings.businesses.active`, `.switch`, `.switched` (toast), `.create`, `.createTitle`
- `settings.businesses.col.*` / card labels (vertical, type, branches, createdAt)
- `settings.businesses.wizard.*` (step labels, name field, create button)

Arabic strings added in parallel for every key, matching the bilingual requirement in
`AGENTS.md`.

## 8. Verification

- `npx tsc --noEmit` from `apps/merchant` must be clean.
- Manual check in the dev preview:
  1. Fresh session → onboarding still creates the first business and lands on the
     dashboard (regression check on the widget extraction).
  2. `/settings/businesses` shows that one business, marked Active.
  3. Create a second (restaurant) business via the modal → it becomes active, sidebar
     module set updates, first business still listed and re-selectable.
  4. Switch back to the first business → sidebar updates again, no data loss.
  5. RTL/Arabic pass on the new page and modal.
