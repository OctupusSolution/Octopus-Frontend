# Public Link Builder — Real Storefront Live Preview (iframe) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The builder's live preview shows the merchant's real customer storefront (`apps/customer`) in an iframe, and every edit — saved or not — appears in it instantly.

**Architecture:** The storefront gets one new route, `/preview/builder`, a client page that renders nothing on its own. The merchant builder frames it, turns the draft (server copy + unsaved edits) into exactly the shapes the storefront's public read returns (`PublishedShell` + `PublicPage` + menu documents), and sends them with `postMessage` on every change. The canvas renders them with the storefront's own components (`SiteHeader`, `PageSections`, `PublishedSiteFooter`, `themeStyle`) and reports clicks back (navigate / language / select section). Both sides check message origins; the canvas is framable only by the merchant console. When the storefront cannot be reached, the builder falls back to the in-app mirror that exists today (`LiveSiteCanvas`).

**Tech Stack:** React 18, Next.js 14 App Router (storefront), Vite (merchant), TypeScript, Tailwind 3.4, Vitest 2.

**Spec:** No separate spec — the design is this document (sections "Design" and "Global Constraints"). The prior state it builds on: the connected live preview in `apps/merchant/src/pages/public-link/ui/live-preview-frame.tsx`, `live-site-canvas.tsx` and `_shared/live-site.ts`.

## Design

```
merchant builder (localhost:5290 / app.octopus.app)                storefront (<slug>.localhost:3000 / <slug>.octopus.app)
────────────────────────────────────────────────                    ──────────────────────────────────────────────
PublicLinkSync.server + previewEdits + SiteDraft                    /preview/builder  (layout renders a bare document)
        │ draftPublicRead()  (port of PublicProjector.cs)                    │
        ▼                                                                   │
{ shell, page, pageLoading, menus, highlightSectionId } ── postMessage ──▶ BuilderCanvas
                                                                            ├─ themeStyle(shell) on <html>, lang/dir
                                                                            ├─ SiteHeader(navLinks(shell))
                                                                            ├─ PageSections(sectionsOf(page), menus)
                                                                            └─ PublishedSiteFooter
        ◀── postMessage ── { ready | navigate(href) | language(code) | select-section(id) }
```

- **Handshake.** The canvas posts `ready` (no data) to `"*"` every 500 ms until a builder answers. The builder answers only a frame it created, to the storefront origin it computed, and re-sends the current render on every `ready` (so a storefront reload recovers by itself). After the first accepted message, the canvas talks only to that origin.
- **Trust.** The canvas accepts a message only when `event.source === window.parent` and `event.origin` is one of `MERCHANT_APP_ORIGINS` (plus `http://localhost:5290` and `http://127.0.0.1:5290` outside production). The route's response carries `Content-Security-Policy: frame-ancestors 'self' <those origins>`, `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow` and `Referrer-Policy: no-referrer`. The builder accepts a message only from its own iframe's window and the storefront origin.
- **Links inside the canvas never navigate the iframe.** A capture-phase click listener cancels every `<a>` click. A same-origin link becomes a `navigate` message. The builder opens that page of the site, or ignores it (cart, product pages). Anything else (outside links, mailto, tel) does nothing.
- **Viewport.** The iframe is laid out at the device's real width (1280 / 768 / 390) and scaled down with a CSS transform, so the storefront's own media queries decide the layout.
- **Fallback.** If no `ready` arrives within 8 s (storefront down, address not claimed, blocked origin), the builder shows the existing mirror with a one-line note.

## Global Constraints

