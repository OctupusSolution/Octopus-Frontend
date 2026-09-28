# Themed Menu Page + Real Live Preview for the Menu Builder — Design

Date: 2026-09-28 · Status: awaiting owner review

## 1. Intent

**Owner's goal.** What a merchant sees in the menu builder's live preview must be exactly what a customer sees, and every edit must show there instantly — the same bar the Public Link builder now meets (`docs/superpowers/plans/2026-09-28-public-link-iframe-preview.md`).

**Decisions the owner made (2026-09-28):**
1. A real customer menu page is built in the storefront, and the builder's preview becomes an iframe of it (not a better drawing).
2. A menu's brand (colours, logo, hero, fonts) belongs to **the menu itself**, stored on the server; a menu with none starts from the site's brand.
3. The page serves **both** the restaurant's site (`/menu`) and the **real QR link** (`/c/{key}`).
4. The QR menu is **view-only** in this phase (no cart, no ordering).
5. Approach A: the builder turns its in-memory draft into the public menu document on every edit, so unsaved changes show instantly.

**Success looks like:** change a card style, a section's display style, a price, a colour or the logo in the builder → the framed storefront page changes within a frame, before Save; the same menu opened from its QR code or the site's `/menu` looks identical to that preview.

## 2. Current state (facts that shape the design)

- The builder's preview (`apps/merchant/src/pages/menu/build/preview-rail.tsx`) draws `widgets/storefront-preview`, a hand-made scale model. The Review step's "customer view" (`build/review/customer-preview.tsx`) is a second, separate hand-made renderer.
- The storefront's `/menu` (`apps/customer/src/views/menu/menu-view.tsx`) is only a category mosaic; `/menu/[category]` is a fixed 4-column grid. **No theme option is honoured** (card, category, navigation, section display style and colour, tags, sticky cart, item details, colours, fonts).
- The storefront's `PublicMenuDocument` drops the theme, currency, tax, offers, availability and section display style/colour.
- The backend's public read (`PublicMenuProjection.Project`) already returns all of it. The draft preview (`GET /menus/{id}/preview`) returns the **identical** `PublicMenuResponse`.
- **Media in that response is `{assetId, kind}` only — no URL — and no public route resolves an asset id.** So the storefront cannot show any menu image today. The PublicApi host already registers menu media delivery URLs (`MenuMediaCapabilities.DeliveryUrls`), so the server can resolve them.
- Theme enum strings (backend `MenuTheme.cs`): navigation `TopBar|SideDrawer|BottomBar|PillScroll`; section nav `IconAndText|TextOnly|IconOnly|ImageAndText`; card `Classic|CleanMinimal|ImageTop|ImageLeft`; item details `SamePage|Overlay|NewPage`; section display `List|Carousel|Grid`. Colours are `#rgb`/`#rrggbb` or null; the backend never fills defaults (presets exist only client-side in `build/theme/presets.ts`).
- The builder never writes brand to the menu: `pushTheme` (`entities/menu/menu-sync.ts`) echoes the server's colours/logo/hero back; the Theme step edits the Public Link site draft instead.
- The QR code the builder shows is fabricated (`build/theme/public-url.ts` → `{slug}.octopus.app/m/{id}`, no such route). Real access codes print `https://menu.octopus.sa/c/{key}` (`Menu:PublicCodesBaseUri`); nothing serves that host. `GET /v1/public/menu-codes/{key}` needs no Host/tenant.
- Business currency is available to the builder via catalog settings (`useMenuCurrency`).

## 3. Architecture

```
builder (apps/merchant)                                   storefront (apps/customer)
────────────────────────                                  ─────────────────────────────────────────
in-memory Menu + menu brand + currency                    /menu            (site, order mode)   ← GET /v1/public/site-menu/{key}
      │ draftMenuDocument()  (port of PublicMenuProjection)  /c/[key]         (QR, view mode)      ← GET /v1/public/menu-codes/{key}
      ▼                                                    /preview/menu    (builder canvas)     ← postMessage
PublicMenuDocument ──── postMessage (protocol 1) ───────▶        │
      ▲                                                          ▼
      └──── ready | navigate | select-section ◀──────── ThemedMenu (one component, every entry point)
```

