"use strict";
const { R, F, err, T_OK, T_CREATED, T_ACCEPTED, T_NO_CONTENT, T_LIST } = require("./lib");

// Shapes mirror apps/merchant/src/entities/site-draft/site-draft.ts.

const PAGE_IDS = ["home", "menu", "reservations", "waitlist", "offers", "events", "loyalty", "about", "contact"];
const SECTION_IDS = ["hero", "reservations", "menu", "reservationsCta", "offers", "events", "testimonials", "instagram"];

const BRAND = {
  businessName: "Ocean View Restaurant",
  logoUrl: "https://cdn.octopus.sa/t/ocean-view/media/med-logo.png",
  colors: { primary: "#08589D", light: "#EEF4FF", accent: "#5B9BD5", dark: "#0B2545" },
  typography: { en: { titles: "inter", body: "inter" }, ar: { titles: "readex", body: "readex" } },
  faviconUrl: null,
  heroPatternUrl: null,
};

const HERO = {
  background: "image",
  imageUrl: "https://cdn.octopus.sa/t/ocean-view/media/med-hero.webp",
  heading: "Flavour made with care — and remembered long after.",
  subheading: "Seafood and grills on the Jeddah Corniche.",
  primaryCta: "Order Now",
  primaryTarget: "menu",
  secondaryCta: "View Menu",
  secondaryTarget: "menu",
};

const MENU_SETTINGS = {
  connectedMenuId: "mnu-lunch",
  homepageDisplay: ["highlighted", "categories"],
  primaryAction: "menuPage",
  orderingMode: "ordering",
  minOrder: "30",
  orderAhead: true,
  prepTime: "20",
  serviceAreas: "Al Shati, Al Zahra",
  taxDisplay: "inclusive",
};

const DRAFT = {
  version: 7,
  step: 5,
  theme: { id: "elegant", filter: "all" },
  brand: BRAND,
  pages: PAGE_IDS.map((id) => ({ id, inNav: id !== "events", onHome: id !== "events" })),
  navigation: { showInHeader: true, showInDrawer: true, stickyHeader: true, activeIndicator: true, showIcons: true, sameTab: true, hidden: [] },
  sections: SECTION_IDS.map((id) => ({ id, enabled: id !== "events" })),
  sectionSettings: {
    hero: HERO,
    menu: MENU_SETTINGS,
    offers: { displayStyle: "carousel", filterCategories: false, sortOrder: "newest", ctaButton: "Order Now", visibility: "all" },
    reservations: { enabled: true, homepageDisplay: "widget", primaryAction: "Book a Table", availabilityPreview: true, nextAvailableLabel: "Next: Today 8:00 PM", dateRange: "30", bookingWindow: "60", cutOff: "2", minParty: "1", maxParty: "12", tableHold: "15", autoConfirm: true, deposit: false },
    waitlist: { enabled: false, homepageDisplay: "button", primaryAction: "Join Waitlist", availabilityPreview: false, nextAvailableLabel: "", format: "party", queueMethod: "fifo", minParty: "1", maxParty: "8", showWaitTime: true, updateInterval: "5", notifyWhatsapp: true, notifySms: true, notifyEmail: true, autoRemove: "15" },
    generic: { testimonials: { layout: "carousel", source: "google", showRating: true } },
  },
  publish: { seo: { title: "Ocean View Restaurant — Jeddah Corniche", description: "Seafood and grills with a sea view.", socialImageUrl: null }, customDomain: { host: "", connected: false, ssl: false }, published: false },
  savedAt: "2026-09-10T09:12:04Z",
};

const D = "/api/v1/site/draft";

