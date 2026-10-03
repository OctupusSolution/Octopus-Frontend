"use strict";
const { R, F, err, PAGING, T_OK, T_CREATED, T_ACCEPTED, T_NO_CONTENT, T_LIST } = require("./lib");

// ---------------------------------------------------------------- samples
// Shapes mirror apps/merchant/src/entities/menu/menu.ts exactly, so the example
// responses are what the screens already render.

const ALL_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const SCHEDULE = {
  type: "all-day",
  start: "00:00",
  end: "23:59",
  days: ALL_WEEK,
  timezone: "Asia/Riyadh",
  branchIds: ["branch-jeddah-corniche"],
  fallbackMenuId: null,
  allowPreorderOutsideSchedule: false,
};

const THEME = {
  presetId: "elegant",
  navStyle: "top-bar",
  categoryStyle: "icon-text",
  cardStyle: "classic",
  itemDetails: "same-page",
  stickyAddToCart: true,
  showItemTags: true,
};

const OPTION = { id: "opt-medium", name: "Medium", subLabel: "160g beef", priceType: "add-amount", price: 8, isDefault: true, available: true };

const GROUP = {
  id: "grp-size",
  name: "Size",
  type: "single",
  customerLabel: "Choose your size",
  helpText: "Select your preferred size",
  min: 1,
  max: 1,
  required: true,
  showAsRadio: true,
  options: [
    { id: "opt-small", name: "120g beef", subLabel: "", priceType: "no-change", price: 0, isDefault: false, available: true },
    OPTION,
    { id: "opt-large", name: "Large", subLabel: "200g beef", priceType: "add-amount", price: 14, isDefault: false, available: true },
  ],
};

const ITEM = {
  id: "itm-classic-burger",
  name: "Classic Burger Combo",
  shortName: "Classic Burger",
  description: "Juicy grilled beef burger with lettuce, tomato, pickles and our special sauce.",
  sku: "BURGER-CLS-001",
  image: "https://cdn.octopus.sa/t/ocean-view/media/med-9a1.webp",
  video: null,
  tags: ["chef-recommended", "top-selling"],
  status: "active",
  availability: { available: true, delivery: true, takeaway: true, dineIn: true },
  schedule: { mode: "all-day" },
  modifierGroups: [GROUP],
  pricing: { price: 100, vatRate: 0.15 },
  nutrition: { calories: 520, protein: 38, carb: 22, fat: 28 },
  allergies: { allergens: ["gluten", "dairy", "eggs"], note: "Prepared in a kitchen that handles nuts." },
};

const OFFER = {
  id: "ofr-burger-combo",
  name: "Classic Burger Combo",
  slug: "Classic_Burger_Combo",
  image: "https://cdn.octopus.sa/t/ocean-view/media/med-7c2.webp",
  status: "active",
  badge: "Best Value",
  showSavingBadge: true,
  entries: [
    { itemId: "itm-classic-burger", qty: 1, price: 90 },
    { itemId: "itm-fries", qty: 1, price: 20 },
    { itemId: "itm-soft-drink", qty: 1, price: 20 },
  ],
  customerCanChange: false,
  pricing: { role: "fixed", offerPrice: 100, vatRate: 0.15, excludeFromPromotions: false },
  availability: { from: "2026-09-01", to: "2026-09-30", window: { days: ["sun", "thu"], start: "12:00", end: "16:00" } },
  channels: { dineIn: true, takeaway: true, delivery: true, kiosk: true, onlineOrdering: false, mobileApp: false },
};

const SECTION = {
  id: "sec-breakfast",
  kind: "items",
  name: "Breakfast",
  image: "https://cdn.octopus.sa/t/ocean-view/media/med-2b8.webp",
  description: "Served until 11:30 AM.",
  visibility: "visible",
  displayStyle: "list",
  color: null,
  entries: [ITEM],
};

const OFFERS_SECTION = { id: "offers", kind: "offers", name: "Offers", image: null, description: "", visibility: "visible", displayStyle: "list", color: null, entries: [OFFER] };

const MENU = {
  id: "mnu-lunch",
  name: "Lunch Menu",
  cover: null,
  status: "active",
  branchId: "branch-jeddah-corniche",
  sections: [SECTION, OFFERS_SECTION],
  theme: THEME,
  schedule: SCHEDULE,
  channels: { pos: "live", publicLink: "live", tableQr: "live" },
  updatedAt: "2026-05-12T10:30:00Z",
  publishedAt: "2026-05-12T09:15:00Z",
  version: 2,
};

const SUMMARY = {
  id: "mnu-lunch",
  name: "Lunch Menu",
  cover: null,
  status: "active",
  branchId: "branch-jeddah-corniche",
  sectionCount: 12,
  itemCount: 120,
  schedule: { type: "all-day" },
  channels: { pos: "live", publicLink: "live", tableQr: "live" },
  updatedAt: "2026-05-12T10:30:00Z",
};

const BASE = "/api/v1/menus/:menuId";

// ---------------------------------------------------------------- folder