### 3.1 Shared contract — `packages/api-client/src/contracts/public-menu.ts`
A lossless TypeScript mirror of the backend's `PublicMenuResponse` (`PublicMenuDocument`, `PublicMenuTheme`, `PublicMenuSection`, `PublicMenuItem`, `PublicMenuOffer`, `PublicMenuModifierGroup`, `PublicMenuMedia { assetId; kind; url: string | null }`, currency, tax, availability). `MenuPreviewResponse` in `menu-admin.ts` becomes an alias of it. Plus the canvas protocol in `contracts/menu-preview.ts` (same pattern as `builder-preview.ts`: channels `octopus-menu-builder` / `octopus-menu-canvas`, protocol 1, messages `render{document, mode, highlightSectionRef, selectable}`, `scroll-to`, `ready`, `navigate`, `select-section`, guards).

### 3.2 Backend — media URLs in the public menu document
`PublicMedia` gains `Url` (nullable, last positional parameter with default). Both callers of `PublicMenuProjection.Project` (the public read server and `PreviewDraftQuery`) resolve every referenced asset through `IMediaDeliveryUrls` and pass a lookup to the projector; an asset that cannot be resolved keeps `Url = null`. Covered by the projector's unit tests. This is the only backend change.

### 3.3 Storefront — `widgets/themed-menu`
`ThemedMenu({ document, mode: "order" | "view", selectable?, highlightSectionRef? })`, a client component that renders the whole menu page at real size. Visual reference for each option: the builder's current `StorefrontPreview` menu composition (`menuBody`, `categoryStrip`, card styles, pill bar, side drawer, bottom bar, sticky cart) — the storefront implements those same looks at full size, with the storefront's own header/typography scale. Pieces, each its own file:
- `theme.ts` — `PublicMenuTheme` → CSS variables (colours; null → storefront default) and font stacks (known font codes → loaded faces; unknown → default); enum strings → view choices (unknown string → the backend default).
- `category-nav.tsx` — the four navigation styles × four category styles.
- `item-card.tsx` — the four card styles; tags when `showItemTags`; unavailable items greyed with a label; price with the document's currency and minor units.
- `section-block.tsx` — list / carousel / grid, section colour accent.
- `offers-block.tsx` — offers with badge and saving badge; unavailable offers greyed.
- `item-details.tsx` — `SamePage` expands inline; `Overlay` opens a dialog; `NewPage` links to `/menu/[category]/[item]` in order mode and falls back to the overlay in view mode (the QR host has no item route).
- `availability-banner.tsx` — `NotAvailableNow` / `PreOrder` with the next time.
- Order mode reuses the existing cart (`AddToCartModal`, `OrderingSessionProvider`) and the sticky cart bar when `stickyPrimaryAction`; view mode never shows add buttons, cart or sticky bar.

### 3.4 Storefront — entry points
- `/menu`: loads the site-bound menu document (existing `findMenuKey` → `GET /v1/public/site-menu/{key}`, now typed losslessly) and renders `ThemedMenu` in order mode. `/menu/[category]` and `/menu/[category]/[item]` keep working (they read the same document through the existing `menuFromDocument` adapter, now fed image URLs).
- `/c/[key]`: `GET /v1/public/menu-codes/{key}?l=&lang=` server-side, renders `ThemedMenu` in view mode with a minimal brand header (logo + menu name) and no site chrome; the unified 404 for anything else. Middleware lets `/c/*` through without tenant resolution (the host `menu.octopus.sa` must not be read as a tenant slug); deployment points that host at the storefront.
- `/preview/menu`: bare canvas like `/preview/builder` — same `MERCHANT_APP_ORIGINS` origin checks and headers (frame-ancestors, no-store, noindex, no-referrer), same handshake and link interception; renders `ThemedMenu` from the received document in the mode the builder asks for.

