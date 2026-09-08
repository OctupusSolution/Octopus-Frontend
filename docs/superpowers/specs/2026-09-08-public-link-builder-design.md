# Public Link Builder

**Date:** 2026-09-08
**Scope:** `apps/merchant` — a new seven-step builder for the customer-facing site
**Status:** Approved for planning

## Why

Onboarding step 8 shows a merchant their public page and lets them reorder four
sections. That is a preview, not a builder. Once the business exists, the
merchant needs a place to actually own that page: pick a theme, set brand and
typography, choose which modules become pages, order the navigation, configure
each homepage section, rehearse the customer journey, and publish.

The frames put that behind one sidebar entry, **Public Link Builder**, as a
seven-step wizard: Theme, Brand, Pages, Navigation, Customize, Preview, Publish.

## Decisions

Settled before design; not open questions.

| Question | Decision |
|---|---|
| Relationship to the onboarding draft | Independent. Its own model, its own storage. Onboarding's `publicLink: { tag, sections }` is untouched |
| Scope | All seven steps, built in phases with a review checkpoint after each |
| Live preview | The existing `PublicLinkPreview` moves to `widgets/storefront-preview` behind neutral props; both hosts feed it through an adapter |
| Fidelity | Every control drives real local state and moves the preview. Only what needs a server (SSL, real domain, real email) is mock, and is labelled as such |
| i18n | EN + AR from the first commit of every phase. Logical CSS properties only |
| Backend | None. Same posture as the rest of the merchant app |
| Sidebar gating | Ungated, like Dashboard. The public page is not owned by a single module |

## Architecture

### Preview extraction

`PublicLinkPreview` (399 lines) currently imports from
`pages/onboarding/_shared/`. Feature-Sliced Design forbids a widget importing
from `pages`, so three moves happen first:

1. `shared/lib/storefront-assets.ts` — `storefrontAsset`, `themeThumb`
2. `shared/lib/brand-tokens.ts` — `readableOn`, `fontStack`, `FONTS`,
   `FontChoice`, `styleTokens`, `StyleTokens`, `THEME_TEMPLATES`,
   `ThemeTemplate`, `PALETTES`, `Palette`
3. `pages/onboarding/_shared/brand-catalog.ts` and `assets.ts` re-export both
   (`export * from ...`), so the sixteen files importing from them are not
   edited at all.

The widget then takes fully resolved props — never a draft:

```ts
export interface StorefrontPreviewModel {
  businessName: string;
  logoDataUrl: string | null;
  url: string;
  primary: string;
  secondary: string;
  font: string;
  themeTemplate: string | null;
  sections: readonly string[];
  navItems: readonly { labelKey: string; visible: boolean }[];
  categories: readonly string[];
  cityKey: string | null;
  hoursSummary: string;
  currency: string;
  hero: {
    headline?: string; sub?: string;
    primaryCta?: string; secondaryCta?: string;
    imageUrl?: string;
  };
  device: "desktop" | "tablet" | "mobile";
}
```

Resolving city label, opening hours and price formatting in each host's adapter
is what keeps `summarizeHours` and `formatBrandPrice` — both of which read
onboarding types — out of the widget.

Two adapters exist: `pages/onboarding/steps/public-link-step.tsx` (from
`OnboardingDraft`) and `pages/public-link/_shared/preview-model.ts` (from
`SiteDraft`).

### Why a new shell rather than reusing `Wizard`

`_shared/wizard.tsx` is typed to `OnboardingDraft` and calls
`defaultModulesFor`, `questionsFor` and `PriceBar` by name. Making it generic
would drag `StepsProvider`, `PriceBar` and `use-onboarding-draft` into generics
for a gain of one footer bar. `StepRail` is already draft-agnostic — it takes
`labelKeys` — and is reused as-is.

### File tree

```
widgets/storefront-preview/
  index.ts · index.tsx (moved) · model.ts

shared/lib/storefront-assets.ts        (moved)
shared/lib/brand-tokens.ts             (moved)

pages/public-link/
  index.tsx                            PublicLinkBuilderPage
  _shared/
    site-draft.ts                      SiteDraft, EMPTY_SITE_DRAFT, reducer, actions
    use-site-draft.ts                  localStorage persistence + savedAt
    steps.tsx                          StepDef list, StepProps context
    builder-shell.tsx                  title + autosave chip + StepRail + footer bar
    theme-catalog.ts                   six themes, filter categories, style-token id per theme
    page-catalog.ts                    the nine page modules
    section-catalog.ts                 homepage sections, icons, inspector kind
    preview-model.ts                   SiteDraft -> StorefrontPreviewModel
    checklist.ts                       go-live predicates over the draft
  steps/
    theme-step.tsx · brand-step.tsx · pages-step.tsx · navigation-step.tsx
    customize-step.tsx
    customize/controls.tsx
    customize/hero-inspector.tsx
    customize/reservations-inspector.tsx
    customize/waitlist-inspector.tsx
    customize/menu-inspector.tsx
    customize/offers-inspector.tsx
    preview-step.tsx · publish-step.tsx
  ui/
    device-frame.tsx · nav-preview.tsx · qr-code.tsx
```