const menu = F(
  "03 · Menu",
  "The menu module (`pages/menu`). A **menu** is the root entity: a restaurant owns several (All Day, Breakfast, Ramadan…), each with its own sections, items, offers, theme, schedule and channels, each published on its own.\n\n**Built as:** a library of menus, and a 4-step builder — **Sections → Items → Theme → Review & Publish**.\n\n**Run order:** 3.1 → *Create menu* saves `menuId`; 3.8 → *Upload image* saves `mediaUrl`; then 3.2 → 3.7 in order. Each *Add/Create* saves the id the next requests need.\n\n**Shape source:** `apps/merchant/src/entities/menu/menu.ts`.",
  [
    F(
      "3.1 · Menu library",
      "Screen: `pages/menu/library` — the card grid, its filters, the card's ⋮ actions and the Schedule dialog.",
      [
        R("List menus", "GET", "/api/v1/menus", {
          status: "planned",
          screen: "pages/menu/library/index.tsx",
          source: "entities/menu/library.ts — filterMenus",
          desc: "Card data for the library. Counts are **computed** from the menu, never stored.",
          rules: [
            "Archived menus are excluded unless `includeArchived=true`.",
            "`channel=pos|publicLink|tableQr` keeps only menus **live** on that channel.",
            "`sort=recent` newest `updatedAt` first · `name` A→Z · `status` in the order active, scheduled, pending, on-hold, expired, archived.",
            "`q` matches the menu name, case-insensitive.",
          ],
          query: [
            { key: "q", value: "", desc: "Search by menu name." },
            { key: "branchId", value: "{{branchId}}", desc: "The Areas filter." },
            { key: "channel", value: "all", desc: "`all` · `pos` · `publicLink` · `tableQr`" },
            { key: "sort", value: "recent", on: true, desc: "`recent` · `name` · `status`" },
            { key: "includeArchived", value: "false", desc: "Include archived menus." },
            ...PAGING,
          ],
          tests: T_LIST,
          examples: [
            {
              name: "Success",
              body: {
                data: [
                  SUMMARY,
                  { ...SUMMARY, id: "mnu-ramadan", name: "Ramadan Menu", status: "scheduled", channels: { pos: "scheduled", publicLink: "scheduled", tableQr: "scheduled" } },
                  { ...SUMMARY, id: "mnu-kids", name: "Kids Menu", status: "on-hold", channels: { pos: "on-hold", publicLink: "on-hold", tableQr: "off" } },
                ],
                meta: { page: 1, pageSize: 25, total: 9 },
              },
            },
          ],
        }),
        R("Create menu (from scratch)", "POST", "/api/v1/menus", {
          status: "planned",
          screen: "pages/menu/new → pages/menu/build (Create From Scratch)",
          source: "entities/menu/draft.ts — blankMenu",
          desc: "Creates an empty menu and opens the builder on it.",
          rules: [
            "`name` required (the builder's first field), `branchId` must be a branch of the tenant.",
            "Every new menu is created with **one built-in section, id `offers`, kind `offers`** — it cannot be deleted and always stays last.",
            "Starts `status: pending`, all three channels `pending`, `publishedAt: null`, `version: 1`.",
            "Default schedule: all day, every day, `Asia/Riyadh`, the menu's own branch. Default theme as in the example.",
          ],
          body: { name: "Lunch Menu", branchId: "{{branchId}}" },
          tests: T_CREATED,
          saves: { menuId: "id" },
          examples: [
            { name: "Created", code: 201, body: { ...MENU, status: "pending", sections: [{ ...OFFERS_SECTION, entries: [] }], channels: { pos: "pending", publicLink: "pending", tableQr: "pending" }, publishedAt: null, version: 1, updatedAt: "2026-09-10T09:00:00Z" } },
            err("Missing name", 422, "validation_failed", "Some fields are invalid.", { name: "required" }),
          ],
        }),
        R("Get a menu (full)", "GET", BASE, {
          status: "planned",
          screen: "pages/menu/build (opens on any step)",
          desc: "The whole menu — sections with their items and offers, theme, schedule, channels. The builder loads this once and edits it.",
          tests: T_OK,
          examples: [{ name: "Success", body: MENU }, err("Not found", 404, "menu_not_found", "This menu does not exist.")],
        }),
        R("Rename menu", "PATCH", BASE, {
          status: "planned",
          screen: "pages/menu/build/sections — Menu Name",
          rules: ["`name` cannot be blank."],
          body: { name: "Lunch Menu" },
          tests: T_OK,
          examples: [{ name: "Renamed", body: { ...MENU, name: "Lunch Menu" } }],
        }),
        R("Duplicate menu", "POST", `${BASE}/duplicate`, {
          status: "planned",
          screen: "library card ⋮ → Duplicate",
          source: "entities/menu/library.ts — duplicateMenu",
          rules: [
            "The copy is a separate document: new ids for the menu **and** every section, item, group, option and offer inside it.",
            "Name gets ` (Copy)` appended; `status: pending`; all channels `pending`; `publishedAt: null`; `version: 1`.",
          ],
          body: {},
          tests: T_CREATED,
          examples: [{ name: "Duplicated", code: 201, body: { ...MENU, id: "mnu-lunch-copy", name: "Lunch Menu (Copy)", status: "pending", channels: { pos: "pending", publicLink: "pending", tableQr: "pending" }, publishedAt: null, version: 1 } }],
        }),
        R("Hold / Resume / Archive", "POST", `${BASE}/status`, {
          status: "planned",
          screen: "library card ⋮ → Hold · Resume · Archived",
          source: "entities/menu/library.ts — setMenuStatus",
          desc: "Held menus keep their schedule and can be resumed; archived menus leave the default library view.",
          rules: [
            "`status` is `on-hold` (Hold), `active` (Resume) or `archived`.",
            "Status is **not** card-local: it sets all three channels too — `active` → every channel `live`, `on-hold` → every channel `on-hold`, `archived` → every channel `archived`.",
            "Resuming a menu that has errors (see 3.7 *Validate*) → `422 menu_has_errors`.",
          ],
          body: { status: "on-hold" },
          tests: T_OK,
          examples: [
            { name: "Held", body: { ...SUMMARY, status: "on-hold", channels: { pos: "on-hold", publicLink: "on-hold", tableQr: "on-hold" } } },
            err("Invalid status", 422, "validation_failed", "Some fields are invalid.", { status: "must_be_one_of:on-hold,active,archived" }),
          ],
        }),
        R("Schedule menu & channels", "PUT", `${BASE}/schedule`, {
          status: "planned",
          screen: "library card ⋮ → Schedule (dialog)",
          source: "pages/menu/library/schedule-modal.tsx",
          desc: "The Schedule dialog's four blocks: availability type, time window, channel availability, fallback.",
          rules: [
            "`schedule.type`: `all-day` · `breakfast` · `lunch` · `dinner` · `custom`. `start`/`end` are `HH:mm` in `timezone`.",
            "`days` non-empty; `branchIds` non-empty and all belong to the tenant.",
            "`fallbackMenuId` cannot be this menu and cannot be an archived menu (use *Fallback candidates*).",
            "`channels.*` may be `off` — switching one channel off leaves the menu active on the others. Otherwise a channel follows the menu's status.",
          ],
          body: {
            schedule: { ...SCHEDULE, type: "lunch", start: "12:00", end: "16:00", fallbackMenuId: "mnu-all-day", allowPreorderOutsideSchedule: true },
            channels: { pos: "live", publicLink: "live", tableQr: "off" },
          },
          tests: T_OK,
          examples: [
            { name: "Scheduled", body: { ...SUMMARY, schedule: { type: "lunch" }, channels: { pos: "live", publicLink: "live", tableQr: "off" } } },
            err("Falls back to itself", 422, "validation_failed", "Some fields are invalid.", { "schedule.fallbackMenuId": "cannot_be_self" }),
          ],
        }),
        R("Fallback candidates", "GET", `${BASE}/fallback-candidates`, {
          status: "planned",
          screen: "Schedule dialog → Fallback Menu dropdown",
          source: "entities/menu/library.ts — fallbackCandidates",
          rules: ["Every menu of the tenant except this one and except archived menus."],
          tests: T_LIST,
          examples: [{ name: "Success", body: { data: [{ id: "mnu-all-day", name: "All Day Menu" }, { id: "mnu-breakfast", name: "Breakfast Menu" }], meta: { page: 1, pageSize: 25, total: 2 } } }],
        }),
        R("Delete menu", "DELETE", BASE, {
          status: "planned",
          screen: "library card ⋮ → Delete (confirm dialog)",
          rules: ["A menu other menus use as their `fallbackMenuId` → `409 menu_is_fallback` with the ids that depend on it."],
          tests: T_NO_CONTENT,
          examples: [{ name: "Deleted", code: 204 }, err("Used as a fallback", 409, "menu_is_fallback", "Other menus fall back to this one.", { usedBy: ["mnu-lunch"] })],
        }),
      ]
    ),

    F(
      "3.2 · Step 1 · Sections",
      "Screen: `pages/menu/build/sections` — the section list, Section Setting panel, and Add/Edit Section dialog.",
      [
        R("List sections", "GET", `${BASE}/sections`, {
          status: "planned",
          desc: "In display order. The `offers` section is always last. `itemCount` is computed.",
          tests: T_LIST,
          examples: [{ name: "Success", body: { data: [{ ...SECTION, entries: undefined, itemCount: 24 }, { ...OFFERS_SECTION, entries: undefined, itemCount: 6 }], meta: { page: 1, pageSize: 25, total: 2 } } }],
        }),
        R("Add section", "POST", `${BASE}/sections`, {
          status: "planned",
          screen: "Add New Section dialog",
          source: "entities/menu/draft.ts — addSection",
          rules: [
            "`name` and `image` required (both starred in the dialog). `image` is a URL from 3.8 *Upload*.",
            "Always `kind: items`. There is exactly one offers section per menu and it is created with the menu — `kind: offers` → `422 offers_section_exists`.",
            "Inserted **before** the offers section, so offers stays last however many sections exist.",
          ],
          body: { name: "Breakfast", image: "{{mediaUrl}}" },
          tests: T_CREATED,
          saves: { sectionId: "id" },
          examples: [{ name: "Created", code: 201, body: { ...SECTION, entries: [] } }, err("Missing image", 422, "validation_failed", "Some fields are invalid.", { image: "required" })],
        }),
        R("Update section", "PATCH", `${BASE}/sections/:sectionId`, {
          status: "planned",
          screen: "Section Setting panel · Edit Section dialog · eye toggle",
          source: "entities/menu/draft.ts — updateSection",
          rules: [
            "`visibility`: `visible` · `hidden`.",
            "`displayStyle`: `list` · `carousel` · `grid`.",
            "`color`: `#RRGGBB` or `null`.",
          ],
          body: { name: "Breakfast", description: "Served until 11:30 AM.", visibility: "visible", displayStyle: "grid", color: "#D99400" },
          tests: T_OK,
          examples: [{ name: "Updated", body: { ...SECTION, entries: undefined, displayStyle: "grid", color: "#D99400" } }],
        }),
        R("Reorder sections", "PUT", `${BASE}/sections/order`, {
          status: "planned",
          screen: "Drag and drop in the section list",
          source: "entities/menu/draft.ts — moveSection",
          rules: [
            "`sectionIds` must contain **every** section id of the menu exactly once.",
            "`offers` must be the last id → otherwise `422 offers_must_be_last`.",
          ],
          body: { sectionIds: ["sec-mains", "sec-breakfast", "sec-desserts", "offers"] },
          tests: T_OK,
          examples: [
            { name: "Reordered", body: { sectionIds: ["sec-mains", "sec-breakfast", "sec-desserts", "offers"] } },
            err("Offers moved", 422, "offers_must_be_last", "The offers section always stays last."),
          ],
        }),
        R("Delete section", "DELETE", `${BASE}/sections/:sectionId`, {
          status: "planned",
          screen: "Section ⋮ → Delete (confirm names the item count)",
          source: "entities/menu/draft.ts — removeSection",
          rules: [
            "Deletes the section **and every item in it** — the confirm dialog warns with the count.",
            "Also removes those items from any offer that contained them.",
            "The `offers` section cannot be deleted → `409 offers_section_protected`.",
          ],
          tests: T_OK,
          examples: [
            { name: "Deleted", body: { deletedItemCount: 24 } },
            err("Built-in offers section", 409, "offers_section_protected", "The offers section cannot be deleted."),
          ],
        }),
      ]
    ),

    F(
      "3.3 · Step 2 · Items",
      "Screen: `pages/menu/build/items` — the entry list and the item editor's **General · Pricing · Nutrition · Allergies** tabs, plus the Availability and Schedule cards.",
      [
        R("List items in a section", "GET", `${BASE}/sections/:sectionId/items`, {
          status: "planned",
          screen: "Select Section → entry list",
          tests: T_LIST,
          examples: [{ name: "Success", body: { data: [ITEM], meta: { page: 1, pageSize: 25, total: 1 } } }],
        }),
        R("Create item", "POST", `${BASE}/sections/:sectionId/items`, {
          status: "planned",
          screen: "Add New Item",
          source: "entities/menu/menu.ts — Item",
          rules: [
            "Section must be `kind: items` — offers are created in 3.5 → `422 wrong_section_kind`.",
            "`name` and `shortName` required (`shortName` is what the POS prints). `image` is starred in the editor.",
            "`status`: `active` · `draft` · `unavailable`. `tags`: any of `chef-recommended` `top-selling` `most-ordered` `healthy-choice`.",
            "`pricing.price` ≥ 0 (a price of 0 is saved but blocks publishing). `pricing.vatRate` is a fraction — `0.15` for 15%.",
            "`nutrition.*` are numbers ≥ 0 or `null` for *not entered*. **Never** turn `null` into `0` — 0 claims the dish has no calories.",
            "`allergies.allergens`: any of `gluten` `dairy` `eggs` `nuts` `soy` `seafood`.",
            "`schedule` is `{ mode: \"all-day\" }` or `{ mode: \"custom\", start: \"HH:mm\", end: \"HH:mm\", days: [...] }` with `start` before `end` and at least one day.",
            "`id` is generated by the server; `sku` unique within the tenant when present.",
          ],
          body: { ...ITEM, id: undefined, modifierGroups: [] },
          tests: T_CREATED,
          saves: { itemId: "id" },
          examples: [
            { name: "Created", code: 201, body: { ...ITEM, modifierGroups: [] } },
            err("Invalid fields", 422, "validation_failed", "Some fields are invalid.", { shortName: "required", "schedule.days": "at_least_one" }),
            err("Duplicate SKU", 409, "sku_taken", "Another item already uses this SKU."),
          ],
        }),
        R("Get item", "GET", `${BASE}/items/:itemId`, {
          status: "planned",
          tests: T_OK,
          examples: [{ name: "Success", body: ITEM }],
        }),
        R("Update item", "PATCH", `${BASE}/items/:itemId`, {
          status: "planned",
          screen: "Every tab of the item editor",
          desc: "Partial update — send only the fields that changed. Nested objects (`pricing`, `availability`, `nutrition`, `allergies`, `schedule`) are replaced as a whole.",
          rules: ["Same rules as *Create item*."],
          body: { pricing: { price: 130, vatRate: 0.15 }, nutrition: { calories: 520, protein: 38, carb: 22, fat: 28 } },
          tests: T_OK,
          examples: [{ name: "Updated", body: { ...ITEM, pricing: { price: 130, vatRate: 0.15 } } }],
        }),
        R("Item price summary", "GET", `${BASE}/items/:itemId/pricing`, {
          status: "planned",
          screen: "Pricing tab → Item Summary",
          desc: "The three figures on the Pricing tab, computed by the server.",
          rules: [
            "`subTotalSar = price` · `vatSar = price × vatRate` · `totalSar = price + vat`.",
            "Round to 2 decimals (`130 × 0.15` is `19.5`, not `19.500000000000004`).",
          ],
          tests: T_OK,
          examples: [{ name: "SAR 130 item", body: { subTotalSar: 130, vatRate: 0.15, vatSar: 19.5, totalSar: 149.5 } }],
        }),
        R("Duplicate item", "POST", `${BASE}/items/:itemId/duplicate`, {
          status: "planned",
          screen: "Item ⋮ → Duplicate Item",
          source: "entities/menu/draft.ts — duplicateItem",
          rules: ["Inserted **immediately after** the original, not at the end.", "New ids for the item and all its modifier groups and options."],
          body: {},
          tests: T_CREATED,
          saves: { itemId: "id" },
          examples: [{ name: "Duplicated", code: 201, body: { ...ITEM, id: "itm-classic-burger-copy" } }],
        }),
        R("Add item to other sections", "POST", `${BASE}/items/:itemId/copy`, {
          status: "planned",
          screen: "Item ⋮ → Add to Multiple Sections",
          source: "entities/menu/draft.ts — addItemToSections",
          rules: [
            "Creates an independent copy in each target section (editing one does not change the others).",
            "Targets must be `kind: items` sections of the same menu, not the item's own section.",
          ],
          body: { targetSectionIds: ["sec-mains", "sec-kids"] },
          tests: T_CREATED,
          examples: [{ name: "Copied", code: 201, body: { created: [{ sectionId: "sec-mains", itemId: "itm-cb-mains" }, { sectionId: "sec-kids", itemId: "itm-cb-kids" }] } }],
        }),
        R("Delete item", "DELETE", `${BASE}/items/:itemId`, {
          status: "planned",
          screen: "Item ⋮ → Delete",
          rules: ["Removes the item from any offer that contained it."],
          tests: T_NO_CONTENT,
          examples: [{ name: "Deleted", code: 204 }],
        }),
      ]
    ),

    F(
      "3.4 · Step 2 · Modifiers",
      "Screen: `pages/menu/build/items` → **Modifiers** tab — the group list, Edit Group form, options table, the two dialogs, and the customer-view preview with its running total.",
      [
        R("Add modifier group", "POST", `${BASE}/items/:itemId/modifier-groups`, {
          status: "planned",
          screen: "Add Modifier Group dialog",
          source: "pages/menu/build/items/index.tsx — onAddGroup",
          rules: [
            "`name` required. `type`: `single` · `multi`.",
            "`required: true` sets `min: 1`; `required: false` sets `min: 0`. `max` starts at 1.",
            "`customerLabel` defaults to `name`; `showAsRadio` defaults to `type === single`.",
          ],
          body: { name: "Size", type: "single", required: true },
          tests: T_CREATED,
          saves: { groupId: "id" },
          examples: [{ name: "Created", code: 201, body: { ...GROUP, options: [] } }],
        }),
        R("Update modifier group", "PATCH", `${BASE}/items/:itemId/modifier-groups/:groupId`, {
          status: "planned",
          screen: "Edit Group form",
          rules: [
            "`min` ≤ `max` → otherwise `422 min_exceeds_max` (a customer could never satisfy the group).",
            "`required: true` requires `min` ≥ 1.",
            "A `single` group has `max: 1`.",
          ],
          body: { type: "single", customerLabel: "Choose your size", helpText: "Select your preferred size", min: 1, max: 1, required: true, showAsRadio: true },
          tests: T_OK,
          examples: [{ name: "Updated", body: GROUP }, err("min above max", 422, "min_exceeds_max", "Minimum selections cannot exceed the maximum.")],
        }),
        R("Reorder modifier groups", "PUT", `${BASE}/items/:itemId/modifier-groups/order`, {
          status: "planned",
          screen: "Drag handles in the group list",
          rules: ["`groupIds` must list every group of the item exactly once."],
          body: { groupIds: ["grp-size", "grp-cheese", "grp-sauce"] },
          tests: T_OK,
          examples: [{ name: "Reordered", body: { groupIds: ["grp-size", "grp-cheese", "grp-sauce"] } }],
        }),
        R("Delete modifier group", "DELETE", `${BASE}/items/:itemId/modifier-groups/:groupId`, {
          status: "planned",
          screen: "Edit Group → trash",
          tests: T_NO_CONTENT,
          examples: [{ name: "Deleted", code: 204 }],
        }),
        R("Add option", "POST", `${BASE}/items/:itemId/modifier-groups/:groupId/options`, {
          status: "planned",
          screen: "Add Modifier option dialog",
          source: "entities/menu/menu.ts — ModifierOption",
          rules: [
            "`name` required. `priceType`: `no-change` · `add-amount` · `fixed`.",
            "`no-change` → `price` is stored as `0` whatever is sent.",
            "`add-amount` → `price` > 0, added on top of the item price.",
            "`fixed` → `price` **replaces** the item's base price when chosen.",
            "In a `single` group at most one option may be `isDefault: true`; setting a new default clears the previous one.",
          ],
          body: { name: "Medium", subLabel: "160g beef", priceType: "add-amount", price: 8, isDefault: true, available: true },
          tests: T_CREATED,
          saves: { optionId: "id" },
          examples: [{ name: "Created", code: 201, body: OPTION }, err("Add-amount without price", 422, "validation_failed", "Some fields are invalid.", { price: "must_be_positive" })],
        }),
        R("Update option", "PATCH", `${BASE}/items/:itemId/modifier-groups/:groupId/options/:optionId`, {
          status: "planned",
          rules: ["Same rules as *Add option*."],
          body: { price: 9, available: false },
          tests: T_OK,
          examples: [{ name: "Updated", body: { ...OPTION, price: 9, available: false } }],
        }),
        R("Delete option", "DELETE", `${BASE}/items/:itemId/modifier-groups/:groupId/options/:optionId`, {
          status: "planned",
          tests: T_NO_CONTENT,
          examples: [{ name: "Deleted", code: 204 }],
        }),
        R("Customer-view total", "GET", `${BASE}/items/:itemId/modifier-total`, {
          status: "planned",
          screen: "Full Modifiers Preview (Customer view) → Total",
          source: "entities/menu/draft.ts — modifierTotal",
          desc: "The item's price with every pre-selected option applied — what the customer sees before changing anything.",
          rules: [
            "Start from `pricing.price`.",
            "For every option with `isDefault: true` **and** `available: true`: `add-amount` adds its price, `fixed` replaces the running total, `no-change` adds nothing.",
            "A defaulted option that is **unavailable** contributes nothing — the customer cannot have it, so it must not be charged.",
          ],
          tests: T_OK,
          examples: [
            {
              name: "The frame's SAR 113",
              body: {
                basePriceSar: 100,
                applied: [
                  { groupId: "grp-size", optionId: "opt-medium", priceType: "add-amount", amountSar: 8 },
                  { groupId: "grp-cheese", optionId: "opt-american", priceType: "add-amount", amountSar: 2 },
                  { groupId: "grp-cheese", optionId: "opt-cheddar", priceType: "add-amount", amountSar: 3 },
                ],
                totalSar: 113,
              },
            },
          ],
        }),
      ]
    ),

    F(
      "3.5 · Step 2 · Offers",
      "Screen: `pages/menu/build/offers` — selecting the **Offers** section swaps the editor to five tabs: Offer Info · Items on Offer · Pricing & Saving · Availability · Offer Channels.\n\nOffers always live in the menu's built-in `offers` section.",
      [
        R("List offers", "GET", `${BASE}/offers`, {
          status: "planned",
          tests: T_LIST,
          examples: [{ name: "Success", body: { data: [OFFER], meta: { page: 1, pageSize: 25, total: 1 } } }],
        }),
        R("Create offer", "POST", `${BASE}/offers`, {
          status: "planned",
          screen: "Add New Offer",
          source: "entities/menu/draft.ts — blankOffer",
          rules: [
            "`name` required. `slug` defaults to the name with spaces replaced by `_` and must be unique within the menu.",
            "The slug is set **once**. Renaming the offer later does not change it — it may already be in a shared link.",
            "Defaults: `status: active`, `customerCanChange: false`, `pricing.role: fixed`, `vatRate: 0.15`, channels dine-in/takeaway/delivery/kiosk on, online-ordering/mobile-app off.",
          ],
          body: { name: "Classic Burger Combo" },
          tests: T_CREATED,
          saves: { offerId: "id" },
          examples: [{ name: "Created", code: 201, body: { ...OFFER, image: null, badge: null, entries: [], pricing: { ...OFFER.pricing, offerPrice: 0 }, availability: { from: null, to: null, window: null } } }],
        }),
        R("Update offer", "PATCH", `${BASE}/offers/:offerId`, {
          status: "planned",
          screen: "Offer Info · Availability · Offer Channels · Pricing Roles",
          rules: [
            "`badge`: `Best Value` · `Limited Time` · `Popular` · `null`.",
            "`availability.from`/`to` are ISO dates, `from` ≤ `to`. `window` is `null` or `{ days: [fromDay, toDay], start: \"HH:mm\", end: \"HH:mm\" }`.",
            "`pricing.role`: `fixed` · `discount`. `dynamic` is shown in the UI as *not available yet* → `422 pricing_role_unavailable`.",
            "`pricing.offerPrice` > 0 before the offer can be published.",
            "At least one channel must be on.",
          ],
          body: {
            name: "Classic Burger Combo",
            image: "{{mediaUrl}}",
            badge: "Best Value",
            showSavingBadge: true,
            pricing: { role: "fixed", offerPrice: 100, vatRate: 0.15, excludeFromPromotions: false },
            availability: OFFER.availability,
            channels: OFFER.channels,
          },
          tests: T_OK,
          examples: [
            { name: "Updated", body: OFFER },
            err("Dynamic pricing", 422, "pricing_role_unavailable", "Dynamic pricing is not available yet."),
          ],
        }),
        R("Set item quantity on offer", "PUT", `${BASE}/offers/:offerId/entries/:itemId`, {
          status: "planned",
          screen: "Items on Offer → Add Item to Offer · − / + stepper",
          source: "entities/menu/draft.ts — setOfferEntry",
          rules: [
            "Adds the item if it is not on the offer yet; otherwise sets its quantity.",
            "`qty: 0` removes the item.",
            "`itemId` must be an item of the same menu (not another offer).",
            "The server snapshots the item's current price into the entry.",
          ],
          body: { qty: 1 },
          tests: T_OK,
          examples: [{ name: "Set", body: { itemId: "itm-classic-burger", qty: 1, price: 90 } }, err("Unknown item", 422, "item_not_in_menu", "This item is not part of the menu.")],
        }),
        R("Remove item from offer", "DELETE", `${BASE}/offers/:offerId/entries/:itemId`, {
          status: "planned",
          screen: "Items on Offer → trash",
          tests: T_NO_CONTENT,
          examples: [{ name: "Removed", code: 204 }],
        }),
        R("Offer pricing & saving", "GET", `${BASE}/offers/:offerId/pricing`, {
          status: "planned",
          screen: "Pricing & Saving tab",
          source: "entities/menu/pricing.ts",
          desc: "Both ledgers and the saving, computed by the server.",
          rules: [
            "**Individual total:** `subTotal = Σ price × qty` · `vat = subTotal × vatRate` · `total = subTotal + vat`.",
            "**Offer:** `vat = offerPrice × vatRate` · `total = offerPrice + vat`.",
            "**Saving — decided 2026-09-10:** compare the two **VAT-inclusive** totals. `amount = individual.total − offer.total`, `percent = round(amount / individual.total × 100)`. For the frame's combo that is **SAR 34.5 and 23%**. (The design file's SAR 49.5 compared an inclusive total with an exclusive price and does not match its own 23%; do not reproduce it.)",
            "An offer that costs as much as or more than its parts reports `amount: 0, percent: 0` — never a negative saving.",
            "Entries whose item was deleted are left out of the ledger.",
            "Round every figure to 2 decimals.",
          ],
          tests: T_OK,
          examples: [
            {
              name: "Burger 90 + Fries 20 + Drink 20, offer 100",
              body: {
                individual: {
                  lines: [
                    { itemId: "itm-classic-burger", name: "Classic Burger", qty: 1, priceSar: 90 },
                    { itemId: "itm-fries", name: "French Fries", qty: 1, priceSar: 20 },
                    { itemId: "itm-soft-drink", name: "Soft Drink", qty: 1, priceSar: 20 },
                  ],
                  subTotalSar: 130,
                  vatSar: 19.5,
                  totalSar: 149.5,
                },
                offer: { priceSar: 100, vatSar: 15, totalSar: 115 },
                savings: { amountSar: 34.5, percent: 23 },
              },
            },
          ],
        }),
        R("Delete offer", "DELETE", `${BASE}/offers/:offerId`, {
          status: "planned",
          tests: T_NO_CONTENT,
          examples: [{ name: "Deleted", code: 204 }],
        }),
      ]
    ),

    F(
      "3.6 · Step 3 · Theme",
      "Screen: `pages/menu/build/theme`.\n\n**Ownership is split on purpose.** This folder is the menu's **own** look: presets, navigation, category and card style, item-details behaviour, sticky cart, tags. The logo, the four colours, the fonts and the hero belong to the **business** and are shared with the Public Link Builder — they are saved with **04 · Public Link → 4.3 Brand**, so changing the logo in one place changes it in both.",
      [
        R("Get menu theme", "GET", `${BASE}/theme`, {
          status: "planned",
          tests: T_OK,
          examples: [{ name: "Success", body: THEME }],
        }),
        R("Update menu theme", "PUT", `${BASE}/theme`, {
          status: "planned",
          source: "entities/menu/menu.ts — MenuTheme",
          rules: [
            "`presetId`: `elegant` · `modernGrid` · `minimalMono` · `cafeWarm` · `casualBright` · `luxeNoir` (the same catalogue as 04 → *List themes*).",
            "`navStyle`: `top-bar` · `side-drawer` · `bottom-bar` · `pill-scroll`.",
            "`categoryStyle`: `icon-text` · `text-only` · `icons-only` · `image-text`.",
            "`cardStyle`: `classic` · `clean-minimal` · `image-top` · `image-left`.",
            "`itemDetails`: `same-page` · `overlay` · `new-page`.",
          ],
          body: { ...THEME, navStyle: "pill-scroll", cardStyle: "image-top" },
          tests: T_OK,
          examples: [{ name: "Updated", body: { ...THEME, navStyle: "pill-scroll", cardStyle: "image-top" } }],
        }),
      ]
    ),

    F(
      "3.7 · Step 4 · Review & Publish",
      "Screen: `pages/menu/build/review` — stat tiles, section overview, validation summary, publish destinations and the publish action.",
      [
        R("Save draft (whole menu)", "PUT", BASE, {
          status: "planned",
          screen: "Save Draft button (every step)",
          desc: "The builder holds the whole menu while the merchant edits and saves it in one call. The granular requests in 3.2–3.6 are for clients that save as they go; both must end in the same state.",
          rules: [
            "Body is the full menu (see *Get a menu*). The server re-applies every rule from 3.2–3.6; one violation rejects the whole save with per-field `details`.",
            "Send the `version` you loaded. If it no longer matches → `409 version_conflict` (someone else saved meanwhile).",
            "Saving never publishes: `status`, `channels` and `publishedAt` in the body are ignored.",
          ],
          body: { ...MENU, status: undefined, publishedAt: undefined },
          tests: T_OK,
          examples: [
            { name: "Saved", body: { ...MENU, updatedAt: "2026-09-10T09:30:00Z" } },
            err("Stale version", 409, "version_conflict", "This menu was changed by someone else. Reload to continue.", { currentVersion: 3 }),
          ],
        }),
        R("Validate menu", "GET", `${BASE}/validation`, {
          status: "planned",
          screen: "Validation Summary · stat tiles",
          source: "entities/menu/validation.ts",
          desc: "Three severities. **Only `errors` block publishing.** Counts are per offending item.",
          rules: [
            "**errors** — `menuMissingName` (menu name blank) · `itemMissingPrice` (price ≤ 0) · `taxMissing` (vatRate ≤ 0).",
            "**warnings** — `itemMissingImage` · `itemUnavailable` (`availability.available: false`) · `modifierRulesInvalid` (a group with `min` > `max`).",
            "**recommendations** — `addDescription` · `addAllergens` · `addTags`.",
            "A finding appears only when its count is above zero. The built-in offers section is ignored for item findings.",
          ],
          tests: T_OK,
          examples: [
            {
              name: "Two errors",
              body: {
                errors: [{ id: "itemMissingPrice", count: 2 }, { id: "taxMissing", count: 1 }],
                warnings: [{ id: "itemMissingImage", count: 4 }, { id: "itemUnavailable", count: 1 }, { id: "modifierRulesInvalid", count: 1 }],
                recommendations: [{ id: "addDescription", count: 4 }, { id: "addAllergens", count: 2 }, { id: "addTags", count: 1 }],
                stats: { sections: 10, items: 100, modifiers: 3, offers: 5, taxes: 1 },
              },
            },
            { name: "Ready", body: { errors: [], warnings: [], recommendations: [], stats: { sections: 10, items: 100, modifiers: 3, offers: 5, taxes: 1 } } },
          ],
        }),
        R("Publish menu to all channels", "POST", `${BASE}/publish`, {
          status: "planned",
          screen: "Publish Menu to All Channels",
          desc: "Takes the menu live on POS, Public Link and Table QR together.",
          rules: [
            "Runs *Validate* first. Any `errors` → `422 menu_has_errors` with the findings; nothing changes.",
            "On success: `status: active`, every channel `live` (except channels set to `off` in the schedule), `publishedAt` = now, `version` + 1.",
            "The previously published version keeps serving until this call succeeds.",
          ],
          body: {},
          tests: T_OK,
          examples: [
            { name: "Published", body: { id: "mnu-lunch", status: "active", channels: { pos: "live", publicLink: "live", tableQr: "live" }, publishedAt: "2026-09-10T09:45:00Z", version: 3, publishedBy: { id: "usr-001", name: "Omar Al-Harbi" } } },
            err("Has errors", 422, "menu_has_errors", "Fix the errors before publishing.", { errors: [{ id: "itemMissingPrice", count: 2 }] }),
          ],
        }),
      ]
    ),

    F(
      "3.8 · Media",
      "Every picture and video slot in the builder — section image, item image and video, offer image, and (from 04) logo and hero media. **Upload first, then send the returned `url`.**\n\nToday the front-end reads files into data URLs in memory; these requests replace that.",
      [
        R("Upload image", "POST", "/api/v1/media", {
          status: "planned",
          source: "apps/merchant/src/shared/ui/use-file-picker.tsx",
          rules: [
            "`file` required. Images: `image/png`, `image/jpeg`, `image/webp`, **≤ 4 MB** (the client refuses larger) → `413 file_too_large`.",
            "`purpose`: `section` · `item` · `offer` · `logo` · `hero` — decides the stored variants. Recommended item/section/offer size is **600×400**.",
            "Returns a stable public `url` on the CDN. Strip EXIF location data.",
          ],
          formdata: [
            { key: "file", type: "file", src: [], desc: "The image." },
            { key: "purpose", value: "item", desc: "section · item · offer · logo · hero" },
          ],
          tests: T_CREATED,
          saves: { mediaId: "id", mediaUrl: "url" },
          examples: [
            { name: "Uploaded", code: 201, body: { id: "med-9a1", url: "https://cdn.octopus.sa/t/ocean-view/media/med-9a1.webp", mimeType: "image/webp", width: 600, height: 400, sizeBytes: 48211, purpose: "item" } },
            err("Too large", 413, "file_too_large", "Images must be 4 MB or smaller.", { maxBytes: 4194304 }),
            err("Wrong type", 415, "unsupported_media_type", "Use a PNG, JPEG or WebP image."),
          ],
        }),
        R("Upload video", "POST", "/api/v1/media", {
          status: "planned",
          screen: "Item editor → Video (Optional) → Upload Video",
          rules: ["`video/mp4` or `video/quicktime` (MOV), **≤ 100 MB** → `413` otherwise.", "Returns `url` plus a `posterUrl` frame for the card."],
          formdata: [
            { key: "file", type: "file", src: [], desc: "MP4 or MOV, up to 100 MB." },
            { key: "purpose", value: "item-video", desc: "item-video" },
          ],
          tests: T_CREATED,
          saves: { mediaId: "id", mediaUrl: "url" },
          examples: [{ name: "Uploaded", code: 201, body: { id: "med-v31", url: "https://cdn.octopus.sa/t/ocean-view/media/med-v31.mp4", posterUrl: "https://cdn.octopus.sa/t/ocean-view/media/med-v31.jpg", mimeType: "video/mp4", durationSeconds: 12, sizeBytes: 8120334, purpose: "item-video" } }],
        }),
        R("Delete media", "DELETE", "/api/v1/media/:mediaId", {
          status: "planned",
          rules: ["Media still referenced by a section, item, offer or the brand → `409 media_in_use`."],
          tests: T_NO_CONTENT,
          examples: [{ name: "Deleted", code: 204 }, err("Still used", 409, "media_in_use", "This image is still used.", { usedBy: ["itm-classic-burger"] })],
        }),
      ]
    ),

    F(
      "3.9 · Import menu with AI",
      "🔴 **Deferred.** The library's *Import Menu (AI)* button and the chooser's green card lead to `pages/menu/import`, which says the feature is coming. These are the proposed shapes for when it is built.",
      [
        R("Start AI import", "POST", "/api/v1/menus/import", {
          status: "stub",
          screen: "pages/menu/import",
          desc: "Uploads a PDF or photo of an existing menu. Detection runs asynchronously.",
          rules: ["PDF or image, ≤ 20 MB.", "Answers `202` with a `jobId` to poll."],
          formdata: [
            { key: "file", type: "file", src: [], desc: "PDF, JPG or PNG of the menu." },
            { key: "branchId", value: "{{branchId}}" },
          ],
          tests: T_ACCEPTED,
          examples: [{ name: "Queued", code: 202, body: { jobId: "job-import-0012", status: "queued" } }],
        }),
        R("Get AI import result", "GET", "/api/v1/menus/import/:jobId", {
          status: "stub",
          desc: "When `status` is `done`, `detected` holds the sections and items to review before a menu is created from them.",
          tests: T_OK,
          examples: [{ name: "Done", body: { jobId: "job-import-0012", status: "done", detected: { sections: [{ name: "Breakfast", items: [{ name: "Classic Breakfast", priceSar: 90, confidence: 0.94 }] }] } } }],
        }),
      ]
    ),
  ]
);

module.exports = { menu };