### 3.5 Builder — `apps/merchant/src/pages/menu/build`
- `preview/draft-menu-document.ts` — `draftMenuDocument(menu, brand, currency, language): PublicMenuDocument`, porting `PublicMenuProjection` rules: only visible sections (not the offers pseudo-section, not hidden/archived), in order; refs `i{n}`/`m{n}`/`o{n}` in order of first appearance; items with an empty name skipped (mid-typing); `isAvailable` from the item's status/availability flags; money in major units; modifier groups (prompt label, selection mode, min/max, options with effect kinds `NoChange|AddAmount|FixedPrice`); offers with components, pricing rule, reference total / price / saving / saving percent computed like the builder's own price quote; theme enums mapped with the existing `NAV/CATEGORY/CARD/DETAILS` tables; media as `{assetId: "local", kind, url}` with local data/delivery URLs (blob: dropped); availability `Available`.
- `preview/menu-preview-frame.tsx` — the iframe (reusing the Public Link frame's geometry and bridge helpers, generalised to take a channel) with the in-app `PreviewRail` as the 8 s fallback. Canvas origin: `VITE_STOREFRONT_CANVAS_ORIGIN`, default `http://localhost:3000` in development and `https://menu.octopus.sa` in production (the canvas needs no tenant).
- `PreviewRail` users (Sections, Items, Theme steps) and the Review step's customer view switch to the frame; the Items/Sections steps show the menu page (not the site home page).
- Menu brand: `MenuTheme` (local) gains `primaryColor, lightColor, accentColor, darkColor, logo, hero, heroText, heroSubtext` (URLs + media refs). The Theme step's brand controls edit these instead of the site draft; when the menu has none, they are seeded once from the Public Link site brand (or the chosen preset's colours). `pushTheme` uploads new images (`uploadMedia(…, "ThemeLogo" | "ThemeHeroImage", …, "menu")`) and sends the menu's own brand fields.
- QR: the Theme step's QR panel shows the menu's real access code (`listAccessCodes` filtered to this menu, active) and its `printableUrl`; when none exists, a "Create QR code" button calls `createAccessCode`. The fabricated `public-url.ts` is removed.

## 4. Errors, edge cases, fallbacks
- Canvas unreachable / blocked origin / no `ready` in 8 s → the in-app preview with a one-line note (same as Public Link).
- A media asset the server cannot resolve → `url: null` → the storefront's stock photograph for items/sections, no hero image, name text instead of logo.
- Unknown enum string or unparseable colour → storefront default for that option (never a crash).
- `/c/{key}` for an unknown/revoked key, unpublished menu or suspended business → the backend's single 404 → the storefront's not-found page. `NotAvailableNow` / `PreOrder` → the page renders with the availability banner.
- No currency → prices shown as plain numbers.
- Menu with no visible sections → an empty-menu message.
- Messages from the wrong window/origin, other protocol versions → ignored on both sides (guards + source/origin checks, as in Public Link).
- Links inside the canvas never navigate the frame; item details in the canvas always use the overlay/inline forms.

## 5. Testing
- Backend: projector tests for `Url` on items, sections, offers, theme logo/hero, and `null` for unresolved assets.
- Shared: protocol guards (valid/invalid channel, protocol, shapes).
- Builder: `draftMenuDocument` rule-by-rule tests (visibility filter, order, refs, empty names, availability, money, modifiers, offers pricing, theme enum mapping, blob drop); frame bridge tests; brand seeding and `pushTheme` payload tests.
- Storefront: `theme.ts` mapping tests; `ThemedMenu` render tests via `renderToStaticMarkup` in `.test.ts` files (each nav × category × card × display style renders; order vs view mode; unavailable items; availability banner; currency formatting); middleware tests for `/c/*` and `/preview/menu`; canvas message tests.
- Manual end-to-end (owner): builder edits appear instantly; QR link opens the same page on `menu.octopus.sa`-style host; `/menu` on a site matches.

## 6. Out of scope
Ordering from the QR menu (table ordering), a per-item route on the QR host, editing multiple languages in the builder, backend preset catalogues, and changing Public Link's own brand behaviour.