Modified: `pages/onboarding/steps/public-link-step.tsx`,
`pages/onboarding/_shared/{brand-catalog,assets}.ts`,
`app/routes/registry.tsx`, `widgets/app-sidebar/index.tsx`,
`packages/i18n/src/locales/{en,ar}/index.ts`.
Deleted: `pages/onboarding/steps/public-link-preview.tsx` (moved).

`app/routes/registry.tsx` and `widgets/app-sidebar/index.tsx` are shared files
under AGENTS.md §7.1. This work explicitly owns one line in each.

## State model

```ts
export interface SiteDraft {
  step: number;                              // 1..7

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

  pages: readonly PageEntry[];               // { id, inNav, onHome } — array order is nav order
  navigation: {
    showInHeader: boolean; showInDrawer: boolean;
    stickyHeader: boolean; activeIndicator: boolean;
    showIcons: boolean; sameTab: boolean;
    hidden: readonly string[];               // page ids closed by the eye toggle
  };

  sections: readonly SectionEntry[];         // { id, enabled } — homepage order
  selectedSection: string;
  sectionSettings: {
    hero: HeroSettings;
    reservations: ReservationSettings;
    waitlist: WaitlistSettings;
    menu: MenuSettings;
    offers: OffersSettings;
  };

  preview: {
    testMode: boolean;
    simulation: "idle" | "running" | "done";
    completed: number;                       // 0..7
    results: readonly SimResult[] | null;    // { stepId, status, seconds, detailKey }
    testers: readonly Tester[];              // { email, role, canView, tested }
  };

  publish: {
    seo: { title: string; description: string; socialImageDataUrl: string | null };
    customDomain: { host: string; connected: boolean; ssl: boolean };
    published: boolean;
  };

  savedAt: number | null;
}
```

`styleTokens` in `shared/lib/brand-tokens.ts` understands three ids —
`elegant`, `warm`, `modern` — while the frames show six theme cards. Each entry
in `theme-catalog.ts` therefore carries its own `styleId` pointing at one of
those three, so the catalog can grow past what the token function distinguishes
without either file guessing about the other.