const publicLink = F(
  "04 · Public Link",
  "The Public Link Builder (`pages/public-link`) — the merchant's customer-facing storefront. **One site per business**, edited as a draft and published.\n\n| # | Step | Saves |\n|---|---|---|\n| 1 | Theme | `theme` |\n| 2 | Brand | `brand` — **shared with 03 · Menu → Theme** |\n| 3 | Pages | `pages` |\n| 4 | Navigation | `navigation` |\n| 5 | Customize | `sections` + `sectionSettings` |\n| 6 | Preview | rehearsal run + testers |\n| 7 | Publish | SEO, custom domain, go live |\n\n**Run order:** 4.1 → *Get draft*, then 4.2 → 4.8 in order.\n\n**Concurrency:** every write sends the draft `version` it last read. A stale version → `409 version_conflict`; the builder then reloads instead of overwriting another tab's work.\n\n**Shape source:** `apps/merchant/src/entities/site-draft/site-draft.ts`.",
  [
    F(
      "4.1 · Draft",
      "Screen: `pages/public-link` (the builder shell). The header shows *Autosaved just now*.",
      [
        R("Get site draft", "GET", D, {
          status: "planned",
          desc: "The whole draft. A business that has never opened the builder gets the default draft (9 pages, 8 sections, `events` off).",
          tests: T_OK,
          examples: [{ name: "Success", body: DRAFT }],
        }),
        R("Autosave whole draft", "PUT", D, {
          status: "planned",
          screen: "Builder autosave",
          desc: "The builder keeps the whole draft in memory and autosaves it. The per-step requests below exist for clients that save one part at a time; both must end in the same state.",
          rules: [
            "Body is the full draft with the `version` last read → `409 version_conflict` if it moved.",
            "Every per-step rule below applies. `publish.published` in the body is ignored — only 4.8 *Publish* publishes.",
            "Returns the new `version` and `savedAt`.",
          ],
          body: DRAFT,
          tests: T_OK,
          examples: [
            { name: "Saved", body: { version: 8, savedAt: "2026-09-10T09:14:40Z" } },
            err("Edited elsewhere", 409, "version_conflict", "This site was changed in another tab. Reload to continue.", { currentVersion: 8 }),
          ],
        }),
      ]
    ),

    F(
      "4.2 · Step 1 · Theme",
      "Screen: `pages/public-link/steps/theme-step.tsx`.",
      [
        R("List themes", "GET", "/api/v1/site/themes", {
          status: "planned",
          source: "entities/site-draft/theme-catalog.ts",
          desc: "Six themes and the filter chips above them. The Menu builder's presets (03 → 3.6) use this same catalogue.",
          tests: T_LIST,
          examples: [
            {
              name: "Success",
              body: {
                data: [
                  { id: "elegant", styleId: "elegant", filters: ["elegant", "luxury"], recommended: true },
                  { id: "modernGrid", styleId: "modern", filters: ["modern"] },
                  { id: "minimalMono", styleId: "modern", filters: ["modern", "minimal"] },
                  { id: "cafeWarm", styleId: "warm", filters: ["cafe"] },
                  { id: "casualBright", styleId: "warm", filters: ["casual"] },
                  { id: "luxeNoir", styleId: "elegant", filters: ["luxury"] },
                ],
                meta: { page: 1, pageSize: 6, total: 6, filters: ["all", "elegant", "modern", "minimal", "cafe", "casual", "luxury"] },
              },
            },
          ],
        }),
        R("Choose theme", "PATCH", `${D}/theme`, {
          status: "planned",
          rules: ["`id` must exist in *List themes*. `filter` is UI state and must be one of the filter ids."],
          body: { version: 7, id: "elegant", filter: "all" },
          tests: T_OK,
          examples: [{ name: "Saved", body: { version: 8, theme: { id: "elegant", filter: "all" } } }],
        }),
      ]
    ),

    F(
      "4.3 · Step 2 · Brand",
      "Screen: `pages/public-link/steps/brand-step.tsx`. **The same brand is edited from 03 · Menu → Theme** (logo, colours, fonts) — one record, two screens.",
      [
        R("Save brand", "PATCH", `${D}/brand`, {
          status: "planned",
          source: "entities/site-draft/site-draft.ts — brand",
          rules: [
            "`businessName` required.",
            "`logoUrl`, `faviconUrl`, `heroPatternUrl` are URLs from 03 → 3.8 *Upload image* (or `null`). Logo: PNG/SVG, 512×512 recommended.",
            "`colors.primary` · `light` · `accent` · `dark` are `#RRGGBB`.",
            "`typography.en` and `typography.ar` each set `titles` and `body` to a font id from *List fonts*. Arabic needs a font that has Arabic glyphs.",
          ],
          body: { version: 8, ...BRAND },
          tests: T_OK,
          examples: [
            { name: "Saved", body: { version: 9, brand: BRAND } },
            err("Latin-only font for Arabic", 422, "validation_failed", "Some fields are invalid.", { "typography.ar.titles": "font_has_no_arabic" }),
          ],
        }),
        R("List fonts", "GET", "/api/v1/site/fonts", {
          status: "planned",
          source: "src/shared/lib/brand-tokens.ts — FONTS",
          tests: T_LIST,
          examples: [{ name: "Success", body: { data: [{ id: "inter", label: "Inter", arabic: false }, { id: "readex", label: "Readex Pro", arabic: true }, { id: "georgia", label: "Georgia", arabic: false }], meta: { page: 1, pageSize: 3, total: 3 } } }],
        }),
      ]
    ),

    F(
      "4.4 · Step 3 · Pages",
      "Screen: `pages/public-link/steps/pages-step.tsx` — which pages exist, whether each shows in the navigation and on the homepage, and their order.",
      [
        R("Save pages", "PUT", `${D}/pages`, {
          status: "planned",
          source: "pages/public-link/_shared/page-catalog.ts",
          rules: [
            "Page ids: `home` `menu` `reservations` `waitlist` `offers` `events` `loyalty` `about` `contact`. Each at most once; array order is display order.",
            "`events` is not customizable today: it may be listed but stays `inNav: false, onHome: false`.",
            "A page whose module the business has not bought (e.g. `reservations` without `bookings`) → `422 module_not_enabled`.",
          ],
          body: { version: 9, pages: DRAFT.pages },
          tests: T_OK,
          examples: [{ name: "Saved", body: { version: 10, pages: DRAFT.pages } }, err("Module not enabled", 422, "module_not_enabled", "Reservations are not part of your plan.", { page: "reservations", module: "bookings" })],
        }),
      ]
    ),

    F(
      "4.5 · Step 4 · Navigation",
      "Screen: `pages/public-link/steps/navigation-step.tsx`.",
      [
        R("Save navigation", "PATCH", `${D}/navigation`, {
          status: "planned",
          rules: ["All flags are booleans.", "`hidden` lists page ids to leave out of the menu bar; each must be a page in the draft."],
          body: { version: 10, showInHeader: true, showInDrawer: true, stickyHeader: true, activeIndicator: true, showIcons: true, sameTab: true, hidden: ["events"] },
          tests: T_OK,
          examples: [{ name: "Saved", body: { version: 11, navigation: { ...DRAFT.navigation, hidden: ["events"] } } }],
        }),
      ]
    ),

    F(
      "4.6 · Step 5 · Customize sections",
      "Screen: `pages/public-link/steps/customize-step.tsx` — the homepage's sections (order + on/off) and each section's inspector.",
      [
        R("Save section order & visibility", "PUT", `${D}/sections`, {
          status: "planned",
          source: "pages/public-link/_shared/section-catalog.ts",
          rules: ["Section ids: `hero` `reservations` `menu` `reservationsCta` `offers` `events` `testimonials` `instagram` `waitlist`. Each at most once; order is display order."],
          body: { version: 11, sections: DRAFT.sections },
          tests: T_OK,
          examples: [{ name: "Saved", body: { version: 12, sections: DRAFT.sections } }],
        }),
        R("Hero", "PATCH", `${D}/sections/hero`, {
          status: "planned",
          screen: "customize/hero-inspector.tsx",
          rules: ["`background`: `image` · `video` · `slider`.", "`imageUrl` from 03 → 3.8 *Upload*.", "`primaryTarget` / `secondaryTarget` are page ids."],
          body: { version: 12, ...HERO },
          tests: T_OK,
          examples: [{ name: "Saved", body: { version: 13, hero: HERO } }],
        }),
        R("List menus to connect", "GET", "/api/v1/site/connectable-menus", {
          status: "planned",
          screen: "customize/menu-inspector.tsx → Connect a Saved Menu",
          desc: "The menus the storefront can show — the business's own menus from **03 · Menu**.",
          rules: ["Only menus that are **published and live on `publicLink`**. A held, archived or unpublished menu cannot be connected."],
          tests: T_LIST,
          examples: [{ name: "Success", body: { data: [{ id: "mnu-lunch", name: "Lunch Menu", itemCount: 86, updatedAt: "2026-09-08T10:30:00Z", thumbnailUrl: null }, { id: "mnu-ramadan", name: "Ramadan Menu", itemCount: 32, updatedAt: "2026-09-01T10:30:00Z", thumbnailUrl: null }], meta: { page: 1, pageSize: 25, total: 2 } } }],
        }),
        R("Menu & ordering", "PATCH", `${D}/sections/menu`, {
          status: "planned",
          screen: "customize/menu-inspector.tsx",
          rules: [
            "`connectedMenuId` must come from *List menus to connect*.",
            "`homepageDisplay`: one or more of `highlighted` `categories` `preview` `full`.",
            "`primaryAction`: `menuPage` · `menuDrawer` · `ordering`. `orderingMode`: `ordering` · `reservation` · `view`.",
            "`minOrder`, `prepTime` are numbers sent as strings (SAR, minutes).",
          ],
          body: { version: 13, ...MENU_SETTINGS },
          tests: T_OK,
          examples: [{ name: "Saved", body: { version: 14, menu: MENU_SETTINGS } }, err("Menu not live", 422, "menu_not_connectable", "This menu is not live on the public link.")],
        }),
        R("Offers", "PATCH", `${D}/sections/offers`, {
          status: "planned",
          screen: "customize/offers-inspector.tsx",
          body: { version: 14, ...DRAFT.sectionSettings.offers },
          tests: T_OK,
          examples: [{ name: "Saved", body: { version: 15, offers: DRAFT.sectionSettings.offers } }],
        }),
        R("Reservations", "PATCH", `${D}/sections/reservations`, {
          status: "planned",
          screen: "customize/reservations-inspector.tsx",
          rules: ["`homepageDisplay`: `widget` · `button`.", "`minParty` ≤ `maxParty`.", "Requires the `bookings` module."],
          body: { version: 15, ...DRAFT.sectionSettings.reservations },
          tests: T_OK,
          examples: [{ name: "Saved", body: { version: 16, reservations: DRAFT.sectionSettings.reservations } }],
        }),
        R("Waitlist", "PATCH", `${D}/sections/waitlist`, {
          status: "planned",
          screen: "customize/waitlist-inspector.tsx",
          rules: ["`queueMethod`: `fifo` · `priority`.", "`minParty` ≤ `maxParty`.", "At least one of `notifyWhatsapp` / `notifySms` / `notifyEmail` when `enabled`."],
          body: { version: 16, ...DRAFT.sectionSettings.waitlist },
          tests: T_OK,
          examples: [{ name: "Saved", body: { version: 17, waitlist: DRAFT.sectionSettings.waitlist } }],
        }),
        R("Other section (generic)", "PATCH", `${D}/sections/:sectionKey`, {
          status: "planned",
          screen: "customize/generic-inspector.tsx",
          desc: "Sections without their own inspector share one: `reservationsCta`, `events`, `testimonials`, `instagram`. Each field is a string or boolean defined per section in the section catalogue.",
          rules: ["`:sectionKey` must be one of those four.", "Unknown field ids for that section → `422 unknown_field`."],
          body: { version: 17, layout: "carousel", source: "google", showRating: true },
          tests: T_OK,
          examples: [{ name: "Saved", body: { version: 18, testimonials: { layout: "carousel", source: "google", showRating: true } } }],
        }),
      ]
    ),

    F(
      "4.7 · Step 6 · Preview & test",
      "Screen: `pages/public-link/steps/preview-step.tsx` — a rehearsal run through a customer's journey, and invited testers.",
      [
        R("Get preview link", "GET", "/api/v1/site/preview", {
          status: "planned",
          desc: "A private, expiring URL that renders the **draft** exactly as customers will see it.",
          tests: T_OK,
          examples: [{ name: "Success", body: { url: "https://preview.octopus.sa/s/ocean-view?t=pv_81cd", expiresAt: "2026-09-11T09:00:00Z" } }],
        }),
        R("Run rehearsal", "POST", "/api/v1/site/preview/simulations", {
          status: "planned",
          source: "pages/public-link/_shared/simulation.ts",
          desc: "Walks the draft site through a fixed customer journey and reports each step.",
          rules: ["Steps, in order: `landing` → `browseMenu` → `reservation` → `waitlist` → `order` → `checkout` → `confirmation`.", "Steps for modules the business has not enabled are reported `skipped`.", "Answers `202` with `simulationId`; poll the result."],
          body: { testMode: true },
          tests: T_ACCEPTED,
          saves: { simulationId: "id" },
          examples: [{ name: "Started", code: 202, body: { id: "sim-2201", status: "running", completed: 0, total: 7 } }],
        }),
        R("Get rehearsal result", "GET", "/api/v1/site/preview/simulations/:simulationId", {
          status: "planned",
          tests: T_OK,
          examples: [
            {
              name: "Done",
              body: {
                id: "sim-2201",
                status: "done",
                completed: 7,
                total: 7,
                results: [
                  { stepId: "landing", status: "success", seconds: 0.8 },
                  { stepId: "browseMenu", status: "success", seconds: 1.1 },
                  { stepId: "reservation", status: "success", seconds: 1.4 },
                  { stepId: "waitlist", status: "skipped", seconds: 0 },
                  { stepId: "order", status: "success", seconds: 1.6 },
                  { stepId: "checkout", status: "failed", seconds: 1.3, reason: "No payment gateway connected." },
                  { stepId: "confirmation", status: "success", seconds: 0.7 },
                ],
              },
            },
          ],
        }),
        R("List testers", "GET", "/api/v1/site/testers", {
          status: "planned",
          desc: "The owner is always included and always allowed.",
          tests: T_LIST,
          examples: [{ name: "Success", body: { data: [{ id: "tst-owner", email: "owner@oceanview.sa", role: "owner", canView: true, tested: true }, { id: "tst-12", email: "sara@oceanview.sa", role: "tester", canView: true, tested: false }], meta: { page: 1, pageSize: 25, total: 2 } } }],
        }),
        R("Invite tester", "POST", "/api/v1/site/testers", {
          status: "planned",
          rules: ["`email` valid and not already invited → `409 tester_exists`.", "Sends an email with the preview link."],
          body: { email: "sara@oceanview.sa", canView: true },
          tests: T_CREATED,
          saves: { testerId: "id" },
          examples: [{ name: "Invited", code: 201, body: { id: "tst-12", email: "sara@oceanview.sa", role: "tester", canView: true, tested: false } }],
        }),
        R("Remove tester", "DELETE", "/api/v1/site/testers/:testerId", {
          status: "planned",
          rules: ["The owner cannot be removed → `409 owner_protected`."],
          tests: T_NO_CONTENT,
          examples: [{ name: "Removed", code: 204 }],
        }),
      ]
    ),

    F(
      "4.8 · Step 7 · Publish",
      "Screen: `pages/public-link/steps/publish-step.tsx` — SEO, custom domain, publish, and the QR codes.",
      [
        R("Save SEO", "PATCH", `${D}/publish/seo`, {
          status: "planned",
          rules: ["`title` ≤ 60 characters, `description` ≤ 160.", "`socialImageUrl` from 3.8 *Upload*; 1200×630 recommended."],
          body: { version: 18, title: "Ocean View Restaurant — Jeddah Corniche", description: "Seafood and grills with a sea view.", socialImageUrl: null },
          tests: T_OK,
          examples: [{ name: "Saved", body: { version: 19, seo: DRAFT.publish.seo } }],
        }),
        R("Check domain availability", "GET", "/api/v1/site/domain/availability", {
          status: "planned",
          query: [{ key: "host", value: "menu.oceanview.sa", on: true, desc: "Custom host to check." }],
          tests: T_OK,
          examples: [{ name: "Available", body: { host: "menu.oceanview.sa", available: true } }],
        }),
        R("Connect custom domain", "PUT", "/api/v1/site/domain", {
          status: "planned",
          desc: "Returns the DNS record the merchant must add.",
          rules: ["`host` must be a valid hostname not used by another business → `409 domain_taken`."],
          body: { host: "menu.oceanview.sa" },
          tests: T_OK,
          examples: [{ name: "Pending DNS", body: { host: "menu.oceanview.sa", connected: false, ssl: false, dns: [{ type: "CNAME", name: "menu", value: "sites.octopus.sa" }] } }],
        }),
        R("Verify custom domain", "POST", "/api/v1/site/domain/verify", {
          status: "planned",
          rules: ["Checks DNS; on success issues the TLS certificate (`ssl: true`)."],
          body: {},
          tests: T_OK,
          examples: [{ name: "Connected", body: { host: "menu.oceanview.sa", connected: true, ssl: true } }, err("DNS not found yet", 422, "dns_not_found", "We could not find the DNS record yet. It can take up to an hour.")],
        }),
        R("Publish site", "POST", "/api/v1/site/publish", {
          status: "planned",
          desc: "Takes the draft live. The previously published site keeps serving until this succeeds.",
          rules: [
            "`brand.businessName` must be set, and a `menu` section that is enabled must have a `connectedMenuId` → otherwise `422 site_incomplete` with what is missing.",
            "Publishes the draft `version` sent; stale → `409 version_conflict`.",
          ],
          body: { version: 19 },
          tests: T_OK,
          examples: [
            { name: "Live", body: { published: true, url: "https://ocean-view.octopus.sa", customDomainUrl: "https://menu.oceanview.sa", publishedAt: "2026-09-10T10:00:00Z", version: 19 } },
            err("Incomplete", 422, "site_incomplete", "Finish setting up your site before publishing.", { missing: ["sectionSettings.menu.connectedMenuId"] }),
          ],
        }),
        R("Unpublish site", "POST", "/api/v1/site/unpublish", {
          status: "planned",
          body: {},
          tests: T_OK,
          examples: [{ name: "Offline", body: { published: false } }],
        }),
        R("Get QR code", "GET", "/api/v1/site/qr", {
          status: "planned",
          screen: "03 · Menu → Theme → Scan to see our menu · Table QR Preview",
          query: [
            { key: "target", value: "menu", on: true, desc: "`menu` (public menu) or `table`." },
            { key: "tableId", value: "tbl-12", desc: "Required when target=table." },
            { key: "format", value: "svg", desc: "`svg` or `png`." },
          ],
          tests: T_OK,
          examples: [{ name: "Success", body: { url: "https://ocean-view.octopus.sa/menu", qrUrl: "https://cdn.octopus.sa/t/ocean-view/qr/menu.svg" } }],
        }),
      ]
    ),
  ]
);

module.exports = { publicLink };