- Canvas route path: `/preview/builder`. The first segment `preview` is in the backend's `reservedPaths` (`octopus-backend/src/Modules/PublicLink/Octopus.Modules.PublicLink.Infrastructure/Configuration/publiclink-catalogues.json`), so no merchant page can take it. No backend change in this plan.
- Protocol version `1`. Each side ignores any message with another `protocol` or `channel`.
- Channels: builder → canvas `"octopus-builder"`, canvas → builder `"octopus-builder-canvas"`.
- Dev origins: merchant `http://localhost:5290` (apps/merchant/vite.config.ts `server.port`), storefront `http://<slug>.localhost:3000` (`storefrontOrigin` in `apps/merchant/src/pages/public-link/_shared/preview-url.ts`).
- Storefront env var: `MERCHANT_APP_ORIGINS` (space- or comma-separated origins). It replaces `PREVIEW_FRAME_ANCESTORS` from the previous change.
- The in-app mirror (`LiveSiteCanvas` + `projectLiveSite`) stays as the fallback and must keep passing its tests.
- Commit messages: no `Co-Authored-By` or other Claude attribution lines (repository owner's rule).
- Commands run from the app folder: `cd apps/merchant` or `cd apps/customer`, then `npx vitest run <path>` / `npx tsc --noEmit -p .`. Only `src/**/*.test.ts` files are picked up (no `.test.tsx`).

## Before you start

The working tree on `feature/public-link-us019` holds uncommitted work, including the previous live-preview change this plan builds on. Commit it as one baseline commit first (ask the owner for the message), so each task below commits only its own files.

## Review Focus

1. **A message from the wrong window or origin** (another tab `window.open`-ing the canvas, a page framing the builder). Expected: ignored on both sides. Pinned by tests in Task 4 (`acceptToCanvas`) and Task 7 (`acceptFromCanvas`).
2. **A storefront the builder cannot reach** (storefront dev server not running, address never claimed in production). Expected: a mirror preview with a note, never a blank box. Pinned by Task 7 (`storefrontOrigin` returns null without a host) and Task 8 (the 8 s fallback, manual check).
3. **A link inside the canvas that leaves the site** (`mailto:`, `tel:`, `https://instagram.com/...`, a product page). Expected: nothing happens, and the iframe never navigates away. Pinned by Task 4 (`canvasLinkTarget`).
4. **A just-picked image held as a `blob:` URL** (only the builder's own origin can read it). Expected: treated as "no image" rather than a broken image. Pinned by Task 5.
5. **A message from a different protocol version** (a storefront deployed ahead of or behind the merchant app). Expected: ignored, and the builder falls back after 8 s. Pinned by Task 1.

---

## File Structure

**Shared (`packages/api-client/src/contracts/`)**
- `public-read.ts` (create): the public read shapes (`PublicSiteShell`, `PublicSitePage`, …), moved from `apps/customer/src/shared/api/public-api.ts` so both apps use one definition.
- `builder-preview.ts` (create): protocol constants, message types, `toCanvas` / `fromCanvas` builders, and the `isToCanvasMessage` / `isFromCanvasMessage` guards.
- `../index.ts` (modify): export both.

**Storefront (`apps/customer/src/`)**
- `shared/api/public-api.ts` (modify): re-export the public read types under their old names, and re-export the moved menu helpers.
- `shared/api/menu-document.ts` (create): `menuFromDocument` / `imageUrl`, which are client-safe (public-api.ts imports `node:http`).
- `widgets/site-header/nav-links.ts` (create): `navLinks`, moved from `app/layout.tsx`.
- `widgets/page-sections/sections-of.ts` (create): `sectionsOf` / `menuKeysOf`, taken out of `views/published-page/published-page-view.tsx`.
- `shared/lib/merchant-origins.ts` (create): allowed origins, `frameAncestors`, the canvas path and headers.
- `shared/lib/preview.ts`, `shared/lib/preview-middleware.ts`, `middleware.ts` (modify): use the shared origins, and handle the canvas route.
- `app/layout.tsx` (modify): a bare document for the canvas route.
- `app/preview/builder/page.tsx` (create): the canvas route.
- `views/builder-canvas/canvas-messages.ts` (create): pure message and link helpers.
- `views/builder-canvas/builder-canvas.tsx` (create) and `views/builder-canvas/index.ts` (create): the canvas.
- `widgets/site-header/site-header.tsx`, `features/session/switch-locale/switch-locale.tsx`, `widgets/site-footer/site-footer.tsx`, `widgets/page-sections/page-sections.tsx` (modify): small props and exports the canvas needs.

**Merchant (`apps/merchant/src/pages/public-link/`)**
- `_shared/live-site.ts` (modify): `draftPublicRead`, plus `liveSiteFromRead`; `projectLiveSite` becomes a thin composition of the two.
- `_shared/preview-menu.ts` (create): the menu-document code, moved out of live-site.ts, plus `builderMenuDocument`.
- `_shared/frame-bridge.ts` (create): pure iframe helpers.
- `ui/storefront-frame.tsx` (create): the iframe component.
- `ui/live-preview-frame.tsx` (replace): the iframe first, the mirror as fallback, section highlight and selection.
- `ui/site-preview.tsx`, `steps/customize-step.tsx` (modify): pass the section selection through.
- `packages/i18n/src/locales/{en,ar}/index.ts` (modify): 2 keys.

---

### Task 1: Shared contract — public read types and the builder preview protocol

**Files:**
- Create: `packages/api-client/src/contracts/public-read.ts`
- Create: `packages/api-client/src/contracts/builder-preview.ts`
- Modify: `packages/api-client/src/index.ts`
- Modify: `apps/customer/src/shared/api/public-api.ts:102-213` (the type block)
- Test: `apps/customer/src/shared/lib/builder-protocol.test.ts`

**Interfaces:**
- Produces: `PublicSiteDirection`, `PublicSiteMedia`, `PublicSiteNavItem`, `PublicSiteFooterLink`, `PublicSiteShell`, `PublicSiteSource`, `PublicSiteSection`, `PublicSitePage` (public-read.ts); `BUILDER_PREVIEW_PROTOCOL` (`1`), `BUILDER_PREVIEW_PATH` (`"/preview/builder"`), `BUILDER_CHANNEL`, `CANVAS_CHANNEL`, `BuilderMenuDocument`, `BuilderRenderPayload`, `ToCanvasBody`, `ToCanvasMessage`, `BuilderRenderMessage`, `FromCanvasBody`, `FromCanvasMessage`, `toCanvas(body)`, `fromCanvas(body)`, `isToCanvasMessage(data)`, `isFromCanvasMessage(data)` (builder-preview.ts). The storefront keeps its old names: `PublishedShell`, `PublicPage`, `PublicSection`, `PublicNavItem`, `PublicFooterLink`, `PublicSource`, `PublicMedia`, `Direction`.

- [ ] **Step 1: Write the failing test**

`apps/customer/src/shared/lib/builder-protocol.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  BUILDER_PREVIEW_PATH,
  BUILDER_PREVIEW_PROTOCOL,
  fromCanvas,
  isFromCanvasMessage,
  isToCanvasMessage,
  toCanvas,
  type PublicSiteShell,
} from "@octopus/api-client";

const shell = { language: "ar" } as unknown as PublicSiteShell;

describe("builder preview protocol", () => {
  it("lives under the reserved preview segment", () => {
    expect(BUILDER_PREVIEW_PATH).toBe("/preview/builder");
    expect(BUILDER_PREVIEW_PROTOCOL).toBe(1);
  });

  it("recognises the messages it builds", () => {
    expect(isToCanvasMessage(toCanvas({ type: "render", shell, page: null, pageLoading: false, menus: {}, highlightSectionId: null }))).toBe(true);
    expect(isToCanvasMessage(toCanvas({ type: "scroll-to", anchor: "menu" }))).toBe(true);
    expect(isFromCanvasMessage(fromCanvas({ type: "ready" }))).toBe(true);
    expect(isFromCanvasMessage(fromCanvas({ type: "navigate", href: "/about" }))).toBe(true);
    expect(isFromCanvasMessage(fromCanvas({ type: "language", language: "en" }))).toBe(true);
    expect(isFromCanvasMessage(fromCanvas({ type: "select-section", sectionId: "s1" }))).toBe(true);
  });

  it("ignores another protocol version, another channel, and malformed bodies", () => {
    expect(isFromCanvasMessage({ ...fromCanvas({ type: "ready" }), protocol: 2 })).toBe(false);
    expect(isFromCanvasMessage({ ...fromCanvas({ type: "ready" }), channel: "octopus-builder" })).toBe(false);
    expect(isFromCanvasMessage({ ...fromCanvas({ type: "navigate", href: "/" }), href: 42 })).toBe(false);
    expect(isToCanvasMessage({ ...toCanvas({ type: "scroll-to", anchor: "a" }), channel: "octopus-builder-canvas" })).toBe(false);
    expect(isToCanvasMessage({ channel: "octopus-builder", protocol: 1, type: "render", shell, page: null, menus: null })).toBe(false);
    expect(isToCanvasMessage("render")).toBe(false);
    expect(isToCanvasMessage(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/customer && npx vitest run src/shared/lib/builder-protocol.test.ts`
Expected: FAIL. The imports do not exist yet (`toCanvas is not a function` / module has no exported member).

- [ ] **Step 3: Create `packages/api-client/src/contracts/public-read.ts`**

```ts
// The anonymous public read of a Public Link site (backend PublicReadContracts.cs), camelCase JSON:
//   GET /v1/public-site?lang=              -> PublicSiteShell
//   GET /v1/public-site/pages?path=&lang=  -> one PublicSitePage
// The storefront renders from these. The builder's live preview produces the same shapes from the
// unsaved draft (apps/merchant .../_shared/live-site.ts `draftPublicRead`) and sends them to the
// storefront's canvas route, which renders them with the same components — hence one definition here.

export type PublicSiteDirection = "ltr" | "rtl";

export interface PublicSiteMedia {
  url: string;
  width?: number | null;
  height?: number | null;
}

export interface PublicSiteNavItem {
  label: string;
  iconKey: string | null;
  href: string | null;
  /** "Page" | "Anchor" | "External" | "Group". */
  kind: string;
  openInNewTab: boolean;
  showInHeader: boolean;
  showInDrawer: boolean;
  children: PublicSiteNavItem[];
}

export interface PublicSiteFooterLink {
  label: string;
  href: string;
  kind: string;
  openInNewTab: boolean;
}

export interface PublicSiteShell {
  host: string;
  canonicalBaseUrl: string;
  language: string;
  direction: PublicSiteDirection;
  defaultLanguage: string;
  languages: { code: string; direction: PublicSiteDirection }[];
  theme: {
    key: string;
    colors: Record<string, string>;
    typography: Record<string, { heading: string | null; body: string | null }>;
    layout: Record<string, string>;
  };
  brand: { displayName: string; logo: PublicSiteMedia | null; favicon: PublicSiteMedia | null };
  seo: {
    titleTemplate: string | null;
    defaultTitle: string;
    defaultDescription: string | null;
    socialImageUrl: string | null;
    noIndex: boolean;
  };
  navigation: {
    options: { stickyHeader: boolean; showActivePageIndicator: boolean; showIcons: boolean; openLinksInSameTab: boolean };
    items: PublicSiteNavItem[];
  };
  footer: {
    groups: { title: string; links: PublicSiteFooterLink[] }[];
    socialLinks: { network: string; url: string }[];
    contact: { address: string | null; hours: string | null; phone: string | null };
  };
  pages: { path: string; title: string; isHome: boolean; noIndex: boolean; lastModifiedUtc: string }[];
  isPreview: boolean;
  /** Present on a preview read only. */
  preview?: { siteVersion: number; expiresAtUtc: string } | null;
}

export interface PublicSiteSource {
  sourceKey: string;
  version: number | null;
  /** The opaque key the owning module's public read takes (the builder sends the content key). */
  publicLinkKey: string | null;
  settings: unknown;
}

/** A resolved field: text a string, media `{url,…}`, link `{href,kind,label?}`, rich text a block array, list `[{id,fields}]`. */
export interface PublicSiteSection {
  sectionId: string;
  type: string;
  anchor: string | null;
  styleVariant: string | null;
  style: Record<string, unknown>;
  fields: Record<string, unknown>;
  source: PublicSiteSource | null;
  /** Device classes (`mobile`, `tablet`, `desktop`) the section is hidden on; absent from older reads. */
  hiddenOn?: string[] | null;
}

export interface PublicSitePage {
  pageId: string;
  path: string;
  isHome: boolean;
  kind: string;
  title: string;
  seo: { title: string; description: string | null; socialImageUrl: string | null; noIndex: boolean; canonicalUrl: string };
  layout: { header: unknown; hideFooter: boolean };
  source: PublicSiteSource | null;
  sections: PublicSiteSection[];
  lastModifiedUtc: string;
}
```

- [ ] **Step 4: Create `packages/api-client/src/contracts/builder-preview.ts`**

```ts
// The Public Link builder's live preview: the merchant console frames the customer storefront's
// canvas route and drives it with postMessage (US-019 builder). Builder -> canvas: what to render
// (the public read shapes, produced from the unsaved draft). Canvas -> builder: what the visitor did.
// Both sides validate every message with the guards below AND check the sender (origin and window);
// see apps/customer/src/views/builder-canvas and apps/merchant/src/pages/public-link/ui/storefront-frame.tsx.
import type { PublicSitePage, PublicSiteShell } from "./public-read";

/** Bumped when a message changes shape; each side ignores other versions. */
export const BUILDER_PREVIEW_PROTOCOL = 1 as const;
/** The storefront route the builder frames. `preview` is a reserved first path segment, so no page can take it. */
export const BUILDER_PREVIEW_PATH = "/preview/builder";
export const BUILDER_CHANNEL = "octopus-builder" as const;
export const CANVAS_CHANNEL = "octopus-builder-canvas" as const;

/** A menu as the storefront's public menu read gives it, with images already delivery URLs. */
export interface BuilderMenuDocument {
  sections: { name: string; description: string | null; image: string | null; entries: { ref: string; kind: string }[] }[];
  items: Record<
    string,
    {
      name: string;
      description: string | null;
      image: string | null;
      price: { amount: number } | null;
      isAvailable: boolean;
      modifierGroupRefs: string[];
      tags?: string[];
    }
  >;
  modifierGroups: Record<
    string,
    {
      name: string;
      selectionMode: string;
      isRequired?: boolean;
      options: { id?: string; name: string; effect?: { amount?: { amount: number } | null }; isDefault?: boolean }[];
    }
  >;
}

export interface BuilderRenderPayload {
  shell: PublicSiteShell;
  /** The page to show; null when it is not on the site (hidden, content unavailable) or still loading. */
  page: PublicSitePage | null;
  pageLoading: boolean;
  /** Menu documents by `source.publicLinkKey`; a missing key is still loading, null means none. */
  menus: Record<string, BuilderMenuDocument | null>;
  /** The section the merchant is editing: outlined and scrolled into view. */
  highlightSectionId: string | null;
}

export type ToCanvasBody = ({ type: "render" } & BuilderRenderPayload) | { type: "scroll-to"; anchor: string };
export type ToCanvasMessage = ToCanvasBody & { channel: typeof BUILDER_CHANNEL; protocol: typeof BUILDER_PREVIEW_PROTOCOL };
export type BuilderRenderMessage = Extract<ToCanvasMessage, { type: "render" }>;

export type FromCanvasBody =
  | { type: "ready" }
  | { type: "navigate"; href: string }
  | { type: "language"; language: string }
  | { type: "select-section"; sectionId: string };
export type FromCanvasMessage = FromCanvasBody & { channel: typeof CANVAS_CHANNEL; protocol: typeof BUILDER_PREVIEW_PROTOCOL };

export const toCanvas = (body: ToCanvasBody): ToCanvasMessage => ({ ...body, channel: BUILDER_CHANNEL, protocol: BUILDER_PREVIEW_PROTOCOL });
export const fromCanvas = (body: FromCanvasBody): FromCanvasMessage => ({ ...body, channel: CANVAS_CHANNEL, protocol: BUILDER_PREVIEW_PROTOCOL });

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function isToCanvasMessage(data: unknown): data is ToCanvasMessage {
  if (!isObject(data) || data.channel !== BUILDER_CHANNEL || data.protocol !== BUILDER_PREVIEW_PROTOCOL) return false;
  if (data.type === "render") return isObject(data.shell) && (data.page === null || isObject(data.page)) && isObject(data.menus);
  if (data.type === "scroll-to") return typeof data.anchor === "string";
  return false;
}

export function isFromCanvasMessage(data: unknown): data is FromCanvasMessage {
  if (!isObject(data) || data.channel !== CANVAS_CHANNEL || data.protocol !== BUILDER_PREVIEW_PROTOCOL) return false;
  switch (data.type) {
    case "ready":
      return true;
    case "navigate":
      return typeof data.href === "string";
    case "language":
      return typeof data.language === "string";
    case "select-section":
      return typeof data.sectionId === "string";
    default:
      return false;
  }
}
```

- [ ] **Step 5: Export both from `packages/api-client/src/index.ts`**

Add after `export * from "./contracts/public-link";`:

```ts
export * from "./contracts/public-read";
export * from "./contracts/builder-preview";
```

- [ ] **Step 6: Make the storefront use the shared types**

In `apps/customer/src/shared/api/public-api.ts`, replace everything from `export type Direction = "ltr" | "rtl";` down to and including the closing `}` of `export interface PublicPage { … }` with:

```ts
// The public read shapes live in @octopus/api-client (contracts/public-read.ts): the builder's live
// preview produces the same shapes from the draft and hands them to the canvas route.
import type {
  PublicSiteDirection,
  PublicSiteFooterLink,
  PublicSiteMedia,
  PublicSiteNavItem,
  PublicSitePage,
  PublicSiteSection,
  PublicSiteShell,
  PublicSiteSource,
} from "@octopus/api-client";
export type Direction = PublicSiteDirection;
export type PublicMedia = PublicSiteMedia;
export type PublicNavItem = PublicSiteNavItem;
export type PublicFooterLink = PublicSiteFooterLink;
export type PublishedShell = PublicSiteShell;
export type PublicSource = PublicSiteSource;
export type PublicSection = PublicSiteSection;
export type PublicPage = PublicSitePage;

/** A resolved field value: text is a string, media `{url,…}`, link `{href,kind,label?}`, rich text a block array, list `[{id,fields}]`. */
export type SectionFields = Record<string, unknown>;
```

Keep `fetchShell`, `PublishedPageRead` and `fetchPage` exactly as they are (they refer to `PublishedShell` / `PublicPage`, which are now the aliases above). Also update the comment at the top of the file: replace the sentence "The types below are defined locally on purpose: they mirror the backend's PublishedReadContracts.cs and must not depend on the api-client's builder types." with "The public read types are shared with the builder's live preview (@octopus/api-client contracts/public-read.ts)."

- [ ] **Step 7: Run the tests and the type check**

Run: `cd apps/customer && npx vitest run && npx tsc --noEmit -p .`
Expected: every test passes, including 3 new ones; tsc exits 0.
Run: `cd ../merchant && npx tsc --noEmit -p .`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add packages/api-client/src/contracts/public-read.ts packages/api-client/src/contracts/builder-preview.ts packages/api-client/src/index.ts apps/customer/src/shared/api/public-api.ts apps/customer/src/shared/lib/builder-protocol.test.ts
git commit -m "Share the public site read types and add the builder preview protocol"
```

---

### Task 2: Storefront — client-safe helpers the canvas reuses

`menuFromDocument` lives in a server-only file. `navLinks` lives inside the root layout, and the page-source menu rule lives inside a server view. The canvas is a client component, so these move to modules it can import. Behaviour does not change.

**Files:**
- Create: `apps/customer/src/shared/api/menu-document.ts`
- Modify: `apps/customer/src/shared/api/public-api.ts` (the "published menu" block)
- Create: `apps/customer/src/widgets/site-header/nav-links.ts`
- Modify: `apps/customer/src/widgets/site-header/index.ts`
- Modify: `apps/customer/src/app/layout.tsx`
- Create: `apps/customer/src/widgets/page-sections/sections-of.ts`
- Modify: `apps/customer/src/widgets/page-sections/index.ts`
- Modify: `apps/customer/src/views/published-page/published-page-view.tsx`
- Test: `apps/customer/src/widgets/site-header/nav-links.test.ts`, `apps/customer/src/widgets/page-sections/sections-of.test.ts`

**Interfaces:**
- Consumes: `PublicSiteShell`, `PublicSiteNavItem`, `PublicSitePage`, `PublicSiteSection` (Task 1).
- Produces: `menuFromDocument(doc: PublicMenuDocument): Menu`, `imageUrl(image, fallback?)`, `type PublicMenuDocument`, `type Menu` (menu-document.ts); `navLinks(shell: PublicSiteShell, homeLabel: string): SiteNavLink[]` (widgets/site-header); `sectionsOf(page): PublicSiteSection[]`, `menuKeysOf(page): string[]` (widgets/page-sections).

- [ ] **Step 1: Write the failing tests**

`apps/customer/src/widgets/site-header/nav-links.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { PublicSiteShell } from "@octopus/api-client";
import { navLinks } from "./nav-links";

const shell = {
  pages: [
    { path: "/", title: "الرئيسية", isHome: true, noIndex: false, lastModifiedUtc: "" },
    { path: "/about", title: "من نحن", isHome: false, noIndex: false, lastModifiedUtc: "" },
  ],
  navigation: {
    options: { stickyHeader: false, showActivePageIndicator: false, showIcons: false, openLinksInSameTab: true },
    items: [
      { label: "", iconKey: null, href: "/", kind: "Page", openInNewTab: false, showInHeader: true, showInDrawer: true, children: [] },
      {
        label: "روابط",
        iconKey: null,
        href: null,
        kind: "Group",
        openInNewTab: false,
        showInHeader: true,
        showInDrawer: true,
        children: [
          { label: "", iconKey: null, href: "/about", kind: "Page", openInNewTab: false, showInHeader: true, showInDrawer: false, children: [] },
          { label: "خارجي", iconKey: null, href: "https://x.test", kind: "External", openInNewTab: true, showInHeader: true, showInDrawer: true, children: [] },
        ],
      },
    ],
  },
} as unknown as PublicSiteShell;

describe("navLinks", () => {
  it("flattens children after their parent, labels pages by title and home by the home label", () => {
    expect(navLinks(shell, "Home")).toEqual([
      { label: "الرئيسية", href: "/", openInNewTab: false, inHeader: true, inDrawer: true },
      { label: "من نحن", href: "/about", openInNewTab: false, inHeader: true, inDrawer: false },
      // openLinksInSameTab wins over the item's own new-tab flag.
      { label: "خارجي", href: "https://x.test", openInNewTab: false, inHeader: true, inDrawer: true },
    ]);
  });
});
```

`apps/customer/src/widgets/page-sections/sections-of.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { PublicSitePage } from "@octopus/api-client";
import { menuKeysOf, sectionsOf } from "./sections-of";

const base = { pageId: "p1", path: "/menu", isHome: false, kind: "SourceBound", title: "Menu", seo: {}, layout: { header: null, hideFooter: false }, lastModifiedUtc: "" };
const menuSource = { sourceKey: "menu", version: 1, publicLinkKey: "k1", settings: null };

describe("sectionsOf / menuKeysOf", () => {
  it("renders a menu-bound page with no Menu section of its own as one Menu section", () => {
    const page = { ...base, source: menuSource, sections: [] } as unknown as PublicSitePage;
    expect(sectionsOf(page).map((s) => [s.type, s.source?.publicLinkKey])).toEqual([["menu", "k1"]]);
    expect(menuKeysOf(page)).toEqual(["k1"]);
  });

  it("leaves a page that already has its Menu section unchanged, and lists each menu once", () => {
    const menu = { sectionId: "s", type: "menu", anchor: null, styleVariant: null, style: {}, fields: {}, source: menuSource };
    const page = { ...base, source: menuSource, sections: [menu, { ...menu, sectionId: "t" }] } as unknown as PublicSitePage;
    expect(sectionsOf(page)).toBe(page.sections);
    expect(menuKeysOf(page)).toEqual(["k1"]);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd apps/customer && npx vitest run src/widgets`
Expected: FAIL. Cannot find module `./nav-links` / `./sections-of`.

- [ ] **Step 3: Create `apps/customer/src/shared/api/menu-document.ts`**

Move from `public-api.ts`, unchanged: the `PublicMenuDocument` interface (exported now), the `PLACEHOLDER` constant, `imageUrl`, `slugify`, `Menu` and `menuFromDocument`. The file starts with:

```ts
// The published menu document -> the storefront's menu shape. Client-safe (no node:http, no
// next/headers), so the builder canvas can render a menu the builder hands it.
import type { MenuCategory, MenuItem, MenuItemModifierGroup } from "@octopus/api-client";
```

Then paste the moved code, with `export` in front of `interface PublicMenuDocument`, and change `menuFromDocument`'s parameter to

```ts
export function menuFromDocument(doc: Pick<PublicMenuDocument, "sections" | "items" | "modifierGroups">): Menu {
```

(it never read `doc.menu`, and the builder's `BuilderMenuDocument` does not carry it).

- [ ] **Step 4: Point `public-api.ts` at it**

In `apps/customer/src/shared/api/public-api.ts`, delete the moved declarations from the "published menu" block. Add below the imports:

```ts
import { menuFromDocument, type PublicMenuDocument } from "./menu-document";
export { imageUrl, menuFromDocument, type Menu } from "./menu-document";
```

Remove `MenuCategory`, `MenuItem` and `MenuItemModifierGroup` from the `@octopus/api-client` import if nothing else in the file uses them (`Tenant` stays). `fetchSiteMenu` and `fetchMenuByAccessKey` stay and keep calling `menuFromDocument(doc)`.

- [ ] **Step 5: Create `apps/customer/src/widgets/site-header/nav-links.ts`**

```ts
import type { PublicSiteNavItem, PublicSiteShell } from "@octopus/api-client";
import type { SiteNavLink } from "./site-header";

/** The published navigation, flattened for the header (children follow their parent). */
export function navLinks(shell: PublicSiteShell, homeLabel: string): SiteNavLink[] {
  const titleOf = (href: string) => shell.pages.find((p) => p.path === href)?.title;
  const out: SiteNavLink[] = [];
  const walk = (items: PublicSiteNavItem[]) => {
    for (const item of items) {
      if (item.href) {
        const label = item.label || titleOf(item.href) || (item.href === "/" ? homeLabel : "");
        if (label) {
          out.push({
            label,
            href: item.href,
            openInNewTab: item.openInNewTab && !shell.navigation.options.openLinksInSameTab,
            inHeader: item.showInHeader,
            inDrawer: item.showInDrawer,
          });
        }
      }
      walk(item.children);
    }
  };
  walk(shell.navigation.items);
  return out;
}
```

Append to `apps/customer/src/widgets/site-header/index.ts`:

```ts
export { navLinks } from "./nav-links";
```

In `apps/customer/src/app/layout.tsx`: delete the local `navLinks` function (the block starting `/** The published navigation, flattened for the header (children follow their parent). */`). Change the import `import { SiteHeader, type SiteNavLink } from "@/widgets/site-header";` to `import { navLinks, SiteHeader } from "@/widgets/site-header";`, and remove `PublicNavItem` from the `@/shared/api/public-api` type import.

- [ ] **Step 6: Create `apps/customer/src/widgets/page-sections/sections-of.ts`**

```ts
import type { PublicSitePage, PublicSiteSection } from "@octopus/api-client";

/** A page's sections as the storefront renders them: a module page bound to the menu as a whole
 *  (with no Menu section of its own) shows its menu as one Menu section. */
export function sectionsOf(page: PublicSitePage): PublicSiteSection[] {
  if (page.source?.sourceKey === "menu" && page.source.publicLinkKey && !page.sections.some((s) => s.type === "menu")) {
    return [
      ...page.sections,
      { sectionId: `page-${page.pageId}`, type: "menu", anchor: "menu", styleVariant: null, style: {}, fields: {}, source: page.source },
    ];
  }
  return page.sections;
}

/** The `publicLinkKey` of every menu the page shows, once each. */
export function menuKeysOf(page: PublicSitePage): string[] {
  const keys = new Set<string>();
  for (const s of sectionsOf(page)) if (s.source?.sourceKey === "menu" && s.source.publicLinkKey) keys.add(s.source.publicLinkKey);
  return [...keys];
}
```

Append to `apps/customer/src/widgets/page-sections/index.ts`:

```ts
export { menuKeysOf, sectionsOf } from "./sections-of";
```

Replace the body of `PublishedPageView` in `apps/customer/src/views/published-page/published-page-view.tsx` (keep `publishedPageMetadata` as is):

```tsx
/** One published page: its sections, with the menu each Menu section is bound to. */
export async function PublishedPageView({ page, shell }: { page: PublicPage; shell: PublishedShell }) {
  const entries = await Promise.all(menuKeysOf(page).map(async (key) => [key, await loadMenuByKey(key)] as const));
  return (
    <PageSections
      sections={sectionsOf(page)}
      menus={Object.fromEntries(entries)}
      brandName={shell.brand.displayName}
      title={page.isHome ? undefined : page.title}
    />
  );
}
```

and change its import `import { PageSections } from "@/widgets/page-sections";` to `import { menuKeysOf, PageSections, sectionsOf } from "@/widgets/page-sections";`.

- [ ] **Step 7: Run the tests and the type check**

Run: `cd apps/customer && npx vitest run && npx tsc --noEmit -p .`
Expected: all pass (including the existing `public-api.test.ts`, which still imports from `public-api`); tsc exits 0.

- [ ] **Step 8: Commit**

```bash
git add apps/customer/src/shared/api/menu-document.ts apps/customer/src/shared/api/public-api.ts apps/customer/src/widgets/site-header apps/customer/src/app/layout.tsx apps/customer/src/widgets/page-sections apps/customer/src/views/published-page/published-page-view.tsx
git commit -m "Move storefront nav, section and menu helpers into client-safe modules"
```

---

### Task 3: Storefront — merchant origins and the canvas route's headers

**Files:**
- Create: `apps/customer/src/shared/lib/merchant-origins.ts`
- Modify: `apps/customer/src/shared/lib/preview.ts` (remove `previewFrameAncestors`)
- Modify: `apps/customer/src/shared/lib/preview-middleware.ts`
- Modify: `apps/customer/src/shared/lib/preview.test.ts` (the `describe("previewFrameAncestors", …)` block)
- Modify: `apps/customer/src/middleware.ts`
- Modify: `apps/customer/.env.example`
- Test: `apps/customer/src/shared/lib/merchant-origins.test.ts`

**Interfaces:**
- Consumes: `BUILDER_PREVIEW_PATH` (Task 1).
- Produces: `DEV_MERCHANT_ORIGINS`, `merchantOrigins(configured, production): string[]`, `currentMerchantOrigins(): string[]`, `frameAncestors(origins): string`, `BUILDER_CANVAS_HEADER` (`"x-octo-builder-canvas"`), `isBuilderCanvasPath(pathname): boolean`, `builderCanvasResponseHeaders(origins): Record<string, string>`.

- [ ] **Step 1: Write the failing test**

`apps/customer/src/shared/lib/merchant-origins.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { builderCanvasResponseHeaders, DEV_MERCHANT_ORIGINS, frameAncestors, isBuilderCanvasPath, merchantOrigins } from "./merchant-origins";

describe("merchantOrigins", () => {
  it("keeps real origins only, without trailing slashes", () => {
    expect(merchantOrigins("https://app.octopus.app/, javascript:alert(1) * http://x.test:8080", true)).toEqual([
      "https://app.octopus.app",
      "http://x.test:8080",
    ]);
  });

  it("adds the merchant dev server outside production, and nothing in production", () => {
    expect(merchantOrigins(undefined, false)).toEqual(DEV_MERCHANT_ORIGINS);
    expect(merchantOrigins(undefined, true)).toEqual([]);
  });
});

describe("frameAncestors", () => {
  it("always allows the storefront itself, then the listed origins", () => {
    expect(frameAncestors([])).toBe("frame-ancestors 'self'");
    expect(frameAncestors(["https://app.octopus.app"])).toBe("frame-ancestors 'self' https://app.octopus.app");
  });
});

describe("the builder canvas route", () => {
  it("is /preview/builder, with or without a trailing slash, and nothing else", () => {
    expect(isBuilderCanvasPath("/preview/builder")).toBe(true);
    expect(isBuilderCanvasPath("/preview/builder/")).toBe(true);
    expect(isBuilderCanvasPath("/preview")).toBe(false);
    expect(isBuilderCanvasPath("/preview/builder/x")).toBe(false);
  });

  it("is framable by the merchant console only, never cached or indexed", () => {
    expect(builderCanvasResponseHeaders(["https://app.octopus.app"])).toEqual({
      "Content-Security-Policy": "frame-ancestors 'self' https://app.octopus.app",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/customer && npx vitest run src/shared/lib/merchant-origins.test.ts`
Expected: FAIL. Cannot find module `./merchant-origins`.

- [ ] **Step 3: Create `apps/customer/src/shared/lib/merchant-origins.ts`**

```ts
// The merchant console origins the storefront trusts: they may frame a draft preview and drive the
// builder's live preview canvas (/preview/builder) with postMessage. Pure helpers (no next/* imports),
// shared by the middleware, the canvas route and the tests.
import { BUILDER_PREVIEW_PATH } from "@octopus/api-client";

/** The merchant app's Vite dev server (apps/merchant/vite.config.ts `server.port`). */
export const DEV_MERCHANT_ORIGINS: readonly string[] = ["http://localhost:5290", "http://127.0.0.1:5290"];

const ORIGIN = /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i;

/** `configured` is MERCHANT_APP_ORIGINS: origins separated by spaces or commas; anything else is ignored. */
export function merchantOrigins(configured: string | null | undefined, production: boolean): string[] {
  const listed = (configured ?? "")
    .split(/[\s,]+/)
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter((o) => ORIGIN.test(o));
  return [...new Set(production ? listed : [...listed, ...DEV_MERCHANT_ORIGINS])];
}

export const currentMerchantOrigins = (): string[] =>
  merchantOrigins(process.env.MERCHANT_APP_ORIGINS, process.env.NODE_ENV === "production");

export const frameAncestors = (origins: readonly string[]): string => ["frame-ancestors 'self'", ...origins].join(" ");

/** Set by middleware on the canvas route's request, so the root layout renders a bare document. */
export const BUILDER_CANVAS_HEADER = "x-octo-builder-canvas";

export const isBuilderCanvasPath = (pathname: string): boolean => (pathname.replace(/\/+$/, "") || "/") === BUILDER_PREVIEW_PATH;

export function builderCanvasResponseHeaders(origins: readonly string[]): Record<string, string> {
  return {
    "Content-Security-Policy": frameAncestors(origins),
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "Referrer-Policy": "no-referrer",
  };
}
```

- [ ] **Step 4: Use it for draft previews too**

In `apps/customer/src/shared/lib/preview.ts`, delete the `previewFrameAncestors` function and its doc comment (added by the previous change).

In `apps/customer/src/shared/lib/preview-middleware.ts`: remove `previewFrameAncestors,` from the `./preview` import, add `import { currentMerchantOrigins, frameAncestors } from "./merchant-origins";`, and in `withPreviewHeaders` replace

```ts
  res.headers.set("Content-Security-Policy", previewFrameAncestors(process.env.PREVIEW_FRAME_ANCESTORS));
```

with

```ts
  // A draft preview may be framed by the storefront itself and the merchant console only.
  res.headers.set("Content-Security-Policy", frameAncestors(currentMerchantOrigins()));
```

In `apps/customer/src/shared/lib/preview.test.ts`: remove `previewFrameAncestors,` from the `./preview` import, and replace the whole `describe("previewFrameAncestors", () => { … });` block with:

```ts
describe("preview framing", () => {
  it("marks every preview response with frame-ancestors", () => {
    const res = applyPreviewHeaders(req("https://x.octopus.app/", `${PREVIEW_COOKIE_NAME}=${TOKEN}`), NextResponse.next());
    expect(res.headers.get("Content-Security-Policy")).toMatch(/^frame-ancestors 'self'/);
  });
});
```

- [ ] **Step 5: Handle the canvas route in `apps/customer/src/middleware.ts`**

Add the import:

```ts
import { BUILDER_CANVAS_HEADER, builderCanvasResponseHeaders, currentMerchantOrigins, isBuilderCanvasPath } from "@/shared/lib/merchant-origins";
```

In `middleware`, right after `if (preview) return preview;`, insert:

```ts
  // The builder's live preview canvas: a bare document the merchant console fills with postMessage.
  // It reads no site data itself, so it needs no tenant; it may only be framed by the console.
  if (isBuilderCanvasPath(request.nextUrl.pathname)) {
    const canvasHeaders = new Headers(request.headers);
    canvasHeaders.set(BUILDER_CANVAS_HEADER, "1");
    const res = NextResponse.next({ request: { headers: canvasHeaders } });
    for (const [k, v] of Object.entries(builderCanvasResponseHeaders(currentMerchantOrigins()))) res.headers.set(k, v);
    return res;
  }
```

In the tenant branch below it, also strip the header, so that no request can smuggle it into a normal page: after `requestHeaders.set(TENANT_SLUG_HEADER, slug);` add `requestHeaders.delete(BUILDER_CANVAS_HEADER);`.

- [ ] **Step 6: Document the variable in `apps/customer/.env.example`**

Append:

```
# Merchant console origins trusted by the storefront: they may frame draft previews and drive
# the builder's live preview canvas (/preview/builder). Space- or comma-separated, e.g.
# https://app.octopus.app. Outside production http://localhost:5290 and http://127.0.0.1:5290
# are always added.
MERCHANT_APP_ORIGINS=
```

- [ ] **Step 7: Run the tests and the type check**

Run: `cd apps/customer && npx vitest run && npx tsc --noEmit -p .`
Expected: all pass; tsc exits 0.

- [ ] **Step 8: Commit**

```bash
git add apps/customer/src/shared/lib apps/customer/src/middleware.ts apps/customer/.env.example
git commit -m "Trust the merchant console origins and add the builder canvas route headers"
```

---

### Task 4: Storefront — the builder canvas route

**Files:**
- Create: `apps/customer/src/views/builder-canvas/canvas-messages.ts`
- Create: `apps/customer/src/views/builder-canvas/builder-canvas.tsx`
- Create: `apps/customer/src/views/builder-canvas/index.ts`
- Create: `apps/customer/src/app/preview/builder/page.tsx`
- Modify: `apps/customer/src/app/layout.tsx`
- Modify: `apps/customer/src/features/session/switch-locale/switch-locale.tsx`
- Modify: `apps/customer/src/widgets/site-header/site-header.tsx`
- Modify: `apps/customer/src/widgets/site-footer/site-footer.tsx`, `apps/customer/src/widgets/site-footer/index.ts`
- Modify: `apps/customer/src/widgets/page-sections/page-sections.tsx`
- Test: `apps/customer/src/views/builder-canvas/canvas-messages.test.ts`

**Interfaces:**
- Consumes: Task 1 (`toCanvas`/`fromCanvas`, `isToCanvasMessage`, `BuilderRenderMessage`, `FromCanvasBody`), Task 2 (`menuFromDocument`, `navLinks`, `sectionsOf`), Task 3 (`BUILDER_CANVAS_HEADER`, `currentMerchantOrigins`).
- Produces: `acceptToCanvas(event, allowedOrigins, parent): ToCanvasMessage | null`, `canvasLinkTarget(href, ownOrigin): string | null`, `<BuilderCanvas allowedOrigins={string[]} />`. The storefront widgets gain `SiteHeader` props `currentPath?: string` and `onSwitchLanguage?: (language: string) => void`, `SwitchLocale` prop `onSwitch?: (language: string) => void`, and the exported `PublishedSiteFooter`. Every rendered section wrapper carries `data-section-id`.

- [ ] **Step 1: Write the failing test**

`apps/customer/src/views/builder-canvas/canvas-messages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toCanvas, type PublicSiteShell } from "@octopus/api-client";
import { acceptToCanvas, canvasLinkTarget } from "./canvas-messages";

const parent = { name: "parent" };
const allowed = ["https://app.octopus.app"];
const scroll = toCanvas({ type: "scroll-to", anchor: "menu" });

describe("acceptToCanvas", () => {
  it("takes a well-formed message from the parent window at an allowed origin", () => {
    expect(acceptToCanvas({ origin: "https://app.octopus.app", source: parent, data: scroll }, allowed, parent)).toEqual(scroll);
  });

  it("ignores another window, another origin, and malformed data", () => {
    expect(acceptToCanvas({ origin: "https://app.octopus.app", source: { name: "opener" }, data: scroll }, allowed, parent)).toBeNull();
    expect(acceptToCanvas({ origin: "https://evil.test", source: parent, data: scroll }, allowed, parent)).toBeNull();
    expect(acceptToCanvas({ origin: "https://app.octopus.app", source: parent, data: { ...scroll, protocol: 9 } }, allowed, parent)).toBeNull();
    const render = toCanvas({ type: "render", shell: {} as PublicSiteShell, page: null, pageLoading: false, menus: {}, highlightSectionId: null });
    expect(acceptToCanvas({ origin: "https://app.octopus.app", source: parent, data: render }, [], parent)).toBeNull();
  });
});

describe("canvasLinkTarget", () => {
  const own = "https://ocean.octopus.app";
  it("turns a same-site link into its path and hash", () => {
    expect(canvasLinkTarget("/about", own)).toBe("/about");
    expect(canvasLinkTarget("/#menu", own)).toBe("/#menu");
    expect(canvasLinkTarget("#story", own)).toBe("#story");
    expect(canvasLinkTarget("https://ocean.octopus.app/contact?x=1#map", own)).toBe("/contact#map");
  });

  it("refuses anything that would leave the site", () => {
    expect(canvasLinkTarget("https://instagram.com/ocean", own)).toBeNull();
    expect(canvasLinkTarget("mailto:hi@ocean.test", own)).toBeNull();
    expect(canvasLinkTarget("tel:+966500000000", own)).toBeNull();
    expect(canvasLinkTarget("javascript:alert(1)", own)).toBeNull();
    expect(canvasLinkTarget("//evil.test/x", own)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/customer && npx vitest run src/views/builder-canvas`
Expected: FAIL. Cannot find module `./canvas-messages`.

- [ ] **Step 3: Create `apps/customer/src/views/builder-canvas/canvas-messages.ts`**

```ts
// Pure helpers of the builder canvas: which messages to trust, and where a clicked link goes.
import { isToCanvasMessage, type ToCanvasMessage } from "@octopus/api-client";

/** The message, when it comes from the parent window at an allowed origin and is well formed; else null. */
export function acceptToCanvas(
  event: { origin: string; source: unknown; data: unknown },
  allowedOrigins: readonly string[],
  parent: unknown
): ToCanvasMessage | null {
  if (event.source !== parent || !allowedOrigins.includes(event.origin)) return null;
  return isToCanvasMessage(event.data) ? event.data : null;
}

/** A same-site link as `path#hash` (the builder opens that page); null for anything that leaves the site. */
export function canvasLinkTarget(href: string, ownOrigin: string): string | null {
  if (href.startsWith("#")) return href;
  let url: URL;
  try {
    url = new URL(href, ownOrigin);
  } catch {
    return null;
  }
  if (url.origin !== ownOrigin) return null;
  return `${url.pathname}${url.hash}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/customer && npx vitest run src/views/builder-canvas`
Expected: PASS (4 tests).

- [ ] **Step 5: Give the storefront widgets what the canvas needs**

`apps/customer/src/features/session/switch-locale/switch-locale.tsx`: add to `SwitchLocaleProps`

```ts
  /** Builder canvas only: report the switch instead of setting the cookie and reloading. */
  onSwitch?: (language: string) => void;
```

Destructure `onSwitch` in `SwitchLocale`, and make the first lines of `handleClick`:

```ts
    if (onSwitch) {
      onSwitch(next!);
      return;
    }
```

`apps/customer/src/widgets/site-header/site-header.tsx`: add to `SiteHeaderProps`

```ts
  /** The page being shown, when it is not the URL's (the builder canvas renders every page at one URL). */
  currentPath?: string;
  /** Builder canvas only: the language pill reports the switch instead of reloading. */
  onSwitchLanguage?: (language: string) => void;
```

Destructure both. Replace `const pathname = usePathname();` with:

```ts
  const urlPath = usePathname();
  const pathname = currentPath ?? urlPath;
```

and change `<SwitchLocale locale={locale} languages={languages} />` to `<SwitchLocale locale={locale} languages={languages} onSwitch={onSwitchLanguage} />`.

`apps/customer/src/widgets/site-footer/site-footer.tsx`: change `function PublishedSiteFooter(` to `export function PublishedSiteFooter(`. In `apps/customer/src/widgets/site-footer/index.ts` add `PublishedSiteFooter` to the exported names from `./site-footer`.

`apps/customer/src/widgets/page-sections/page-sections.tsx`: tag every section wrapper so the canvas can outline and select it. Replace the hero line

```tsx
      {hero && (hero.hiddenOn?.length ? <div className={hiddenOnClass(hero.hiddenOn)}>{render(hero)}</div> : render(hero))}
```

with

```tsx
      {hero && (
        <div data-section-id={hero.sectionId} className={hiddenOnClass(hero.hiddenOn) || undefined}>
          {render(hero)}
        </div>
      )}
```

and in the body map add `data-section-id={section.sectionId}` to the `<div key={section.sectionId} …>` wrapper.

- [ ] **Step 6: Create the canvas `apps/customer/src/views/builder-canvas/builder-canvas.tsx`**

```tsx
"use client";

// The Public Link builder's live preview canvas (route /preview/builder). It fetches nothing and
// renders nothing of its own: the merchant console frames it and sends, with postMessage, the site
// as the draft would publish it (the same shapes the public read returns), which it renders with the
// storefront's own components. Clicks go back to the console: a link to one of the site's pages
// opens that page in the builder, the language pill switches the builder's preview language, and
// a click on a section selects it for editing. Nothing here ever navigates away.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fromCanvas, type BuilderRenderMessage, type FromCanvasBody } from "@octopus/api-client";
import { defaultLocale, locales, type Locale } from "@i18n/index";
import { StoreI18nProvider, useI18n } from "@/app/providers";
import { themeStyle } from "@/shared/api/brand-theme";
import { menuFromDocument } from "@/shared/api/menu-document";
import { PageSections, sectionsOf } from "@/widgets/page-sections";
import { navLinks, SiteHeader } from "@/widgets/site-header";
import { PublishedSiteFooter } from "@/widgets/site-footer";
import { acceptToCanvas, canvasLinkTarget } from "./canvas-messages";

const COPY = {
  en: { waiting: "This page shows your site while you edit it in the builder.", notServed: "This page is not on your site right now." },
  ar: { waiting: "تعرض هذه الصفحة موقعك أثناء تعديله في أداة البناء.", notServed: "هذه الصفحة غير ظاهرة على موقعك الآن." },
} as const;

const ANNOUNCE_MS = 500;

function scrollToAnchor(anchor: string, tries = 10) {
  if (!anchor) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const target = document.getElementById(anchor);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  else if (tries > 0) window.setTimeout(() => scrollToAnchor(anchor, tries - 1), 150);
}

export function BuilderCanvas({ allowedOrigins }: { allowedOrigins: string[] }) {
  const [render, setRender] = useState<BuilderRenderMessage | null>(null);
  const parentOrigin = useRef<string | null>(null);

  const send = useCallback((body: FromCanvasBody) => {
    if (parentOrigin.current) window.parent.postMessage(fromCanvas(body), parentOrigin.current);
  }, []);

  // Handshake: announce readiness (it carries no data, so "*" is safe) until a builder at an
  // allowed origin answers; from then on, talk to that origin only.
  useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (event: MessageEvent) => {
      const message = acceptToCanvas(event, allowedOrigins, window.parent);
      if (!message) return;
      parentOrigin.current = event.origin;
      if (message.type === "render") setRender(message);
      else scrollToAnchor(message.anchor);
    };
    window.addEventListener("message", onMessage);
    const announce = () => {
      if (!parentOrigin.current) window.parent.postMessage(fromCanvas({ type: "ready" }), "*");
    };
    announce();
    const timer = window.setInterval(announce, ANNOUNCE_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(timer);
    };
  }, [allowedOrigins]);

  // The document takes the site's language, direction and theme, as the root layout does for a published site.
  const shell = render?.shell ?? null;
  useEffect(() => {
    if (!shell) return;
    const html = document.documentElement;
    html.lang = shell.language;
    html.dir = shell.direction;
    const style = themeStyle(shell) as Record<string, string>;
    for (const [name, value] of Object.entries(style)) html.style.setProperty(name, value);
    return () => {
      for (const name of Object.keys(style)) html.style.removeProperty(name);
    };
  }, [shell]);

  // Another page starts from the top, as a real navigation would.
  const pageId = render?.page?.pageId ?? null;
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pageId]);

  // The section being edited comes into view when it changes.
  const highlight = render?.highlightSectionId ?? null;
  useEffect(() => {
    if (!highlight) return;
    document.querySelector(`[data-section-id="${CSS.escape(highlight)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlight]);

  // Links never navigate the frame; forms never submit.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (anchor) {
        event.preventDefault();
        const href = canvasLinkTarget(anchor.getAttribute("href") ?? "", window.location.origin);
        if (href) send({ type: "navigate", href });
        return;
      }
      if (target?.closest("button, input, select, textarea, label, [role='dialog']")) return;
      const section = target?.closest<HTMLElement>("[data-section-id]");
      if (section?.dataset.sectionId) send({ type: "select-section", sectionId: section.dataset.sectionId });
    };
    const onSubmit = (event: Event) => event.preventDefault();
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [send]);

  if (!render) {
    return <p className="mx-auto max-w-[480px] px-6 py-24 text-center text-[14px] text-[var(--octo-text-muted)]">{COPY.en.waiting}</p>;
  }

  const locale: Locale = (locales as readonly string[]).includes(render.shell.language) ? (render.shell.language as Locale) : defaultLocale;
  return (
    <StoreI18nProvider locale={locale}>
      <style>{`
        [data-section-id] { cursor: pointer; }
        [data-section-id]:hover { outline: 1px dashed rgba(13, 110, 253, 0.5); outline-offset: 4px; }
        ${highlight ? `[data-section-id="${CSS.escape(highlight)}"] { outline: 2px solid #0D6EFD; outline-offset: 4px; }` : ""}
      `}</style>
      <CanvasSite render={render} locale={locale} onLanguage={(language) => send({ type: "language", language })} />
    </StoreI18nProvider>
  );
}

function CanvasSite({ render, locale, onLanguage }: { render: BuilderRenderMessage; locale: Locale; onLanguage: (language: string) => void }) {
  const { t } = useI18n();
  const { shell, page } = render;
  const menus = useMemo(
    () => Object.fromEntries(Object.entries(render.menus).flatMap(([key, doc]) => (doc ? [[key, menuFromDocument(doc)] as const] : []))),
    [render.menus]
  );
  const copy = locale === "ar" ? COPY.ar : COPY.en;

  return (
    <>
      <SiteHeader
        locale={locale}
        logoUrl={shell.brand.logo?.url ?? null}
        brandName={shell.brand.displayName}
        nav={navLinks(shell, t("store.nav.home"))}
        languages={shell.languages.map((l) => l.code)}
        options={shell.navigation.options}
        currentPath={page?.path ?? "/"}
        onSwitchLanguage={onLanguage}
      />
      <main>
        {page ? (
          <PageSections sections={sectionsOf(page)} menus={menus} brandName={shell.brand.displayName} title={page.isHome ? undefined : page.title} />
        ) : (
          <div className="mx-auto max-w-[1200px] px-4 py-24 text-center text-[16px] text-[var(--octo-text-muted)]">
            {render.pageLoading ? "…" : copy.notServed}
          </div>
        )}
      </main>
      <PublishedSiteFooter
        site={{
          brandName: shell.brand.displayName,
          logoUrl: shell.brand.logo?.url ?? null,
          groups: shell.footer.groups,
          socialLinks: shell.footer.socialLinks,
          contact: shell.footer.contact,
        }}
      />
    </>
  );
}
```

`apps/customer/src/views/builder-canvas/index.ts`:

```ts
export { BuilderCanvas } from "./builder-canvas";
```

- [ ] **Step 7: Create the route `apps/customer/src/app/preview/builder/page.tsx`**

```tsx
import type { Metadata } from "next";
import { currentMerchantOrigins } from "@/shared/lib/merchant-origins";
import { BuilderCanvas } from "@/views/builder-canvas";

// Read per request: the allowed origins come from the server's environment.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

export default function BuilderPreviewPage() {
  return <BuilderCanvas allowedOrigins={currentMerchantOrigins()} />;
}
```

- [ ] **Step 8: Render a bare document for it in `apps/customer/src/app/layout.tsx`**

Add the imports:

```ts
import { headers } from "next/headers";
import { defaultLocale } from "@i18n/index";
import { BUILDER_CANVAS_HEADER } from "@/shared/lib/merchant-origins";
```

Add above `generateMetadata`:

```ts
/** The builder's canvas route (middleware marks its request): no published site is read for it. */
const isBuilderCanvas = () => headers().get(BUILDER_CANVAS_HEADER) === "1";
```

Make the first line of `generateMetadata`:

```ts
  if (isBuilderCanvas()) return { title: "Preview", robots: { index: false, follow: false } };
```

Make the first statements of `RootLayout` (before `const storefront = await getStorefront();`):

```tsx
  if (isBuilderCanvas()) {
    // The canvas sets lang, dir and the theme on <html> itself, from what the builder sends.
    return (
      <html lang="en" dir="ltr" className={FONT_CLASSES}>
        <body>
          <StoreI18nProvider locale={defaultLocale}>
            <OrderingSessionProvider>{children}</OrderingSessionProvider>
          </StoreI18nProvider>
        </body>
      </html>
    );
  }
```

and hoist the font class list so both branches use it: replace `const fonts = \`${inter.variable} …\`;` inside `RootLayout` with a module-level

```ts
const FONT_CLASSES = `${inter.variable} ${interAlias.variable} ${plexArabic.variable} ${cairo.variable} ${tajawal.variable} ${poppins.variable} ${playfair.variable}`;
```

and use `FONT_CLASSES` where `fonts` was used.

- [ ] **Step 9: Type check and run the tests**

Run: `cd apps/customer && npx tsc --noEmit -p . && npx vitest run`
Expected: tsc exits 0; all tests pass.

- [ ] **Step 10: Check the route by hand**

Run `npm run dev` in `apps/customer` (port 3000), then:

Run: `curl -sI http://ocean.localhost:3000/preview/builder`
Expected: `200`, with `content-security-policy: frame-ancestors 'self' http://localhost:5290 http://127.0.0.1:5290`, `cache-control: private, no-store`, `x-robots-tag: noindex, nofollow`.
Open `http://ocean.localhost:3000/preview/builder` in a browser. Expected: only the waiting line — no header, no footer, no site data.
Open `http://localhost:3000/` and any published site. Expected: unchanged.

- [ ] **Step 11: Commit**

```bash
git add apps/customer/src/views/builder-canvas apps/customer/src/app/preview apps/customer/src/app/layout.tsx apps/customer/src/features/session/switch-locale apps/customer/src/widgets
git commit -m "Add the storefront canvas route the builder's live preview drives"
```

---

### Task 5: Merchant — the draft as the public read (`draftPublicRead`)

`live-site.ts` already ports the backend's projector, but its output is shaped for the mirror. This task makes it produce the public read shapes. The mirror model (`LiveSite`) is then derived from those, so both previews come from one projection.

**Files:**
- Modify: `apps/merchant/src/pages/public-link/_shared/live-site.ts`
- Test: `apps/merchant/src/pages/public-link/_shared/live-site.test.ts` (add a `describe` block; the existing tests must keep passing untouched)

**Interfaces:**
- Consumes: `PublicSiteShell`, `PublicSitePage`, `PublicSiteSection`, `PublicSiteNavItem` (Task 1); the existing `LiveSiteInput`, `withEdit`, `mediaIdsOf`.
- Produces: `interface DraftPublicRead { shell: PublicSiteShell; page: PublicSitePage | null; pageLoading: boolean; pageIds: Readonly<Record<string, string>> }`, `draftPublicRead(input: LiveSiteInput): DraftPublicRead`, and `liveSiteFromRead(read: DraftPublicRead, fonts: readonly { code: string; displayName: string }[]): LiveSite`. `projectLiveSite(input)` keeps its signature and is now `liveSiteFromRead(draftPublicRead(input), input.fonts)`. A bound section's `source.publicLinkKey` is its **content key** (the menu id); `menus` in Task 8 are keyed by it.

- [ ] **Step 1: Write the failing tests**

Append to `live-site.test.ts` (it already defines `catalogues`, `overview`, `section`, `page`, `home`, `server`, `input`). Change its import to `import { draftPublicRead, menuFromDocument, projectLiveSite, type LiveSiteInput } from "./live-site";`, then add:

```ts
describe("draftPublicRead", () => {
  it("builds the shell the storefront reads: language, direction, theme, brand, pages", () => {
    const { shell } = draftPublicRead(input());
    expect(shell.language).toBe("ar");
    expect(shell.direction).toBe("rtl");
    expect(shell.languages).toEqual([
      { code: "ar", direction: "rtl" },
      { code: "en", direction: "ltr" },
    ]);
    expect(shell.theme.colors["core.primary"]).toBe(EMPTY_SITE_DRAFT.brand.colors.primary);
    expect(shell.theme.colors["text.body"]).toBe("#334155");
    expect(shell.brand.displayName).toBe("أوشن");
    expect(shell.pages.map((p) => [p.path, p.title, p.isHome])).toEqual([
      ["/", "الرئيسية", true],
      ["/about", "من نحن", false],
    ]);
    expect(shell.host).toBe("ocean.octopus.app");
  });

  it("keeps the navigation as a tree with the storefront's kinds", () => {
    const items = [
      { label: { ar: "روابط" }, target: null, showInHeader: true, showInDrawer: true, children: [{ target: { kind: "page", pageId: "about" }, showInHeader: true, showInDrawer: false }] },
    ];
    const options = { stickyHeader: true, showActivePageIndicator: false, showIcons: false, openLinksInSameTab: false };
    const { shell } = draftPublicRead(input({ server: server({ navigation: { items, options, versions: { siteVersion: 3, pageVersion: null, pageVersions: null }, warnings: [] } }) }));
    expect(shell.navigation.options).toEqual(options);
    expect(shell.navigation.items).toEqual([
      {
        label: "روابط",
        iconKey: null,
        href: null,
        kind: "Group",
        openInNewTab: false,
        showInHeader: true,
        showInDrawer: true,
        children: [{ label: "", iconKey: null, href: "/about", kind: "Page", openInNewTab: false, showInHeader: true, showInDrawer: false, children: [] }],
      },
    ]);
  });

  it("gives each section its resolved variant, devices and bound content (by content key)", () => {
    const withMenu = page("home", [
      section({ sectionId: "hero", type: "hero", hiddenOn: ["mobile"] }),
      section({ sectionId: "m", type: "menu", source: { sourceKey: "menu", contentKey: "menu-1" }, sourceSettings: { layout: "grid" } }),
    ]);
    const themed = { ...catalogues, themes: [{ ...catalogues.themes[0], sectionVariants: { hero: "split" } }] };
    const { page: read, pageIds } = draftPublicRead(input({ server: server({ pages: { home: withMenu }, catalogues: themed }) }));
    expect(read?.sections.map((s) => [s.sectionId, s.styleVariant, s.hiddenOn, s.source?.publicLinkKey ?? null])).toEqual([
      ["hero", "split", ["mobile"], null],
      ["m", null, [], "menu-1"],
    ]);
    expect(read?.sections[1].source?.settings).toEqual({ layout: "grid" });
    expect(pageIds["/"]).toBe("home");
  });

  it("drops a blob: logo, which only the builder's own origin can read", () => {
    const draft = { ...EMPTY_SITE_DRAFT, brand: { ...EMPTY_SITE_DRAFT.brand, logoDataUrl: "blob:http://localhost:5290/1234" } };
    expect(draftPublicRead(input({ draft })).shell.brand.logo).toBeNull();
    const kept = { ...EMPTY_SITE_DRAFT, brand: { ...EMPTY_SITE_DRAFT.brand, logoDataUrl: "https://cdn/logo.png" } };
    expect(draftPublicRead(input({ draft: kept })).shell.brand.logo).toEqual({ url: "https://cdn/logo.png" });
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd apps/merchant && npx vitest run src/pages/public-link/_shared/live-site.test.ts`
Expected: FAIL. `draftPublicRead is not a function`.

- [ ] **Step 3: Implement `draftPublicRead` and `liveSiteFromRead`**

In `live-site.ts`:

1. Add to the type import from `@octopus/api-client`: `PublicSitePage`, `PublicSiteSection`, `PublicSiteShell`, `PublicSiteNavItem`.
2. Replace the local `navItem` function with one that returns the storefront's nav item:

```ts
function navItem(item: NavItemDto, ctx: Context, options: NavigationOptionsDto): PublicSiteNavItem | null {
  const children = (item.children ?? []).map((child) => navItem(child, ctx, options)).filter((c): c is PublicSiteNavItem => c !== null);
  const label = textOf(item.label, ctx.lang, ctx.fallback) ?? "";
  const group = (): PublicSiteNavItem | null =>
    children.length === 0
      ? null
      : { label, iconKey: item.icon ?? null, href: null, kind: "Group", openInNewTab: false, showInHeader: item.showInHeader, showInDrawer: item.showInDrawer, children };
  if (!item.target) return group();
  const link = resolveLink(item.target, ctx);
  if (!link) return group();
  // NavigationOptions.OpensInNewTab: an outside link asked to, and the site does not keep links in the same tab.
  const newTab = String(item.target.kind).toLowerCase() === "external" && item.target.openInNewTab === true && !options.openLinksInSameTab;
  return { label, iconKey: item.icon ?? null, href: link.href, kind: link.kind, openInNewTab: newTab, showInHeader: item.showInHeader, showInDrawer: item.showInDrawer, children };
}
```

3. Add below `fontCode`:

```ts
/** A URL another origin can load: a blob: URL belongs to the builder's own document. */
const portableUrl = (url: string | null | undefined): string | null => (url && !url.startsWith("blob:") ? url : null);

/** Unused by rendering; a constant, so equal drafts give equal messages. */
const DRAFT_INSTANT = "1970-01-01T00:00:00.000Z";

export interface DraftPublicRead {
  shell: PublicSiteShell;
  page: PublicSitePage | null;
  /** The page asked for is still loading. */
  pageLoading: boolean;
  /** Page id by public path (the shell's page index carries paths only). */
  pageIds: Readonly<Record<string, string>>;
}
```

4. Rename the body of the current `projectLiveSite` into `export function draftPublicRead(input: LiveSiteInput): DraftPublicRead`, keeping everything down to `servable`, the footer, the page lookup and the colours unchanged, and replacing its navigation, page construction and return with:

```ts
  const options = server.navigation?.options ?? DEFAULT_NAV_OPTIONS;
  const items = server.navigation?.items ?? [];
  const titleOf = (p: PageSummaryResponse) => textOf(p.title, lang, fallback) ?? "";
  const navigationItems: PublicSiteNavItem[] =
    items.length === 0
      ? servable.map((p) => ({ label: titleOf(p), iconKey: null, href: pathOf(p), kind: "Page", openInNewTab: false, showInHeader: true, showInDrawer: true, children: [] }))
      : items.map((item) => navItem(item, ctx, options)).filter((x): x is PublicSiteNavItem => x !== null);

  // Footer (PublicProjector.Footer).
  const footer = server.footer;
  const shellFooter: PublicSiteShell["footer"] = {
    groups: (footer?.groups ?? [])
      .map((group) => ({
        title: textOf(group.title, lang, fallback) ?? "",
        links: (group.links ?? []).flatMap((link) => {
          const resolved = resolveLink(link.target, ctx);
          return resolved
            ? [{ label: textOf(link.label, lang, fallback) ?? "", href: resolved.href, kind: resolved.kind, openInNewTab: String(link.target.kind).toLowerCase() === "external" && link.target.openInNewTab === true }]
            : [];
        }),
      }))
      .filter((group) => group.links.length > 0),
    socialLinks: (footer?.socialLinks ?? []).map((s) => ({ network: s.network, url: s.url })),
    contact: {
      address: textOf(footer?.contact?.address, lang, fallback),
      hours: textOf(footer?.contact?.hours, lang, fallback),
      phone: textOf(footer?.contact?.phone, lang, fallback),
    },
  };

  const theme = server.catalogues?.themes.find((t) => t.key === overview.themeKey);
  const variantOf = (s: SectionDraftResponse): string | null =>
    s.style?.variant ?? theme?.sectionVariants?.[s.type] ?? server.catalogues?.sectionTypes.find((t) => t.key === s.type)?.defaultVariant ?? null;
  const sourceOf = (s: Pick<SectionDraftResponse, "source" | "sourceSettings">) =>
    s.source ? { sourceKey: s.source.sourceKey, version: null, publicLinkKey: s.source.contentKey, settings: s.sourceSettings ?? null } : null;

  // The page (PublicProjector.Page): the one asked for, else home.
  const home = ordered.find((p) => p.isHome) ?? ordered[0];
  const wanted = (input.pageId && summaries.get(input.pageId)) || home;
  const loaded = wanted ? drafts[wanted.pageId] : undefined;
  const host = overview.address.hostname ?? "";
  let page: PublicSitePage | null = null;
  if (wanted && loaded && served(wanted)) {
    const title = textOf(loaded.title, lang, fallback) ?? "";
    const path = pathOf(wanted);
    const primary = loaded.sections.find((s) => s.primary);
    page = {
      pageId: wanted.pageId,
      path,
      isHome: wanted.isHome,
      kind: wanted.isHome ? "Home" : primary?.source ? "SourceBound" : "Standard",
      title,
      seo: { title, description: null, socialImageUrl: null, noIndex: true, canonicalUrl: host ? `https://${host}${path}` : path },
      layout: { header: loaded.layout?.header ?? null, hideFooter: loaded.layout?.hideFooter ?? false },
      source: primary ? sourceOf(primary) : null,
      sections: loaded.sections
        .filter((s) => s.enabled && (!s.source || available(s)))
        .map(
          (s): PublicSiteSection => ({
            sectionId: s.sectionId,
            type: s.type,
            anchor: s.anchor,
            styleVariant: variantOf(s),
            style: (s.style ?? {}) as Record<string, unknown>,
            fields: fields(s.fields, ctx),
            source: sourceOf(s),
            hiddenOn: s.hiddenOn ?? [],
          })
        ),
      lastModifiedUtc: DRAFT_INSTANT,
    };
  }

  const colors = resolvedColors(server, draft, server.catalogues);
  const codes = input.fonts.map((f) => f.code);
  const typography = Object.fromEntries(
    enabled.map((l) => [l, { heading: fontCode(server, draft, l, "heading", codes), body: fontCode(server, draft, l, "body", codes) }])
  );
  const name = draft.brand.businessName.trim() || textOf(overview.brand.displayName, lang, fallback) || "";
  const logo = portableUrl(draft.brand.logoDataUrl);

  const shell: PublicSiteShell = {
    host,
    canonicalBaseUrl: host ? `https://${host}` : "",
    language: lang,
    direction: directionOf(lang),
    defaultLanguage: fallback,
    languages: enabled.map((code) => ({ code, direction: directionOf(code) })),
    theme: { key: overview.themeKey, colors, typography, layout: {} },
    brand: { displayName: name, logo: logo ? { url: logo } : null, favicon: null },
    seo: { titleTemplate: overview.seo.titleTemplate, defaultTitle: name, defaultDescription: textOf(overview.seo.description, lang, fallback), socialImageUrl: null, noIndex: true },
    navigation: { options, items: navigationItems },
    footer: shellFooter,
    pages: servable.map((p) => ({ path: pathOf(p), title: titleOf(p), isHome: p.isHome, noIndex: false, lastModifiedUtc: DRAFT_INSTANT })),
    isPreview: true,
    preview: null,
  };

  return {
    shell,
    page,
    pageLoading: Boolean(wanted && !loaded),
    pageIds: Object.fromEntries(servable.map((p) => [pathOf(p), p.pageId])),
  };
}
```

5. Add the mirror model on top of it, and make `projectLiveSite` compose the two (this replaces the old `projectLiveSite` body entirely):

```ts
/** The mirror's model (live-site-canvas.tsx) from the public read — the storefront's own layout.tsx and brand-theme.ts steps. */
export function liveSiteFromRead(read: DraftPublicRead, fonts: readonly { code: string; displayName: string }[]): LiveSite {
  const { shell, page, pageLoading, pageIds } = read;
  const titleByPath = (href: string) => shell.pages.find((p) => p.path === href)?.title ?? "";
  const links: LiveNavLink[] = [];
  const walk = (items: PublicSiteNavItem[]) => {
    for (const item of items) {
      if (item.href) {
        const label = item.label || titleByPath(item.href);
        if (label || item.href === "/") links.push({ label, href: item.href, openInNewTab: item.openInNewTab, inHeader: item.showInHeader, inDrawer: item.showInDrawer });
      }
      walk(item.children);
    }
  };
  walk(shell.navigation.items);

  const cssVars: Record<string, string> = { ...STOREFRONT_DEFAULT_VARS };
  for (const [token, vars] of Object.entries(COLOR_VARS)) {
    const v = shell.theme.colors[token];
    if (v && HEX.test(v)) for (const name of vars) cssVars[name] = v;
  }
  const pair = shell.theme.typography[shell.language];
  const nameOf = (code: string | null | undefined) => (code ? (fonts.find((f) => f.code === code)?.displayName ?? null) : null);

  return {
    language: shell.language,
    direction: shell.direction,
    languages: shell.languages.map((l) => l.code),
    brandName: shell.brand.displayName,
    logoUrl: shell.brand.logo?.url ?? null,
    cssVars,
    fontName: nameOf(pair?.body),
    headingFontName: nameOf(pair?.heading),
    navigation: { options: shell.navigation.options, links },
    footer: {
      groups: shell.footer.groups.map((g) => ({ title: g.title, links: g.links.map((l) => ({ label: l.label, href: l.href, openInNewTab: l.openInNewTab })) })),
      socialLinks: shell.footer.socialLinks,
      contact: shell.footer.contact,
    },
    pages: shell.pages.map((p) => ({ pageId: pageIds[p.path], path: p.path, title: p.title, isHome: p.isHome })),
    page: page && {
      pageId: page.pageId,
      path: page.path,
      isHome: page.isHome,
      title: page.title,
      hideFooter: page.layout.hideFooter,
      sections: page.sections.map((s) => ({
        sectionId: s.sectionId,
        type: s.type,
        anchor: s.anchor,
        hiddenOn: (s.hiddenOn ?? []) as DeviceClass[],
        fields: s.fields,
        source: s.source ? { sourceKey: s.source.sourceKey, contentKey: s.source.publicLinkKey ?? "" } : null,
      })),
    },
    pageLoading,
  };
}

export function projectLiveSite(input: LiveSiteInput): LiveSite {
  return liveSiteFromRead(draftPublicRead(input), input.fonts);
}
```

Delete anything the old `projectLiveSite` body declared that is now unused (the old `links`/`walk`/`liveFooter`/`cssVars` blocks). Keep `withEdit`, `mediaIdsOf`, `STOREFRONT_DEFAULT_VARS`, `directionOf` and the `LiveSite`/`LiveSection`/`LiveNavLink`/`LiveFooter`/`LivePage` types exported as they are.

- [ ] **Step 4: Run the tests and the type check**

Run: `cd apps/merchant && npx vitest run src/pages/public-link && npx tsc --noEmit -p .`
Expected: all pass, including the 4 new tests and every existing `projectLiveSite` test (unchanged); tsc exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/merchant/src/pages/public-link/_shared/live-site.ts apps/merchant/src/pages/public-link/_shared/live-site.test.ts
git commit -m "Project the builder draft as the storefront's public read"
```

---

### Task 6: Merchant — menu documents the canvas can render

**Files:**
- Create: `apps/merchant/src/pages/public-link/_shared/preview-menu.ts`
- Modify: `apps/merchant/src/pages/public-link/_shared/live-site.ts` (remove the menu block: `slugify`, `menuMediaIds`, `menuFromDocument`; keep the `LiveMenu` type)
- Modify: `apps/merchant/src/pages/public-link/_shared/live-site.test.ts` (move the "reads the menu document" test out)
- Modify: `apps/merchant/src/pages/public-link/ui/live-preview-frame.tsx` (imports only, until Task 8)
- Test: `apps/merchant/src/pages/public-link/_shared/preview-menu.test.ts`

**Interfaces:**
- Consumes: `BuilderMenuDocument` (Task 1), `MenuPreviewResponse` (`@octopus/api-client`, the draft menu read `previewMenuDraft`), `LiveMenu` (live-site.ts).
- Produces: `menuMediaIds(doc: Pick<MenuPreviewResponse, "sections" | "items">): string[]`, `builderMenuDocument(doc: MenuPreviewResponse, urlOf: (assetId: string) => string | null): BuilderMenuDocument`, `menuFromDocument(doc: BuilderMenuDocument, placeholder: string): LiveMenu`.

- [ ] **Step 1: Write the failing test**

`apps/merchant/src/pages/public-link/_shared/preview-menu.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { MenuPreviewResponse } from "@octopus/api-client";
import { builderMenuDocument, menuFromDocument, menuMediaIds } from "./preview-menu";

const draft = {
  sections: [
    { name: "Main", description: null, image: { assetId: "a", kind: "Image" }, displayStyle: "grid", color: null, entries: [{ ref: "i1", kind: "Item" }, { ref: "o1", kind: "Offer" }] },
  ],
  items: {
    i1: {
      name: "Burger",
      description: null,
      image: { assetId: "b", kind: "Image" },
      video: null,
      tags: ["spicy"],
      price: { amount: 25, currency: "SAR" },
      facts: [],
      advisories: { labels: [], additionalInfo: null },
      isAvailable: true,
      modifierGroupRefs: ["g1"],
    },
  },
  modifierGroups: {
    g1: {
      promptLabel: "Size",
      helpText: null,
      selectionMode: "Single",
      minSelected: 1,
      maxSelected: 1,
      options: [{ name: "Large", effect: { kind: "Add", amount: { amount: 5, currency: "SAR" } }, isDefault: true, isAvailable: true }],
    },
  },
} as unknown as MenuPreviewResponse;

describe("preview menu documents", () => {
  it("lists every image the menu needs resolved", () => {
    expect(menuMediaIds(draft).sort()).toEqual(["a", "b"]);
  });

  it("turns the draft menu read into the public menu document, images as URLs", () => {
    const doc = builderMenuDocument(draft, (id) => (id === "a" ? "https://cdn/a.jpg" : null));
    expect(doc.sections[0]).toEqual({ name: "Main", description: null, image: "https://cdn/a.jpg", entries: draft.sections[0].entries });
    expect(doc.items.i1).toEqual({ name: "Burger", description: null, image: null, price: { amount: 25 }, isAvailable: true, modifierGroupRefs: ["g1"], tags: ["spicy"] });
    expect(doc.modifierGroups.g1).toEqual({ name: "Size", selectionMode: "Single", isRequired: true, options: [{ name: "Large", effect: { amount: { amount: 5 } }, isDefault: true }] });
  });

  it("reads the document the way the storefront does", () => {
    const menu = menuFromDocument(builderMenuDocument(draft, (id) => (id === "a" ? "https://cdn/a.jpg" : null)), "/all.png");
    expect(menu.categories).toEqual([{ id: "cat-1", slug: "main", name: "Main", imageUrl: "https://cdn/a.jpg" }]);
    expect(menu.items).toEqual([{ id: "cat-1-i1", categoryId: "cat-1", name: "Burger", description: "", price: 25, imageUrl: "/all.png" }]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/merchant && npx vitest run src/pages/public-link/_shared/preview-menu.test.ts`
Expected: FAIL. Cannot find module `./preview-menu`.

- [ ] **Step 3: Create `apps/merchant/src/pages/public-link/_shared/preview-menu.ts`**

```ts
// The menus a preview shows. The builder reads a bound menu's draft (`previewMenuDraft`, the same
// shape as the public menu read but with image ids), turns it into the public menu document with
// delivery URLs (what the storefront canvas renders), and — for the in-app mirror — into LiveMenu
// the way the storefront's public-api.ts `menuFromDocument` does.
import type { BuilderMenuDocument, MenuPreviewResponse } from "@octopus/api-client";
import type { LiveMenu } from "./live-site";

function slugify(name: string, index: number): string {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return ascii || `section-${index + 1}`;
}

/** Every media asset id a menu document references (the draft read gives ids, not URLs). */
export function menuMediaIds(doc: Pick<MenuPreviewResponse, "sections" | "items">): string[] {
  const ids = new Set<string>();
  for (const s of doc.sections) if (s.image?.assetId) ids.add(s.image.assetId);
  for (const i of Object.values(doc.items)) if (i.image?.assetId) ids.add(i.image.assetId);
  return [...ids];
}

export function builderMenuDocument(doc: MenuPreviewResponse, urlOf: (assetId: string) => string | null): BuilderMenuDocument {
  const image = (media: { assetId: string } | null) => (media ? urlOf(media.assetId) : null);
  return {
    sections: doc.sections.map((s) => ({ name: s.name, description: s.description, image: image(s.image), entries: s.entries })),
    items: Object.fromEntries(
      Object.entries(doc.items).map(([ref, i]) => [
        ref,
        {
          name: i.name,
          description: i.description,
          image: image(i.image),
          price: i.price ? { amount: i.price.amount } : null,
          isAvailable: i.isAvailable,
          modifierGroupRefs: i.modifierGroupRefs,
          tags: i.tags,
        },
      ])
    ),
    modifierGroups: Object.fromEntries(
      Object.entries(doc.modifierGroups).map(([ref, g]) => [
        ref,
        {
          name: g.promptLabel,
          selectionMode: g.selectionMode,
          isRequired: g.minSelected > 0,
          options: g.options.map((o) => ({ name: o.name, effect: { amount: o.effect.amount ? { amount: o.effect.amount.amount } : null }, isDefault: o.isDefault })),
        },
      ])
    ),
  };
}

/** The document as the storefront reads it (public-api.ts menuFromDocument); `placeholder` is its stock photograph. */
export function menuFromDocument(doc: BuilderMenuDocument, placeholder: string): LiveMenu {
  const categories: LiveMenu["categories"] = [];
  const items: LiveMenu["items"] = [];
  doc.sections.forEach((section, index) => {
    const category = { id: `cat-${index + 1}`, slug: slugify(section.name, index), name: section.name, imageUrl: section.image ?? placeholder };
    categories.push(category);
    for (const entry of section.entries) {
      if (entry.kind !== "Item") continue;
      const item = doc.items[entry.ref];
      if (!item) continue;
      items.push({
        id: `${category.id}-${entry.ref}`,
        categoryId: category.id,
        name: item.name,
        description: item.description ?? "",
        price: item.price?.amount ?? 0,
        imageUrl: item.image ?? placeholder,
      });
    }
  });
  return { categories, items };
}
```

- [ ] **Step 4: Remove the old copies**

In `live-site.ts`, delete `slugify`, `menuMediaIds` and `menuFromDocument` (the block after the `// ---- the menu a Menu section shows` comment), and the now-unused `MenuPreviewResponse` type import. Keep `export interface LiveMenu`.

In `live-site.test.ts`, delete the `it("reads the menu document the way the storefront does", …)` test, and remove `menuFromDocument` from its import.

In `ui/live-preview-frame.tsx`, keep it compiling until Task 8 replaces it. Change the import to `import { mediaIdsOf, projectLiveSite, type LiveMenu } from "../_shared/live-site";` plus `import { builderMenuDocument, menuFromDocument, menuMediaIds } from "../_shared/preview-menu";`. Inside `loadMenu`, change the return line to:

```ts
      return menuFromDocument(builderMenuDocument(doc, (id) => urls.get(id) ?? null), storefrontAsset("all.png"));
```

- [ ] **Step 5: Run the tests and the type check**

Run: `cd apps/merchant && npx vitest run src/pages/public-link && npx tsc --noEmit -p .`
Expected: all pass; tsc exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/pages/public-link/_shared/preview-menu.ts apps/merchant/src/pages/public-link/_shared/preview-menu.test.ts apps/merchant/src/pages/public-link/_shared/live-site.ts apps/merchant/src/pages/public-link/_shared/live-site.test.ts apps/merchant/src/pages/public-link/ui/live-preview-frame.tsx
git commit -m "Build the public menu documents the storefront canvas renders"
```

---

### Task 7: Merchant — the storefront iframe

**Files:**
- Create: `apps/merchant/src/pages/public-link/_shared/frame-bridge.ts`
- Create: `apps/merchant/src/pages/public-link/ui/storefront-frame.tsx`
- Test: `apps/merchant/src/pages/public-link/_shared/frame-bridge.test.ts`

**Interfaces:**
- Consumes: Task 1 (`BUILDER_PREVIEW_PATH`, `isFromCanvasMessage`, `toCanvas`, `BuilderRenderPayload`, `FromCanvasMessage`); `VIEWPORT_WIDTH`, `LiveDevice` (`ui/live-site-canvas.tsx`).
- Produces: `canvasUrl(origin): string`, `acceptFromCanvas(event, expectedOrigin, frameWindow): FromCanvasMessage | null`, `frameGeometry(viewportWidth, cardWidth, cardHeight, maxCardWidth): { drawnWidth: number; scale: number; frameHeight: number }`, `READY_TIMEOUT_MS` (8000), and `<StorefrontFrame origin device payload scrollRequest onNavigate onLanguage onSelectSection? onUnavailable height maxCardWidth title />` where `scrollRequest: { anchor: string; id: number } | null` (anchor `""` = top of the page).

- [ ] **Step 1: Write the failing test**

`apps/merchant/src/pages/public-link/_shared/frame-bridge.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { fromCanvas } from "@octopus/api-client";
import { acceptFromCanvas, canvasUrl, frameGeometry } from "./frame-bridge";
import { storefrontOrigin } from "./preview-url";

const frame = { name: "frame" };
const ready = fromCanvas({ type: "ready" });

describe("frame bridge", () => {
  it("points at the storefront's canvas route", () => {
    expect(canvasUrl("http://ocean.localhost:3000")).toBe("http://ocean.localhost:3000/preview/builder");
    expect(canvasUrl("https://ocean.octopus.app/")).toBe("https://ocean.octopus.app/preview/builder");
  });

  it("takes messages from its own frame at the storefront origin only", () => {
    expect(acceptFromCanvas({ origin: "https://ocean.octopus.app", source: frame, data: ready }, "https://ocean.octopus.app", frame)).toEqual(ready);
    expect(acceptFromCanvas({ origin: "https://evil.test", source: frame, data: ready }, "https://ocean.octopus.app", frame)).toBeNull();
    expect(acceptFromCanvas({ origin: "https://ocean.octopus.app", source: { name: "other" }, data: ready }, "https://ocean.octopus.app", frame)).toBeNull();
    expect(acceptFromCanvas({ origin: "https://ocean.octopus.app", source: frame, data: { ...ready, protocol: 2 } }, "https://ocean.octopus.app", frame)).toBeNull();
  });

  it("lays the page out at the device width and scales it into the card", () => {
    expect(frameGeometry(1280, 640, 600, Infinity)).toEqual({ drawnWidth: 640, scale: 0.5, frameHeight: 1200 });
    expect(frameGeometry(390, 640, 600, 300)).toEqual({ drawnWidth: 300, scale: 300 / 390, frameHeight: 780 });
    expect(frameGeometry(1280, 0, 600, Infinity)).toEqual({ drawnWidth: 0, scale: 0, frameHeight: 0 });
  });

  it("has no storefront to frame outside development before an address is claimed", () => {
    expect(storefrontOrigin({ host: null, slug: "", currentHostname: "app.octopus.app" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/merchant && npx vitest run src/pages/public-link/_shared/frame-bridge.test.ts`
Expected: FAIL. Cannot find module `./frame-bridge`.

- [ ] **Step 3: Create `apps/merchant/src/pages/public-link/_shared/frame-bridge.ts`**

```ts
// Pure helpers of the builder's storefront iframe (ui/storefront-frame.tsx): where it points, which
// messages to trust, and how the page is scaled into the card.
import { BUILDER_PREVIEW_PATH, isFromCanvasMessage, type FromCanvasMessage } from "@octopus/api-client";

/** Past this without a `ready`, the storefront is taken as unreachable and the mirror is shown. */
export const READY_TIMEOUT_MS = 8000;

export const canvasUrl = (origin: string): string => `${origin.replace(/\/+$/, "")}${BUILDER_PREVIEW_PATH}`;

/** The message, when it comes from our own frame's window at the storefront origin and is well formed; else null. */
export function acceptFromCanvas(
  event: { origin: string; source: unknown; data: unknown },
  expectedOrigin: string,
  frameWindow: unknown
): FromCanvasMessage | null {
  if (!frameWindow || event.source !== frameWindow || event.origin !== expectedOrigin) return null;
  return isFromCanvasMessage(event.data) ? event.data : null;
}

/**
 * The frame is `viewportWidth` CSS px wide (the device's real width) and scaled to `drawnWidth`
 * (the card, capped for phones and tablets); it is made tall enough to fill the card once scaled.
 */
export function frameGeometry(viewportWidth: number, cardWidth: number, cardHeight: number, maxCardWidth: number) {
  const drawnWidth = Math.min(cardWidth, maxCardWidth);
  const scale = viewportWidth > 0 && drawnWidth > 0 ? drawnWidth / viewportWidth : 0;
  return { drawnWidth, scale, frameHeight: scale > 0 ? Math.round(cardHeight / scale) : 0 };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/merchant && npx vitest run src/pages/public-link/_shared/frame-bridge.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Create `apps/merchant/src/pages/public-link/ui/storefront-frame.tsx`**

```tsx
// The customer storefront itself, framed: its /preview/builder canvas, laid out at the device's real
// width and scaled into the card. Every change of `payload` is posted to it (at most once per
// animation frame), and it is re-posted whenever the canvas says it is ready (a storefront reload
// recovers on its own). No `ready` within READY_TIMEOUT_MS -> `onUnavailable`, and the host shows
// its mirror instead.
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toCanvas, type BuilderRenderPayload } from "@octopus/api-client";
import { acceptFromCanvas, canvasUrl, frameGeometry, READY_TIMEOUT_MS } from "../_shared/frame-bridge";
import { VIEWPORT_WIDTH, type LiveDevice } from "./live-site-canvas";

export interface StorefrontFrameProps {
  origin: string;
  device: LiveDevice;
  payload: BuilderRenderPayload;
  /** Scroll the canvas to an anchor ("" = top) each time `id` changes. */
  scrollRequest: { anchor: string; id: number } | null;
  onNavigate: (href: string) => void;
  onLanguage: (language: string) => void;
  onSelectSection?: (sectionId: string) => void;
  onUnavailable: () => void;
  height: number | string;
  maxCardWidth: number;
  title: string;
}

export function StorefrontFrame({ origin, device, payload, scrollRequest, height, maxCardWidth, title, ...handlers }: StorefrontFrameProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [readyCount, setReadyCount] = useState(0);
  // The latest callbacks, so the message listener is attached once per origin.
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => setSize({ width: box.clientWidth, height: box.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let ready = false;
    setReadyCount(0);
    const onMessage = (event: MessageEvent) => {
      const message = acceptFromCanvas(event, origin, frameRef.current?.contentWindow);
      if (!message) return;
      switch (message.type) {
        case "ready":
          ready = true;
          setReadyCount((n) => n + 1);
          break;
        case "navigate":
          latest.current.onNavigate(message.href);
          break;
        case "language":
          latest.current.onLanguage(message.language);
          break;
        case "select-section":
          latest.current.onSelectSection?.(message.sectionId);
          break;
      }
    };
    window.addEventListener("message", onMessage);
    const timer = window.setTimeout(() => {
      if (!ready) latest.current.onUnavailable();
    }, READY_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
  }, [origin]);

  // Render: once per animation frame at most, and again on every `ready`.
  useEffect(() => {
    if (readyCount === 0) return;
    const id = requestAnimationFrame(() => frameRef.current?.contentWindow?.postMessage(toCanvas({ type: "render", ...payload }), origin));
    return () => cancelAnimationFrame(id);
  }, [readyCount, payload, origin]);

  const scrollId = scrollRequest?.id ?? 0;
  useEffect(() => {
    if (readyCount === 0 || !scrollRequest) return;
    const id = requestAnimationFrame(() => frameRef.current?.contentWindow?.postMessage(toCanvas({ type: "scroll-to", anchor: scrollRequest.anchor }), origin));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyCount > 0, scrollId, origin]);

  const viewport = VIEWPORT_WIDTH[device];
  const geo = frameGeometry(viewport, size.width, size.height, maxCardWidth);

  return (
    <div ref={boxRef} className="relative overflow-hidden rounded-xl border border-[var(--octo-border-card)] bg-[#f7f8fa]" style={{ height }}>
      {geo.scale > 0 && (
        <iframe
          ref={frameRef}
          src={canvasUrl(origin)}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-forms"
          className="absolute top-0 border-0 bg-white"
          style={{
            left: Math.max(0, (size.width - geo.drawnWidth) / 2),
            width: viewport,
            height: geo.frameHeight,
            transform: `scale(${geo.scale})`,
            transformOrigin: "top left",
          }}
        />
      )}
      {readyCount === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-[var(--octo-text-muted)]" aria-hidden>
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Type check**

Run: `cd apps/merchant && npx tsc --noEmit -p .`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/merchant/src/pages/public-link/_shared/frame-bridge.ts apps/merchant/src/pages/public-link/_shared/frame-bridge.test.ts apps/merchant/src/pages/public-link/ui/storefront-frame.tsx
git commit -m "Frame the storefront canvas in the builder"
```

---

### Task 8: Merchant — the live preview shows the real storefront

**Files:**
- Replace: `apps/merchant/src/pages/public-link/ui/live-preview-frame.tsx`
- Modify: `apps/merchant/src/pages/public-link/ui/site-preview.tsx`
- Modify: `apps/merchant/src/pages/public-link/steps/customize-step.tsx` (connected branch)
- Modify: `packages/i18n/src/locales/en/index.ts`, `packages/i18n/src/locales/ar/index.ts`

**Interfaces:**
- Consumes: Task 5 (`draftPublicRead`, `liveSiteFromRead`, `mediaIdsOf`), Task 6 (`builderMenuDocument`, `menuFromDocument`, `menuMediaIds`), Task 7 (`StorefrontFrame`), `storefrontOrigin` (`_shared/preview-url.ts`).
- Produces: `LivePreviewFrame` and `SitePreview` gain `selectedSectionId?: string | null` and `onSelectSection?: (sectionId: string) => void`.

- [ ] **Step 1: Add the two strings**

`packages/i18n/src/locales/en/index.ts`, after `"publicLink.live.previewNote": …`:

```ts
  "publicLink.live.fallback": "Your storefront could not be reached, so the builder's own preview is shown.",
  "publicLink.live.connected": "Your real site",
```

`packages/i18n/src/locales/ar/index.ts`, after `"publicLink.live.previewNote": …`:

```ts
  "publicLink.live.fallback": "تعذّر الوصول إلى موقعك، لذا تُعرض معاينة أداة البناء.",
  "publicLink.live.connected": "موقعك الحقيقي",
```

- [ ] **Step 2: Replace `apps/merchant/src/pages/public-link/ui/live-preview-frame.tsx`**

```tsx
// The connected builder's live preview. It shows the merchant's real storefront, framed
// (storefront-frame.tsx): the draft — server copy plus every unsaved edit — is projected into the
// storefront's own public read shapes (draftPublicRead) and posted to its canvas on every change. When
// the storefront cannot be reached (no address yet, server down, origin not allowed) it falls back
// to the in-app mirror (live-site-canvas.tsx), fed from the same projection.
//
// The card chooses the device, the language (any the site offers) and the page (the builder's
// selected page; clicking a link in the preview changes it). Clicking a section in the framed site
// selects it for editing, and the selected section is outlined there.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Globe, Monitor, Smartphone, Tablet } from "lucide-react";
import { previewMenuDraft, type BuilderMenuDocument } from "@octopus/api-client";
import type { Locale } from "@i18n/index";
import { Card, Segmented } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { I18nScope, useI18n } from "@/app/providers/i18n-provider";
import { ensureFontLoaded, type PublicLinkSync, type SiteAction, type SiteDraft } from "@/entities/site-draft";
import { mediaUrl } from "@/shared/api/media";
import { storefrontAsset } from "@/shared/lib/storefront-assets";
import { draftPublicRead, liveSiteFromRead, mediaIdsOf, type LiveMenu } from "../_shared/live-site";
import { builderMenuDocument, menuFromDocument, menuMediaIds } from "../_shared/preview-menu";
import { storefrontOrigin } from "../_shared/preview-url";
import { LiveSiteCanvas, VIEWPORT_WIDTH, type LiveDevice } from "./live-site-canvas";
import { StorefrontFrame } from "./storefront-frame";

const DEVICE_ICON: Readonly<Record<LiveDevice, typeof Monitor>> = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };
const DEVICE_LABEL_KEY: Readonly<Record<LiveDevice, string>> = {
  desktop: "publicLink.device.desktop",
  tablet: "publicLink.device.tablet",
  mobile: "publicLink.device.mobile",
};
/** How wide a phone or tablet is drawn inside the card, at most (CSS px of the card). */
const DEVICE_MAX_CARD_WIDTH: Readonly<Record<LiveDevice, number>> = { desktop: Infinity, tablet: 520, mobile: 300 };
const DEFAULT_DEVICES: readonly LiveDevice[] = ["desktop", "tablet", "mobile"];

// ---- menus ----------------------------------------------------------------------------------------

/** One read per menu and language for the whole session; a failed read shows no menu, as the storefront does. */
const menuJobs = new Map<string, Promise<BuilderMenuDocument | null>>();

function loadMenuDocument(businessId: string, menuId: string, lang: string): Promise<BuilderMenuDocument | null> {
  const key = `${businessId}|${menuId}|${lang}`;
  let job = menuJobs.get(key);
  if (!job) {
    job = (async () => {
      const doc = await previewMenuDraft(businessId, menuId, { lang });
      const urls = new Map<string, string>();
      await Promise.all(
        menuMediaIds(doc).map(async (id) => {
          const url = await mediaUrl(businessId, { assetId: id, kind: "Image" }, "menu").catch(() => null);
          if (url) urls.set(id, url);
        })
      );
      return builderMenuDocument(doc, (id) => urls.get(id) ?? null);
    })().catch(() => {
      menuJobs.delete(key);
      return null;
    });
    menuJobs.set(key, job);
  }
  return job;
}

// ---- the frame ------------------------------------------------------------------------------------

export interface LivePreviewFrameProps {
  sync: PublicLinkSync;
  draft: SiteDraft;
  dispatch: (action: SiteAction) => void;
  device: LiveDevice;
  onDevice: (device: LiveDevice) => void;
  devices?: readonly LiveDevice[];
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Height of the scrolling viewport (CSS px of the card, or any CSS length). */
  height?: number | string;
  /** Drop the card chrome (the site preview modal draws its own). */
  bare?: boolean;
  /** The section being edited: outlined and brought into view in the framed site. */
  selectedSectionId?: string | null;
  /** A section clicked in the framed site. */
  onSelectSection?: (sectionId: string) => void;
}

export function LivePreviewFrame({
  sync,
  draft,
  dispatch,
  device,
  onDevice,
  devices = DEFAULT_DEVICES,
  title,
  subtitle,
  actions,
  height = 560,
  bare = false,
  selectedSectionId = null,
  onSelectSection,
}: LivePreviewFrameProps) {
  const { t } = useI18n();
  const { activeBusinessId: businessId } = useAuth();
  const server = sync.server!;
  const [language, setLanguage] = useState(sync.editLanguage);
  const [docs, setDocs] = useState<Record<string, BuilderMenuDocument | null>>({});
  const viewportRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [scrollRequest, setScrollRequest] = useState<{ anchor: string; id: number } | null>(null);
  const [frameFailed, setFrameFailed] = useState(false);

  // A language the site stops offering falls back to the one being edited.
  const enabled = server.overview.settings.enabledLanguages;
  useEffect(() => {
    if (!enabled.includes(language)) setLanguage(sync.editLanguage);
  }, [enabled, language, sync.editLanguage]);

  const pageId = draft.selectedPageId && server.overview.pages.some((p) => p.pageId === draft.selectedPageId) ? draft.selectedPageId : null;

  const read = useMemo(
    () => draftPublicRead({ server, draft, edits: sync.previewEdits, pageId, language, mediaUrls: sync.mediaUrls, fonts: sync.fonts }),
    [server, draft, sync.previewEdits, pageId, language, sync.mediaUrls, sync.fonts]
  );
  const site = useMemo(() => liveSiteFromRead(read, sync.fonts), [read, sync.fonts]);

  // The storefront to frame: the claimed address (or the dev storefront); none -> the mirror.
  const origin = useMemo(
    () =>
      storefrontOrigin({
        host: server.overview.address.hostname,
        slug: server.overview.address.slug ?? draft.slug,
        currentHostname: typeof window === "undefined" ? "" : window.location.hostname,
      }),
    [server.overview.address.hostname, server.overview.address.slug, draft.slug]
  );
  useEffect(() => setFrameFailed(false), [origin]);
  const framed = Boolean(origin) && !frameFailed;

  // The page shown has to be loaded (only Home is read up front) — asked for once.
  const wantedId = pageId ?? server.overview.pages.find((p) => p.isHome)?.pageId ?? null;
  const { loadPage, siteMediaUrl } = sync;
  const asked = useRef(new Set<string>());
  useEffect(() => {
    if (!wantedId || server.pages[wantedId] || asked.current.has(`page:${wantedId}`)) return;
    asked.current.add(`page:${wantedId}`);
    void loadPage(wantedId).catch(() => asked.current.delete(`page:${wantedId}`));
  }, [wantedId, server.pages, loadPage]);

  // Media on the shown page (saved or still being edited) resolves to delivery URLs, once per asset.
  useEffect(() => {
    const page = wantedId ? server.pages[wantedId] : undefined;
    if (!page) return;
    const ids = new Set<string>();
    for (const s of page.sections) {
      mediaIdsOf(s.fields, ids);
      mediaIdsOf(sync.previewEdits[s.sectionId]?.fields, ids);
    }
    for (const id of ids) {
      if (sync.mediaUrls[id] || asked.current.has(`media:${id}`)) continue;
      asked.current.add(`media:${id}`);
      void siteMediaUrl(id);
    }
  }, [wantedId, server.pages, sync.previewEdits, sync.mediaUrls, siteMediaUrl]);

  // The menus the shown page binds (by content key = publicLinkKey), kept per language.
  const menuKey = [...new Set((read.page?.sections ?? []).filter((s) => s.source?.sourceKey === "menu" && s.source.publicLinkKey).map((s) => s.source!.publicLinkKey!))].join(",");
  useEffect(() => {
    if (!businessId || !menuKey) return;
    let cancelled = false;
    for (const id of menuKey.split(",")) {
      void loadMenuDocument(businessId, id, read.shell.language).then((doc) => {
        if (!cancelled) setDocs((prev) => ({ ...prev, [`${read.shell.language}|${id}`]: doc }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [businessId, menuKey, read.shell.language]);
  const shownDocs = useMemo(() => {
    const out: Record<string, BuilderMenuDocument | null> = {};
    const prefix = `${read.shell.language}|`;
    for (const [key, doc] of Object.entries(docs)) if (key.startsWith(prefix)) out[key.slice(prefix.length)] = doc;
    return out;
  }, [docs, read.shell.language]);
  const shownMenus = useMemo(() => {
    const out: Record<string, LiveMenu | null> = {};
    for (const [key, doc] of Object.entries(shownDocs)) out[key] = doc ? menuFromDocument(doc, storefrontAsset("all.png")) : null;
    return out;
  }, [shownDocs]);

  const payload = useMemo(
    () => ({ shell: read.shell, page: read.page, pageLoading: read.pageLoading, menus: shownDocs, highlightSectionId: selectedSectionId }),
    [read, shownDocs, selectedSectionId]
  );

  // The mirror's faces (the framed storefront loads its own).
  useEffect(() => {
    if (framed) return;
    if (site.fontName) ensureFontLoaded(site.fontName);
    if (site.headingFontName) ensureFontLoaded(site.headingFontName);
    if (site.direction === "rtl") ensureFontLoaded("IBM Plex Sans Arabic");
  }, [framed, site.fontName, site.headingFontName, site.direction]);

  // Mirror scale: the card's width against the device's viewport.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setCardWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [framed]);
  const drawnWidth = Math.min(cardWidth, DEVICE_MAX_CARD_WIDTH[device]);
  const zoom = drawnWidth > 0 ? drawnWidth / VIEWPORT_WIDTH[device] : 0;

  // Mirror: a device or page switch starts from the top; an anchor link scrolls to its section.
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0 });
  }, [device, site.page?.pageId]);
  useEffect(() => {
    if (!pendingHash || !site.page) return;
    const target = viewportRef.current?.querySelector<HTMLElement>(`[id="${CSS.escape(pendingHash)}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingHash(null);
    }
  }, [pendingHash, site.page, shownMenus]);

  /** A link clicked in the preview: open that page of the site (and its anchor); anything else is ignored. */
  function navigate(href: string) {
    const [path, hash] = href.split("#");
    const target = site.pages.find((p) => p.path === (path || site.page?.path || "/"));
    if (!target) return;
    if (target.pageId !== site.page?.pageId) dispatch({ type: "selectPage", pageId: target.pageId });
    if (hash) {
      setPendingHash(hash);
      setScrollRequest({ anchor: hash, id: Date.now() });
    } else if (target.pageId === site.page?.pageId) {
      viewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      setScrollRequest({ anchor: "", id: Date.now() });
    }
  }

  const scopeLocale: Locale = site.language === "ar" ? "ar" : "en";

  const mirror = (
    <div ref={viewportRef} className="octo-scroll relative overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--octo-border-card)] bg-[#f7f8fa]" style={{ height }}>
      {zoom > 0 && (
        <div className="mx-auto" style={{ width: VIEWPORT_WIDTH[device], zoom }}>
          <I18nScope locale={scopeLocale}>
            <LiveSiteCanvas key={`${device}-${site.language}`} site={site} device={device} menus={shownMenus} onNavigate={navigate} onLanguage={(code) => setLanguage(code)} />
          </I18nScope>
        </div>
      )}
    </div>
  );

  const canvas =
    framed && origin ? (
      <StorefrontFrame
        origin={origin}
        device={device}
        payload={payload}
        scrollRequest={scrollRequest}
        onNavigate={navigate}
        onLanguage={(code) => setLanguage(code)}
        onSelectSection={onSelectSection}
        onUnavailable={() => setFrameFailed(true)}
        height={height}
        maxCardWidth={DEVICE_MAX_CARD_WIDTH[device]}
        title={site.brandName || t("publicLink.livePreview")}
      />
    ) : (
      <div className="flex flex-col gap-2">
        {origin && frameFailed && <p className="text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.live.fallback")}</p>}
        {mirror}
      </div>
    );

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      {site.pages.length > 1 && (
        <label className="flex h-8 max-w-[180px] items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] pe-1 ps-2 text-[12px] text-[var(--octo-text-primary)]">
          <span className="sr-only">{t("publicLink.live.page")}</span>
          <select
            value={site.page?.pageId ?? wantedId ?? ""}
            onChange={(e) => dispatch({ type: "selectPage", pageId: e.target.value })}
            className="min-w-0 cursor-pointer truncate bg-transparent pe-1 text-[12px] font-medium focus:outline-none"
          >
            {site.pages.map((p) => (
              <option key={p.pageId} value={p.pageId}>
                {p.title || p.path}
              </option>
            ))}
          </select>
        </label>
      )}
      {devices.length > 1 && (
        <Segmented
          options={devices.map((id) => {
            const Icon = DEVICE_ICON[id];
            return {
              id,
              label: (
                <>
                  <Icon size={14} />
                  <span className="sr-only">{t(DEVICE_LABEL_KEY[id])}</span>
                </>
              ),
            };
          })}
          value={device}
          onChange={(id) => onDevice(id as LiveDevice)}
        />
      )}
      {actions}
      {enabled.length > 1 && (
        <label className="flex h-8 items-center gap-1 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] pe-1 ps-2 text-[12px] text-[var(--octo-text-primary)]">
          <Globe size={13} className="shrink-0 text-[var(--octo-text-muted)]" aria-hidden />
          <span className="sr-only">{t("publicLink.preview.language")}</span>
          <select value={site.language} onChange={(e) => setLanguage(e.target.value)} className="cursor-pointer bg-transparent pe-1 text-[12px] font-medium focus:outline-none">
            {enabled.map((code) => (
              <option key={code} value={code}>
                {code.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );

  if (bare) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">{controls}</div>
        {canvas}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--octo-text-primary)]">
            {title ?? t("publicLink.livePreview")}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#16a34a]/10 px-2 py-0.5 text-[10.5px] font-semibold text-[#16a34a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" aria-hidden />
              {framed ? t("publicLink.live.connected") : t("publicLink.live.badge")}
            </span>
          </p>
          {subtitle && <p className="text-[11.5px] text-[var(--octo-text-muted)]">{subtitle}</p>}
        </div>
        {controls}
      </div>
      <div className="mt-4">{canvas}</div>
    </Card>
  );
}
```

- [ ] **Step 3: Pass the selection through**

`apps/merchant/src/pages/public-link/ui/site-preview.tsx`: add to `SitePreviewProps`

```ts
  /** Live preview only: the section being edited, and a section clicked in the preview. */
  selectedSectionId?: string | null;
  onSelectSection?: (sectionId: string) => void;
```

Destructure both, and pass `selectedSectionId={selectedSectionId}` and `onSelectSection={onSelectSection}` to `<LivePreviewFrame … />`.

`apps/merchant/src/pages/public-link/steps/customize-step.tsx`: in the connected branch, change

```tsx
          <SitePreview draft={draft} dispatch={dispatch} sync={publicLinkSync} device={device} onDevice={setDevice} height={680} />
```

to

```tsx
          <SitePreview
            draft={draft}
            dispatch={dispatch}
            sync={publicLinkSync}
            device={device}
            onDevice={setDevice}
            height={680}
            selectedSectionId={serverSection}
            onSelectSection={setServerSection}
          />
```

- [ ] **Step 4: Run every check**

Run: `cd apps/merchant && npx tsc --noEmit -p . && npx vitest run`
Expected: tsc exits 0; all tests pass (the mirror tests in `live-site.test.ts` and `live-site-canvas.test.ts` included).
Run: `cd ../customer && npx tsc --noEmit -p . && npx vitest run`
Expected: tsc exits 0; all tests pass.

- [ ] **Step 5: Verify end to end by hand**

Start the backend (AdminApi :8081, PublicApi :8082), then `npm run dev` in `apps/customer` (:3000) and in `apps/merchant` (:5290). Sign in with a business that has a claimed address (for example `ocean`), and open the Public Link builder.

1. Brand step: the preview card's badge reads "Your real site". The browser dev tools show an iframe at `http://ocean.localhost:3000/preview/builder`.
2. Type in the business name, change the primary colour, and pick a body font and a titles font. Expected: each change shows in the frame within a frame or two, with no reload flash.
3. Customize step: select the hero and type in its title *without saving*. Expected: the frame follows every keystroke; Save keeps it; closing the inspector unsaved reverts it.
4. Click a section in the frame. Expected: the inspector opens that section; it is outlined in the frame and scrolled into view.
5. Toggle a section off and drag one to a new position. Expected: the frame follows immediately.
6. Click a header link to another page, and a footer `tel:` link. Expected: the first opens that page in the builder (page selector changes); the second does nothing; the frame never leaves `/preview/builder`.
7. Switch to mobile. Expected: the frame is 390 px wide scaled down, the header shows the hamburger, and a section hidden on mobile disappears.
8. Switch the language (card select, and the language pill inside the frame). Expected: content and direction switch.
9. Stop the storefront dev server and reload the builder. Expected: after about 8 s, the note "Your storefront could not be reached…" and the mirror preview.
10. From a different origin (e.g. a `file://` page with `<iframe src="http://ocean.localhost:3000/preview/builder">`), confirm that the browser refuses to frame it (CSP `frame-ancestors`).

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/pages/public-link/ui/live-preview-frame.tsx apps/merchant/src/pages/public-link/ui/site-preview.tsx apps/merchant/src/pages/public-link/steps/customize-step.tsx packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "Show the real storefront in the builder's live preview"
```