Actions mirror `draftReducer`'s shape: `goTo | next | back | patchTheme |
patchBrand | patchColors | patchTypography | setPages | togglePageFlag |
patchNavigation | toggleNavHidden | setSections | toggleSection |
selectSection | patchSection | patchPreview | patchPublish`.

**Persistence** — `use-site-draft.ts`, patterned on `use-onboarding-draft` but
`localStorage` only under `octo.site-draft`: this is a business setting, not an
abandonable signup. Writes are debounced 400 ms and stamp `savedAt`, which is
what makes the "Autosaved just now" chip honest rather than decorative. A
`DRAFT_VERSION` mismatch discards the stored draft instead of rehydrating a
half-valid shape.

`hidden` lives on `navigation` rather than as a flag on `PageEntry` because a
page can be hidden from navigation while still showing on the homepage; the two
controls sit on different steps and must not alias each other.

## The seven steps

| # | Step | Contents | Preview effect |
|---|---|---|---|
| 1 | Theme | Filter chips (All / Elegant / Modern / Minimal / Café / Casual / Luxury), six theme cards (thumbnail, name, description, desktop-mobile toggle, Use This, Recommended badge on the first), keep-your-content banner | `styleTokens` drives radius, heading weight and tracking, hero scrim |
| 2 | Brand | Logo (change / remove), business name, four colours with hex fields, typography EN and AR (titles + body with live samples), favicon, hero pattern, Reset to Theme Defaults | Colour, typeface, name and logo, live per keystroke |
| 3 | Pages | Nine page modules in a table — Show in Nav, Show on Home, Customize — with drag reorder and a tip banner; a Navigation Preview column showing the dark drawer and "N of 9 pages enabled" | Header nav plus which blocks appear on the homepage |
| 4 | Navigation | Navigation Display (two checkboxes), Global Options (sticky header, active page indicator, icons in navigation, open links in same tab), Page Order with per-row eye toggle and drag; Web Navigation and Mobile Drawer previews side by side | Nav order, visibility, icons, sticky header |
| 5 | Customize | Homepage section list (drag, icon, pencil, on/off) plus Add Section; the inspector switches on the selected section — see below | Section order and visibility, hero copy, menu and offers blocks |
| 6 | Preview | Test mode state, a seven-item journey checklist whose ticks fill progressively during a run, Start / End Simulation, then a results table and performance score; Invite Testers; test-mode preview URL with copy | Unchanged page, test-mode URL |
| 7 | Publish | Go-live checklist (nine items computed from the draft), live URL with visit / open / copy, custom domain and SSL, share row (QR, WhatsApp, email, social, embed), SEO and social panel, full-width preview, Publish Now | — |

### Step 5 inspectors

- **Hero** — tabs Content / Style / Advanced. Background type (image, video,
  slider), image with recommended size, heading, subheading, primary CTA and
  its link target, optional secondary CTA and target, Delete Section.
- **Reservations** — tabs Module / Setting / Policies / Notifications. Module:
  enable toggle with module-status line, Module Setting link, homepage display
  (inline widget or button/link), primary CTA action, availability preview,
  next-available label and date range. Setting: booking window, cut-off time,
  min/max party size, table hold time, auto-confirm, deposit.
- **Waiting List** — same tab structure. Module mirrors Reservations with the
  waitlist drawer as the primary action. Setting: queue method (first come
  first served / priority rules), min/max party size, wait-time display, update
  interval, WhatsApp / SMS / email notifications, auto-remove window.
- **Menu & Order** — connect a saved menu (with connected confirmation and
  Manage Menus), homepage display (highlighted dishes, categories, preview,
  full menu), primary CTA action (menu page, drawer, ordering), then ordering
  mode, minimum order, order-ahead, estimated prep time, delivery service
  areas, tax display.
- **Offers Banner** — display style, category filtering, sort order, CTA
  button, visibility.

Sections with no inspector of their own — Reservations CTA, Events,
Testimonials, Instagram Feed — get the generic "Setting for Selected Section"
panel, which is the shape Offers Banner already uses: a short list of selects
and toggles declared in `section-catalog.ts` rather than a file each. A section
earns a dedicated inspector only when it configures a module.

`customize/controls.tsx` holds the field row, toggle row, radio card and check
card these five share, so an inspector file stays a description of its own
fields rather than a re-implementation of the same five controls.

### Behaviour that needs stating

- **QR code** is generated from the live URL as inline SVG. No new dependency —
  AGENTS.md §7.4 forbids adding one.
- **Simulation** advances on real timers, one step at a time. The button
  becomes End Simulation while running, and ending mid-run resets the ticks.
- **Custom domain and SSL** are mock and visibly labelled; nothing here can
  provision either.
- **Go-live checklist** items are predicates over the draft, in the spirit of
  `businessComplete` in onboarding. A merchant who disabled a module sees that
  item incomplete rather than a permanent row of green ticks.
- **Publish Now** flips `publish.published` and moves the page into its
  published state. There is nothing to publish to.

## Sidebar and route

Sidebar: `{ id: "public-link", label: "Public Link Builder", icon: Link2,
path: "/public-link" }`, in the Operations section directly after Floor Plan
Builder, matching the frames. No `GROUP_MODULE` entry, so it is always present
like Dashboard.

Route: `{ id: "public-link", path: "/public-link", section: "Storefront",
page: "Public Link Builder" }`. The breadcrumb reads those through `labelKey`,
so both strings need dictionary entries.

## Phases

Each phase ends at a review checkpoint.

1. **Foundation** — the two shared-lib moves, the preview widget and both
   adapters, `site-draft.ts`, `use-site-draft.ts`, `builder-shell.tsx`, the
   route, the sidebar entry, and a stub per step. Gate: clean typecheck, the
   page loads, and onboarding step 8 renders exactly as before.
2. **Theme and Brand** — steps 1 and 2, plus `device-frame.tsx`.
3. **Pages and Navigation** — steps 3 and 4, plus `nav-preview.tsx`.
4. **Customize** — step 5, the shared controls, and the five inspectors.
5. **Preview and Publish** — steps 6 and 7, the simulation runner, the QR
   generator, and the checklist predicates.
6. **Verification sweep** — screenshots of all seven steps in EN and AR against
   the frames.

## Verification

- `npx tsc --noEmit` from `apps/merchant` prints nothing. Required at every
  phase.
- Every step screenshotted in both locales and compared against the frame
  before it is called done.
- Onboarding step 8 is screenshotted after phase 1 and must be unchanged.
- Dark mode uses existing `--octo-*` tokens throughout; no new hex values
  outside the AGENTS.md palette.
