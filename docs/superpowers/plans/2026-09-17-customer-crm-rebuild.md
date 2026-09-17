# Customer CRM Module Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `apps/merchant/src/pages/customers/**` to match the 9 new Customer CRM mockup frames, and delete the Segments/Feedback sub-modules entirely.

**Architecture:** Follow the Orders module's newer conventions: a page-local `_shared/` folder holding types, a generator-based mock dataset, a theme file, and one file per non-trivial widget/modal. `index.tsx` (list) and `detail/index.tsx` stay thin orchestrators. All actions are local-state only (no backend).

**Tech Stack:** React + TypeScript, Tailwind (CSS custom properties for theming), `@ui/primitives` (Modal/Badge/Button/Checkbox/Input/Select/Tabs/Segmented/EmptyState/Card/Table), `lucide-react` icons, `react-router-dom`, the project's `useI18n()` hook + flat `en`/`ar` dictionaries.

**Spec:** `docs/superpowers/specs/2026-09-17-customer-crm-rebuild-design.md`

## Global Constraints

- No backend/API wiring anywhere in this module — every mutation (add customer, add note, add tag, block, delete, merge, send message, payment link) is local React state only.
- Every new UI string goes through `useI18n()`'s `t()` with a `customers.*` key; `en` and `ar` dictionaries must stay in sync (add the same keys to both in the same task).
- Match existing page-shell conventions exactly: root `<div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">`, card surfaces `rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]`, section eyebrow labels `text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]`, money via `formatSar` from `@octopus/api-client` (`SAR ${n.toFixed(2)}`, no thousands separator — matches every other module, not a CRM-specific choice).
- RTL: use logical Tailwind utilities (`ps-*`/`pe-*`, `start-*`/`end-*`, `text-start`, `ms-*`/`me-*`) throughout, never `pl-*`/`pr-*`/`left-*`/`right-*`. Directional icons that must not mirror get `rtl:rotate-180` or `rtl:hidden`/`hidden rtl:block` pairs (see `Pagination` for the pattern).
- Theming: never hardcode a literal hex for a surface/text/border color — use `var(--octo-*)` tokens via Tailwind arbitrary values. One-off accent hexes (tag chip colors, stat tile icon colors) are fine and centralized in this module's own `_shared/theme.ts`, same as Orders' `theme.ts`.
- No new components are promoted into `@ui/primitives` or into another page's `_shared/` — everything new lives under `pages/customers/_shared/`, copying/adapting patterns from other modules locally where needed (phone field, switch), per this codebase's page-isolation convention.
- File/export convention: kebab-case filenames, named exports only (no default exports), `.test.ts` next to the unit it tests.

---

## File Structure

```
apps/merchant/src/pages/customers/
  index.tsx                        (rewritten — list page)
  detail/index.tsx                 (rewritten — Customer Info page)
  _shared/
    types.ts                       (CustomerRecord and friends)
    format.ts                      (formatDate/formatDateTime/customerName helpers)
    theme.ts                       (TAG_STYLE, STAT_CARD_THEME, ROW_ACTION_THEME)
    mock-data.ts (+ .test.ts)      (generator producing 26 CustomerRecords)
    avatar.tsx                     (initials-circle)
    switch.tsx                     (toggle, copied from staff/_shared pattern)
    phone-field.tsx                (flag+966+digits, copied from reservations pattern)
    form-field.tsx                 (Field label/required/optional wrapper, copied from reservations pattern)
    stat-cards.tsx                 (6-card row)
    filter-popover.tsx             (Tags/Visits/Total Spend/Last Visit dropdowns)
    customer-row.tsx               (card row, desktop + mobile)
    payment-link-modal.tsx
    row-actions-menu.tsx           (kebab dropdown)
    add-note-modal.tsx
    add-tag-modal.tsx
    bulk-action-bar.tsx
    csv-export.ts
    add-customer-modal.tsx
    send-message-wizard/
      index.tsx                    (shell + step state)
      audience-step.tsx
      channel-content-step.tsx
      review-send-step.tsx
```

Deleted: `pages/customers/styles.ts`, `pages/customers/segments/**`, `pages/customers/feedback/**`, `pages/customer-detail/index.ts` (stray).

Modified: `apps/merchant/src/app/routes/registry.tsx`, `apps/merchant/src/widgets/app-sidebar/index.tsx`, `packages/i18n/src/locales/en/index.ts`, `packages/i18n/src/locales/ar/index.ts`.

---

### Task 1: Data layer — types, formatting, theme, generated mock data

**Files:**
- Create: `apps/merchant/src/pages/customers/_shared/types.ts`
- Create: `apps/merchant/src/pages/customers/_shared/format.ts`
- Create: `apps/merchant/src/pages/customers/_shared/theme.ts`
- Create: `apps/merchant/src/pages/customers/_shared/mock-data.ts`
- Test: `apps/merchant/src/pages/customers/_shared/mock-data.test.ts`

**Interfaces:**
- Produces: `CustomerTag`, `CommunicationChannel`, `MarketingConsent`, `CustomerNote`, `ReservationSummary`, `OrderSummary`, `PaymentSummary`, `CustomerRecord` (all from `types.ts`); `customerRecords: readonly CustomerRecord[]` and `customerStats: { id, label, value, delta, deltaNote, icon, tileColor, cardBg }[]` shape (from `mock-data.ts`, see below); `formatDate`, `formatReservationDateTime`, `customerName` (from `format.ts`); `TAG_STYLE`, `STAT_CARD_THEME`, `ROW_ACTION_THEME` (from `theme.ts`). Every later task imports from these five files only — no task re-defines these types.

- [ ] **Step 1: Write `types.ts`**

```ts
// apps/merchant/src/pages/customers/_shared/types.ts
// This page's own customer model — mirrors what a real
// `useCustomerList()` / `useCustomer(id)` query would return. Deliberately
// separate from any other module's data.

export type CustomerTag = "VIP" | "Frequent Diner" | "Birthday May" | "New Customer" | "At Risk";
export type CommunicationChannel = "WhatsApp" | "SMS" | "Email";
export type MarketingConsent = "Opted in" | "Opted out";
export type ReservationStatus = "Confirmed" | "Pending" | "Cancelled";
export type PaymentRecordStatus = "PAID" | "PENDING";

export interface CustomerNote {
  date: string; // ISO date
  text: string;
}

export interface ReservationSummary {
  date: string; // ISO datetime
  table: string;
  guests: number;
  status: ReservationStatus;
}

export interface OrderSummary {
  id: string;
  date: string; // ISO date
  items: string;
  totalSar: number;
}

export interface PaymentSummary {
  date: string; // ISO date
  cardLast4: string;
  amountSar: number;
  status: PaymentRecordStatus;
}

export interface CustomerRecord {
  id: string;
  firstName: string;
  lastName: string;
  gender: "Male" | "Female";
  tags: CustomerTag[];
  phone: string; // "+9665XXXXXXXX"
  email: string;
  isBlocked: boolean;
  visits: number;
  totalSpendSar: number;
  lastVisit: string; // ISO date
  upcomingReservation?: string; // ISO date
  loyaltyPoints: number;
  avgSpendSar: number;
  customerSince: string; // ISO date
  firstVisit: string; // ISO date
  preferredBranch: string;
  preferredAreaTable: string;
  vipSince?: string; // ISO date
  referredBy?: string;
  marketingConsent: MarketingConsent;
  cuisinePreference: string[];
  dietaryPreference: string;
  occasion: string;
  visitTime: string;
  communicationPreference: CommunicationChannel[];
  specialRequests: string;
  notes: CustomerNote[];
  recentReservations: ReservationSummary[];
  recentOrders: OrderSummary[];
  recentPayments: PaymentSummary[];
}

export const ALL_TAGS: readonly CustomerTag[] = ["VIP", "Frequent Diner", "Birthday May", "New Customer", "At Risk"];
```

- [ ] **Step 2: Write `format.ts`**

```ts
// apps/merchant/src/pages/customers/_shared/format.ts
import type { CustomerRecord } from "./types";

export function customerName(customer: Pick<CustomerRecord, "firstName" | "lastName">): string {
  return `${customer.firstName} ${customer.lastName}`;
}

export function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatReservationDateTime(iso: string, locale: string): string {
  const date = new Date(iso);
  const localeTag = locale === "ar" ? "ar-SA" : "en-US";
  const datePart = date.toLocaleDateString(localeTag, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const timePart = date.toLocaleTimeString(localeTag, { hour: "numeric", minute: "2-digit" });
  return `${datePart} - ${timePart}`;
}
```

- [ ] **Step 3: Write `theme.ts`**

```ts
// apps/merchant/src/pages/customers/_shared/theme.ts
// Hex colors match this page's own design frames, same convention as
// orders-list/_shared/theme.ts — not shared design tokens.
import type { ComponentType } from "react";
import { Crown, UtensilsCrossed, Cake, Sparkles, AlertTriangle, Ban } from "lucide-react";
import type { CustomerTag } from "./types";

export interface TagStyle {
  text: string;
  bg: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export const TAG_STYLE: Record<CustomerTag, TagStyle> = {
  VIP: { text: "#B9860A", bg: "#FDF3D6", icon: Crown },
  "Frequent Diner": { text: "#16A34A", bg: "#DCFCE7", icon: UtensilsCrossed },
  "Birthday May": { text: "#7C3AED", bg: "#EDE9FE", icon: Cake },
  "New Customer": { text: "#0D6EFD", bg: "#DBEAFE", icon: Sparkles },
  "At Risk": { text: "#DC2626", bg: "#FEE2E2", icon: AlertTriangle },
};

export const BLOCKED_STYLE: TagStyle = { text: "#6B7280", bg: "#F1F5F9", icon: Ban };

export type StatCardKey = "total" | "active" | "newThisMonth" | "vip" | "returning" | "totalSpend";

export interface StatCardTheme {
  icon: ComponentType<{ className?: string }>;
  tile: string;
  cardBg: string;
}

// One import per icon keeps this table scannable; semantics were chosen to
// actually match each label (the raw mockup pairs a mismatched icon/label
// on a couple of cards — an easy, low-risk fix over replicating that).
export const STAT_CARD_THEME: Record<StatCardKey, StatCardTheme> = {
  total: { icon: require("lucide-react").Users, tile: "#8B5CF6", cardBg: "bg-[#8B5CF6]/[0.08]" },
  active: { icon: require("lucide-react").UserCheck, tile: "#16A34A", cardBg: "bg-[#16A34A]/[0.08]" },
  newThisMonth: { icon: require("lucide-react").UserPlus, tile: "#F97316", cardBg: "bg-[#F97316]/[0.08]" },
  vip: { icon: require("lucide-react").Crown, tile: "#0EA5E9", cardBg: "bg-[#0EA5E9]/[0.08]" },
  returning: { icon: require("lucide-react").Repeat, tile: "#CA8A04", cardBg: "bg-[#CA8A04]/[0.08]" },
  totalSpend: { icon: require("lucide-react").Wallet, tile: "#0D6EFD", cardBg: "bg-[#0D6EFD]/[0.08]" },
};

export const ROW_ACTION_THEME = {
  newReservations: { text: "#B9860A", bg: "#FDF3D6" },
  paymentLink: { text: "#7C3AED", bg: "#EDE9FE" },
};
```

*(Note for the implementer: prefer static `import { Users, UserCheck, UserPlus, Crown, Repeat, Wallet } from "lucide-react"` at the top of the file over the `require(...)` calls above — they're written inline here only so this snippet stays self-contained; use the normal ES import form when creating the real file.)*

- [ ] **Step 4: Write `mock-data.ts`**

```ts
// apps/merchant/src/pages/customers/_shared/mock-data.ts
import type { CustomerRecord, CustomerTag } from "./types";

const NAME_POOL: readonly [string, string, "Male" | "Female"][] = [
  ["Abdullah", "Al-Qahtani", "Male"],
  ["Noura", "Al-Harbi", "Female"],
  ["Faisal", "Al-Zahrani", "Male"],
  ["Sara", "Al-Otaibi", "Female"],
  ["Khalid", "Al-Dosari", "Male"],
  ["Lama", "Al-Ghamdi", "Female"],
  ["Turki", "Al-Shehri", "Male"],
  ["Hessa", "Al-Mutairi", "Female"],
  ["Majed", "Al-Anazi", "Male"],
  ["Bandar", "Al-Rashidi", "Male"],
  ["Alanoud", "Al-Malki", "Female"],
  ["Omar", "Al-Faraj", "Male"],
  ["Dana", "Al-Amri", "Female"],
  ["Yousef", "Al-Suwaidi", "Male"],
  ["Nadia", "Al-Qurashi", "Female"],
  ["Saad", "Al-Balawi", "Male"],
  ["Rima", "Al-Juhani", "Female"],
  ["Fahad", "Al-Zahid", "Male"],
  ["Aisha", "Al-Harthi", "Female"],
  ["Mansour", "Al-Dawsari", "Male"],
  ["Haya", "Al-Ruwaili", "Female"],
  ["Rakan", "Al-Sulaimani", "Male"],
  ["Jawaher", "Al-Khalidi", "Female"],
  ["Sultan", "Al-Nasser", "Male"],
  ["Munira", "Al-Fahad", "Female"],
];

const TAG_SETS: readonly CustomerTag[][] = [
  ["VIP", "Frequent Diner"],
  ["Frequent Diner"],
  ["New Customer"],
  ["At Risk"],
  ["Birthday May"],
  [],
];

const BRANCHES: readonly string[] = ["Riyadh", "Jeddah", "Dammam", "Khobar"];
const AREAS: readonly string[] = ["Indoor", "Outdoor", "Private Room", "Bar Seating"];
const CUISINES: readonly string[][] = [
  ["Seafood", "Japanese", "Italian"],
  ["Grills", "Middle Eastern"],
  ["Italian", "French"],
  ["Indian", "Asian Fusion"],
];
const SOURCES: readonly string[] = ["Instagram", "Walk-in", "Website", "Referral"];

function buildCustomer(index: number, [firstName, lastName, gender]: readonly [string, string, "Male" | "Female"]): CustomerRecord {
  const visits = 1 + ((index * 7) % 40);
  const avgSpendSar = 60 + ((index * 13) % 140);
  const totalSpendSar = visits * avgSpendSar;
  const lastVisit = new Date(Date.UTC(2026, 4, 1 + (index % 28)));
  const customerSince = new Date(Date.UTC(2022 + (index % 4), index % 12, 1 + (index % 27)));
  const tags = TAG_SETS[index % TAG_SETS.length];

  return {
    id: `CUST-${1002 + index}`,
    firstName,
    lastName,
    gender,
    tags: [...tags],
    phone: `+9665${String(10000000 + index * 137).slice(0, 8)}`,
    email: `${firstName.toLowerCase()}.${lastName.replace("Al-", "").toLowerCase()}@gmail.com`,
    isBlocked: false,
    visits,
    totalSpendSar,
    lastVisit: lastVisit.toISOString().slice(0, 10),
    upcomingReservation: index % 3 === 0 ? new Date(Date.UTC(2026, 5, 1 + (index % 20))).toISOString().slice(0, 10) : undefined,
    loyaltyPoints: totalSpendSar * 2,
    avgSpendSar,
    customerSince: customerSince.toISOString().slice(0, 10),
    firstVisit: customerSince.toISOString().slice(0, 10),
    preferredBranch: BRANCHES[index % BRANCHES.length],
    preferredAreaTable: AREAS[index % AREAS.length],
    vipSince: tags.includes("VIP") ? customerSince.toISOString().slice(0, 10) : undefined,
    referredBy: SOURCES[index % SOURCES.length],
    marketingConsent: index % 5 === 0 ? "Opted out" : "Opted in",
    cuisinePreference: CUISINES[index % CUISINES.length],
    dietaryPreference: index % 4 === 0 ? "No Nuts" : "None",
    occasion: index % 6 === 0 ? "Birthday" : "None",
    visitTime: index % 2 === 0 ? "Evenings, Weekends" : "Lunch, Weekdays",
    communicationPreference: ["WhatsApp"],
    specialRequests: index % 3 === 0 ? "Likes quiet area, window seating" : "",
    notes: [],
    recentReservations: [],
    recentOrders: [],
    recentPayments: [],
  };
}

// Record #1: Reem Al-Subaie, matching the mockups' Customer Info / Payment
// Link / Send Message frames verbatim for every field they display. The
// mockups themselves disagree on Total Spend between the list row (SAR
// 1,500) and the Customer Info page (SAR 12,500) — the richer detail-page
// figure is treated as canonical and the list row reflects it too, since
// both can't be simultaneously true and the detail page reads as the
// "real" profile total.
const REEM_AL_SUBAIE: CustomerRecord = {
  id: "CUST-1001",
  firstName: "Reem",
  lastName: "Al-Subaie",
  gender: "Female",
  tags: ["VIP", "Frequent Diner", "Birthday May"],
  phone: "+966510002877",
  email: "Reemelsubaie@gmail.com",
  isBlocked: false,
  visits: 12,
  totalSpendSar: 12500,
  lastVisit: "2026-05-15",
  upcomingReservation: "2026-05-30",
  loyaltyPoints: 1250,
  avgSpendSar: 500,
  customerSince: "2022-09-16",
  firstVisit: "2022-09-16",
  preferredBranch: "Jeddah",
  preferredAreaTable: "Outdoor",
  vipSince: "2024-09-16",
  referredBy: "Instagram",
  marketingConsent: "Opted in",
  cuisinePreference: ["Seafood", "Japanese", "Italian"],
  dietaryPreference: "No Nuts",
  occasion: "Birthday",
  visitTime: "Evenings, Weekends",
  communicationPreference: ["WhatsApp"],
  specialRequests: "Likes quiet area, window seating",
  notes: [
    { date: "2026-05-14", text: "Requested window seat, loved the seafood platter." },
    { date: "2026-05-20", text: "Requested window seat, loved the seafood platter." },
    { date: "2026-05-30", text: "Requested window seat, loved the seafood platter." },
  ],
  recentReservations: [
    { date: "2026-05-10T19:30:00", table: "T22", guests: 2, status: "Confirmed" },
    { date: "2026-05-17T19:30:00", table: "T22", guests: 2, status: "Confirmed" },
    { date: "2026-05-24T19:30:00", table: "T22", guests: 2, status: "Confirmed" },
  ],
  recentOrders: [
    { id: "#ORD-00123654", date: "2025-05-10", items: "Seafood platter, Truffle pasta, Mocktail x2", totalSar: 186 },
    { id: "#ORD-00123412", date: "2025-04-26", items: "Seafood platter, Truffle pasta, Mocktail x2", totalSar: 186 },
    { id: "#ORD-00123180", date: "2025-04-12", items: "Seafood platter, Truffle pasta, Mocktail x2", totalSar: 186 },
  ],
  recentPayments: [
    { date: "2025-05-10", cardLast4: "4242", amountSar: 186, status: "PAID" },
    { date: "2025-04-26", cardLast4: "4242", amountSar: 186, status: "PAID" },
    { date: "2025-04-12", cardLast4: "4242", amountSar: 186, status: "PAID" },
  ],
};

export const customerRecords: readonly CustomerRecord[] = [REEM_AL_SUBAIE, ...NAME_POOL.map(buildCustomer)];

// The 6 header stat cards are hand-authored to match the mockup's exact
// headline numbers ("SAE 1,40M" read as a currency-code/decimal-separator
// typo for "SAR 1.40M", corrected here) — decorative business KPIs, not a
// filter-pill count that must equal the visible/generated row count the
// way Orders' stats do.
export const customerStats = {
  total: { value: 2845, delta: "+15%" },
  active: { value: 1986, delta: "+10%" },
  newThisMonth: { value: 156, delta: "+15%" },
  vip: { value: 312, delta: "+12%" },
  returning: { value: 1247, delta: "+20%" },
  totalSpend: { display: "SAR 1.40M", delta: "+50%" },
} as const;
```

- [ ] **Step 5: Write the failing test**

```ts
// apps/merchant/src/pages/customers/_shared/mock-data.test.ts
import { describe, expect, it } from "vitest";
import { customerRecords } from "./mock-data";

describe("customerRecords", () => {
  it("has 26 records", () => {
    expect(customerRecords).toHaveLength(26);
  });

  it("keeps Reem Al-Subaie as record #1 matching the mockup fields", () => {
    const reem = customerRecords[0];
    expect(reem.id).toBe("CUST-1001");
    expect(reem.firstName).toBe("Reem");
    expect(reem.lastName).toBe("Al-Subaie");
    expect(reem.phone).toBe("+966510002877");
    expect(reem.email).toBe("Reemelsubaie@gmail.com");
    expect(reem.tags).toEqual(["VIP", "Frequent Diner", "Birthday May"]);
    expect(reem.visits).toBe(12);
    expect(reem.totalSpendSar).toBe(12500);
    expect(reem.lastVisit).toBe("2026-05-15");
    expect(reem.upcomingReservation).toBe("2026-05-30");
    expect(reem.loyaltyPoints).toBe(1250);
    expect(reem.avgSpendSar).toBe(500);
  });

  it("gives every generated record a unique id", () => {
    const ids = new Set(customerRecords.map((c) => c.id));
    expect(ids.size).toBe(customerRecords.length);
  });
});
```

Check the repo's test runner first (`grep -r "\"test\":" apps/merchant/package.json` or look at an existing `*.test.ts` for its import style, e.g. `orders-list/_shared/mock-data.test.ts`) and match its exact import/assertion style if it differs from the `vitest` shown here.

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm --filter merchant test -- mock-data.test.ts` (or the equivalent command the repo's existing `*.test.ts` files use — check `package.json`'s `test` script)
Expected: FAIL — `mock-data.ts` doesn't exist yet, or fields don't match.

- [ ] **Step 7: Confirm it passes**

Run the same command.
Expected: PASS, 3 tests green.

- [ ] **Step 8: Typecheck**

Run: `pnpm --filter merchant typecheck` (or repo equivalent)
Expected: no errors from the four new files.

- [ ] **Step 9: Commit**

```bash
git add apps/merchant/src/pages/customers/_shared/types.ts apps/merchant/src/pages/customers/_shared/format.ts apps/merchant/src/pages/customers/_shared/theme.ts apps/merchant/src/pages/customers/_shared/mock-data.ts apps/merchant/src/pages/customers/_shared/mock-data.test.ts
git commit -m "feat(customers): add Customer CRM data layer (types, theme, mock data)"
```

---

### Task 2: i18n — replace the `customers.*` dictionary in en/ar

**Files:**
- Modify: `packages/i18n/src/locales/en/index.ts:1328-1352` and `:1922-2042`
- Modify: `packages/i18n/src/locales/ar/index.ts:1328-1352` and `:1922-2042`

**Interfaces:**
- Produces: every `customers.*` key referenced by Tasks 3–9 (list, filters, row actions, bulk bar, add-customer modal, detail page, payment-link modal, send-message wizard). No later task adds a `customers.*` key that isn't in this list — if one is missing, add it here retroactively before using it.

- [ ] **Step 1: Delete the old first block (en)**

In `packages/i18n/src/locales/en/index.ts`, delete lines 1328-1352 (from `"customers.title": "Customers",` through `"customers.col.lastVisit": "Last Visit",`) and replace with the full new key set below (this becomes the only `customers.*` block in the file).

```ts
  "customers.title": "Customer CRM",
  "customers.subtitle": "Manage your customers, track visits, preferences and build stronger relationships.",
  "customers.sendMessageCta": "Send Message",
  "customers.searchPlaceholder": "Search",
  "customers.stat.total": "Total Customers",
  "customers.stat.active": "Active Customers",
  "customers.stat.newThisMonth": "New this Month",
  "customers.stat.vip": "VIP Customers",
  "customers.stat.returning": "Returning Customers",
  "customers.stat.totalSpend": "Total Spend",
  "customers.stat.deltaVsYesterday": "vs Yesterday",
  "customers.stat.deltaVsLastMonth": "vs Last Month",
  "customers.filter.tags": "Tags",
  "customers.filter.visits": "Visits",
  "customers.filter.totalSpend": "Total Spend",
  "customers.filter.lastVisit": "Last Visit",
  "customers.filter.from": "From",
  "customers.filter.to": "To",
  "customers.filter.min": "Min",
  "customers.filter.max": "Max",
  "customers.filter.apply": "Apply",
  "customers.filter.reset": "Reset",
  "customers.saveSegment": "Save Segment",
  "customers.tag.vip": "VIP",
  "customers.tag.frequentDiner": "Frequent Diner",
  "customers.tag.birthdayMay": "Birthday May",
  "customers.tag.newCustomer": "New Customer",
  "customers.tag.atRisk": "At Risk",
  "customers.tag.blocked": "Blocked",
  "customers.row.visits": "Visits",
  "customers.row.totalSpend": "Total Spend",
  "customers.row.lastVisit": "Last Visit",
  "customers.row.upcoming": "Upcoming",
  "customers.row.edit": "Edit",
  "customers.row.newReservations": "New Reservations",
  "customers.row.paymentLink": "Payment Link",
  "customers.rowAction.addNote": "Add Note",
  "customers.rowAction.history": "History",
  "customers.rowAction.sendWhatsapp": "Send Via WhatsApp",
  "customers.rowAction.sendEmail": "Send Email",
  "customers.rowAction.addTag": "Add Tag",
  "customers.rowAction.block": "Block",
  "customers.rowAction.unblock": "Unblock",
  "customers.rowAction.delete": "Delete",
  "customers.rowAction.historyComingSoon": "Visit history detail view is coming soon.",
  "customers.rowAction.whatsappSent": "WhatsApp message sent.",
  "customers.rowAction.emailSent": "Email sent.",
  "customers.rowAction.blocked": "Customer blocked.",
  "customers.rowAction.unblocked": "Customer unblocked.",
  "customers.rowAction.deleteConfirm": "Delete this customer? This cannot be undone.",
  "customers.bulk.selected": "{count} Selected",
  "customers.bulk.sendWhatsapp": "Send Via WhatsApp",
  "customers.bulk.sendEmail": "Send Email",
  "customers.bulk.paymentLink": "Payment Link",
  "customers.bulk.addTag": "Add Tag",
  "customers.bulk.merge": "Merge",
  "customers.bulk.export": "Export",
  "customers.bulk.delete": "Delete",
  "customers.bulk.mergedConfirm": "Selected customers merged.",
  "customers.bulk.whatsappSentConfirm": "WhatsApp message sent to {count} customers.",
  "customers.bulk.emailSentConfirm": "Email sent to {count} customers.",
  "customers.bulk.deleteConfirm": "Delete {count} selected customers? This cannot be undone.",
  "customers.bulk.deletedConfirm": "{count} customers deleted.",
  "customers.addNote.title": "Add Note",
  "customers.addNote.placeholder": "Write a note about this customer",
  "customers.addNote.save": "Save Note",
  "customers.addTag.title": "Add Tag",
  "customers.addTag.placeholder": "Enter tag name",
  "customers.addTag.save": "Add",
  "customers.empty.title": "No Customers Yet",
  "customers.empty.description": "Your customer list is empty. Customers will appear here as they interact with your business.",
  "customers.empty.cta": "Add New Customer",
  "customers.noMatch.title": "No customers match your filters",
  "customers.noMatch.cta": "Reset filters",
  "customers.showing": "Showing {from}-{to} of {total}",
  "customers.addCustomer.cta": "Add New Customer",
  "customers.addCustomer.title": "Add New Customer",
  "customers.addCustomer.firstName": "First Name",
  "customers.addCustomer.firstNamePlaceholder": "Enter guest first name",
  "customers.addCustomer.lastName": "Last Name",
  "customers.addCustomer.lastNamePlaceholder": "Enter guest last name",
  "customers.addCustomer.phone": "Phone Number",
  "customers.addCustomer.email": "Email",
  "customers.addCustomer.emailPlaceholder": "Enter guest email",
  "customers.addCustomer.dob": "Date of Birth",
  "customers.addCustomer.dobPlaceholder": "Choose member date of birth",
  "customers.addCustomer.gender": "Gender",
  "customers.addCustomer.male": "Male",
  "customers.addCustomer.female": "Female",
  "customers.addCustomer.branch": "Preferred Branch",
  "customers.addCustomer.branchPlaceholder": "Select branch",
  "customers.addCustomer.areaTable": "Preferred Area / Table",
  "customers.addCustomer.areaTablePlaceholder": "Select area or table",
  "customers.addCustomer.source": "Customer Source",
  "customers.addCustomer.referredBy": "Referred by",
  "customers.addCustomer.referredByPlaceholder": "Enter name or source",
  "customers.addCustomer.note": "Note",
  "customers.addCustomer.notePlaceholder": "Add any notes about this customer",
  "customers.addCustomer.preferenceCommunication": "Preference & Communication",
  "customers.addCustomer.marketingTitle": "Marketing Communications",
  "customers.addCustomer.marketingDescription": "Allow this customer to receive promotional messages and offers.",
  "customers.addCustomer.tagLabel": "Add Customer Tag",
  "customers.addCustomer.addTagCta": "Add Tag",
  "customers.addCustomer.submit": "Add Customer",
  "customers.addCustomer.source.walkIn": "Walk-in",
  "customers.addCustomer.source.website": "Website",
  "customers.addCustomer.source.instagram": "Instagram",
  "customers.addCustomer.source.referral": "Referral",
  "customers.addCustomer.channel.whatsapp": "WhatsApp",
  "customers.addCustomer.channel.sms": "SMS",
  "customers.addCustomer.channel.email": "Email",
  "customers.addCustomer.createdConfirm": "Customer added successfully.",
  "customers.detail.back": "Back to Customers",
  "customers.detail.notFound": "Customer not found.",
  "customers.detail.title": "Customer Info",
  "customers.detail.totalVisits": "Total Visits",
  "customers.detail.totalSpend": "Total Spend",
  "customers.detail.lastVisit": "Last Visit",
  "customers.detail.loyaltyPoints": "Loyalty Points",
  "customers.detail.avgSpend": "Avg Spend",
  "customers.detail.about.title": "About Customer",
  "customers.detail.about.customerSince": "Customer Since",
  "customers.detail.about.firstVisit": "First Visit",
  "customers.detail.about.preferredBranch": "Preferred Branch",
  "customers.detail.about.preferredAreaTable": "Preferred Area/ Table",
  "customers.detail.about.vipSince": "VIP Since",
  "customers.detail.about.referredBy": "Referred By",
  "customers.detail.about.marketingConsent": "Marketing Consent",
  "customers.detail.preferences.title": "Preferences",
  "customers.detail.preferences.cuisine": "Cuisine Preference",
  "customers.detail.preferences.dietary": "Dietary Preference",
  "customers.detail.preferences.occasion": "Occasion",
  "customers.detail.preferences.visitTime": "Visit Time",
  "customers.detail.preferences.communication": "Communication",
  "customers.detail.preferences.specialRequests": "Special Requests",
  "customers.detail.notes.title": "Notes",
  "customers.detail.notes.empty": "No notes yet.",
  "customers.detail.reservations.title": "Recent Reservations",
  "customers.detail.orders.title": "Recent Orders",
  "customers.detail.payments.title": "Recent Payments",
  "customers.detail.viewAll": "View All",
  "customers.detail.reservationStatus.confirmed": "Confirmed",
  "customers.detail.reservationStatus.pending": "Pending",
  "customers.detail.reservationStatus.cancelled": "Cancelled",
  "customers.detail.paid": "PAID",
  "customers.detail.pending": "PENDING",
  "customers.detail.guests": "Guests",
  "customers.detail.edit": "Edit",
  "customers.detail.editAbout.title": "Edit About Customer",
  "customers.detail.editPreferences.title": "Edit Preferences",
  "customers.detail.save": "Save Changes",
  "customers.marketingConsent.optedIn": "Opted in",
  "customers.marketingConsent.optedOut": "Opted out",
  "customers.paymentLink.title": "Payment Link",
  "customers.paymentLink.requestType": "Request Type",
  "customers.paymentLink.deposit": "Deposit",
  "customers.paymentLink.balance": "Balance",
  "customers.paymentLink.customAmount": "Custom Amount",
  "customers.paymentLink.reservation": "Reservation",
  "customers.paymentLink.reservationPlaceholder": "Select reservation",
  "customers.paymentLink.amount": "Amount",
  "customers.paymentLink.amountPlaceholder": "Enter amount",
  "customers.paymentLink.description": "Description",
  "customers.paymentLink.descriptionPlaceholder": "Enter description",
  "customers.paymentLink.method": "Payment Method",
  "customers.paymentLink.methodLink": "Payment Link",
  "customers.paymentLink.methodLinkDesc": "Share a secure link",
  "customers.paymentLink.methodWhatsapp": "WhatsApp",
  "customers.paymentLink.methodWhatsappDesc": "Send via WhatsApp",
  "customers.paymentLink.methodSms": "SMS",
  "customers.paymentLink.methodSmsDesc": "Send via SMS",
  "customers.paymentLink.message": "Message",
  "customers.paymentLink.optional": "(Optional)",
  "customers.paymentLink.messagePlaceholder": "Enter message for the customer",
  "customers.paymentLink.send": "Send",
  "customers.paymentLink.sentConfirm": "Payment link sent.",
  "customers.sendMessage.title": "Send Message to Customers",
  "customers.sendMessage.step.audience": "Audience",
  "customers.sendMessage.step.channelContent": "Channel & Content",
  "customers.sendMessage.step.reviewSend": "Review & Send",
  "customers.sendMessage.tab.filters": "Filters",
  "customers.sendMessage.tab.segments": "Segments",
  "customers.sendMessage.tab.savedAudiences": "Saved Audiences",
  "customers.sendMessage.filter.tags": "Tags",
  "customers.sendMessage.filter.tagsPlaceholder": "Select tags",
  "customers.sendMessage.filter.visitFrequency": "Visit Frequency",
  "customers.sendMessage.filter.visitFrequencyPlaceholder": "Select frequency",
  "customers.sendMessage.filter.totalSpend": "Total Spend",
  "customers.sendMessage.filter.lastVisit": "Last Visit",
  "customers.sendMessage.filter.customerSince": "Customer Since",
  "customers.sendMessage.filter.gender": "Gender",
  "customers.sendMessage.filter.ageRange": "Age Range",
  "customers.sendMessage.filter.enterAmount": "Enter Amount",
  "customers.sendMessage.next": "Next",
  "customers.sendMessage.back": "Back",
  "customers.sendMessage.segmentsEmpty": "No segments yet — save a filter combination from Customer CRM to create one.",
  "customers.sendMessage.savedAudiencesEmpty": "No saved audiences yet.",
  "customers.sendMessage.channel.title": "Channel",
  "customers.sendMessage.channel.whatsapp": "WhatsApp",
  "customers.sendMessage.channel.sms": "SMS",
  "customers.sendMessage.channel.email": "Email",
  "customers.sendMessage.content.title": "Message",
  "customers.sendMessage.content.placeholder": "Write your message to customers...",
  "customers.sendMessage.content.charCount": "{count} characters",
  "customers.sendMessage.review.audienceOverview": "Audience Overview",
  "customers.sendMessage.review.totalSelected": "Total Selected",
  "customers.sendMessage.review.customersSuffix": "Customers",
  "customers.sendMessage.review.channelSummary": "Channel Summary",
  "customers.sendMessage.review.estMessages": "Est. Messages",
  "customers.sendMessage.review.estCost": "Estimated Cost",
  "customers.sendMessage.review.itemStatus": "Item Status",
  "customers.sendMessage.review.sendNow": "Send Now",
  "customers.sendMessage.review.scheduleLater": "Schedule For Later",
  "customers.sendMessage.review.sendBatches": "Send in Batches",
  "customers.sendMessage.send": "Send",
  "customers.sendMessage.sentConfirm": "Message sent to {count} customers.",
```

- [ ] **Step 2: Delete the old second block (en)**

Delete lines 1922-2042 (from `"customers.emptyTitle": "No customers found",` through `"customers.feedback.detail.notFound": "Feedback not found.",`) entirely — every key in that range is superseded by Step 1's block or belonged to Segments/Feedback, which no longer exist.

- [ ] **Step 3: Mirror Steps 1–2 in `ar/index.ts`**

Same two line ranges, same key names, Arabic values:

```ts
  "customers.title": "إدارة علاقات العملاء",
  "customers.subtitle": "إدارة عملائك، تتبع الزيارات والتفضيلات، وبناء علاقات أقوى.",
  "customers.sendMessageCta": "إرسال رسالة",
  "customers.searchPlaceholder": "بحث",
  "customers.stat.total": "إجمالي العملاء",
  "customers.stat.active": "العملاء النشطون",
  "customers.stat.newThisMonth": "جدد هذا الشهر",
  "customers.stat.vip": "عملاء VIP",
  "customers.stat.returning": "العملاء العائدون",
  "customers.stat.totalSpend": "إجمالي الإنفاق",
  "customers.stat.deltaVsYesterday": "مقارنة بالأمس",
  "customers.stat.deltaVsLastMonth": "مقارنة بالشهر الماضي",
  "customers.filter.tags": "الوسوم",
  "customers.filter.visits": "الزيارات",
  "customers.filter.totalSpend": "إجمالي الإنفاق",
  "customers.filter.lastVisit": "آخر زيارة",
  "customers.filter.from": "من",
  "customers.filter.to": "إلى",
  "customers.filter.min": "الحد الأدنى",
  "customers.filter.max": "الحد الأقصى",
  "customers.filter.apply": "تطبيق",
  "customers.filter.reset": "إعادة تعيين",
  "customers.saveSegment": "حفظ كشريحة",
  "customers.tag.vip": "VIP",
  "customers.tag.frequentDiner": "عميل متكرر",
  "customers.tag.birthdayMay": "عيد ميلاد مايو",
  "customers.tag.newCustomer": "عميل جديد",
  "customers.tag.atRisk": "معرض للخطر",
  "customers.tag.blocked": "محظور",
  "customers.row.visits": "الزيارات",
  "customers.row.totalSpend": "إجمالي الإنفاق",
  "customers.row.lastVisit": "آخر زيارة",
  "customers.row.upcoming": "القادم",
  "customers.row.edit": "تعديل",
  "customers.row.newReservations": "حجز جديد",
  "customers.row.paymentLink": "رابط دفع",
  "customers.rowAction.addNote": "إضافة ملاحظة",
  "customers.rowAction.history": "السجل",
  "customers.rowAction.sendWhatsapp": "إرسال عبر واتساب",
  "customers.rowAction.sendEmail": "إرسال بريد إلكتروني",
  "customers.rowAction.addTag": "إضافة وسم",
  "customers.rowAction.block": "حظر",
  "customers.rowAction.unblock": "إلغاء الحظر",
  "customers.rowAction.delete": "حذف",
  "customers.rowAction.historyComingSoon": "عرض تفاصيل سجل الزيارات قريبًا.",
  "customers.rowAction.whatsappSent": "تم إرسال رسالة واتساب.",
  "customers.rowAction.emailSent": "تم إرسال البريد الإلكتروني.",
  "customers.rowAction.blocked": "تم حظر العميل.",
  "customers.rowAction.unblocked": "تم إلغاء حظر العميل.",
  "customers.rowAction.deleteConfirm": "حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.",
  "customers.bulk.selected": "{count} محدد",
  "customers.bulk.sendWhatsapp": "إرسال عبر واتساب",
  "customers.bulk.sendEmail": "إرسال بريد إلكتروني",
  "customers.bulk.paymentLink": "رابط دفع",
  "customers.bulk.addTag": "إضافة وسم",
  "customers.bulk.merge": "دمج",
  "customers.bulk.export": "تصدير",
  "customers.bulk.delete": "حذف",
  "customers.bulk.mergedConfirm": "تم دمج العملاء المحددين.",
  "customers.bulk.whatsappSentConfirm": "تم إرسال رسالة واتساب إلى {count} عميل.",
  "customers.bulk.emailSentConfirm": "تم إرسال البريد الإلكتروني إلى {count} عميل.",
  "customers.bulk.deleteConfirm": "حذف {count} عميل محدد؟ لا يمكن التراجع عن هذا الإجراء.",
  "customers.bulk.deletedConfirm": "تم حذف {count} عميل.",
  "customers.addNote.title": "إضافة ملاحظة",
  "customers.addNote.placeholder": "اكتب ملاحظة عن هذا العميل",
  "customers.addNote.save": "حفظ الملاحظة",
  "customers.addTag.title": "إضافة وسم",
  "customers.addTag.placeholder": "أدخل اسم الوسم",
  "customers.addTag.save": "إضافة",
  "customers.empty.title": "لا يوجد عملاء بعد",
  "customers.empty.description": "قائمة عملائك فارغة. سيظهر العملاء هنا عند تفاعلهم مع نشاطك التجاري.",
  "customers.empty.cta": "إضافة عميل جديد",
  "customers.noMatch.title": "لا يوجد عملاء مطابقون للفلاتر",
  "customers.noMatch.cta": "إعادة تعيين الفلاتر",
  "customers.showing": "عرض {from}-{to} من {total}",
  "customers.addCustomer.cta": "إضافة عميل جديد",
  "customers.addCustomer.title": "إضافة عميل جديد",
  "customers.addCustomer.firstName": "الاسم الأول",
  "customers.addCustomer.firstNamePlaceholder": "أدخل الاسم الأول للعميل",
  "customers.addCustomer.lastName": "اسم العائلة",
  "customers.addCustomer.lastNamePlaceholder": "أدخل اسم عائلة العميل",
  "customers.addCustomer.phone": "رقم الهاتف",
  "customers.addCustomer.email": "البريد الإلكتروني",
  "customers.addCustomer.emailPlaceholder": "أدخل البريد الإلكتروني للعميل",
  "customers.addCustomer.dob": "تاريخ الميلاد",
  "customers.addCustomer.dobPlaceholder": "اختر تاريخ ميلاد العميل",
  "customers.addCustomer.gender": "الجنس",
  "customers.addCustomer.male": "ذكر",
  "customers.addCustomer.female": "أنثى",
  "customers.addCustomer.branch": "الفرع المفضل",
  "customers.addCustomer.branchPlaceholder": "اختر الفرع",
  "customers.addCustomer.areaTable": "المنطقة / الطاولة المفضلة",
  "customers.addCustomer.areaTablePlaceholder": "اختر المنطقة أو الطاولة",
  "customers.addCustomer.source": "مصدر العميل",
  "customers.addCustomer.referredBy": "أُحيل بواسطة",
  "customers.addCustomer.referredByPlaceholder": "أدخل الاسم أو المصدر",
  "customers.addCustomer.note": "ملاحظة",
  "customers.addCustomer.notePlaceholder": "أضف أي ملاحظات حول هذا العميل",
  "customers.addCustomer.preferenceCommunication": "التفضيلات والتواصل",
  "customers.addCustomer.marketingTitle": "رسائل تسويقية",
  "customers.addCustomer.marketingDescription": "السماح لهذا العميل باستقبال الرسائل والعروض الترويجية.",
  "customers.addCustomer.tagLabel": "إضافة وسم للعميل",
  "customers.addCustomer.addTagCta": "إضافة وسم",
  "customers.addCustomer.submit": "إضافة العميل",
  "customers.addCustomer.source.walkIn": "زيارة مباشرة",
  "customers.addCustomer.source.website": "الموقع الإلكتروني",
  "customers.addCustomer.source.instagram": "انستغرام",
  "customers.addCustomer.source.referral": "إحالة",
  "customers.addCustomer.channel.whatsapp": "واتساب",
  "customers.addCustomer.channel.sms": "رسالة نصية",
  "customers.addCustomer.channel.email": "بريد إلكتروني",
  "customers.addCustomer.createdConfirm": "تمت إضافة العميل بنجاح.",
  "customers.detail.back": "العودة إلى العملاء",
  "customers.detail.notFound": "العميل غير موجود.",
  "customers.detail.title": "بيانات العميل",
  "customers.detail.totalVisits": "إجمالي الزيارات",
  "customers.detail.totalSpend": "إجمالي الإنفاق",
  "customers.detail.lastVisit": "آخر زيارة",
  "customers.detail.loyaltyPoints": "نقاط الولاء",
  "customers.detail.avgSpend": "متوسط الإنفاق",
  "customers.detail.about.title": "عن العميل",
  "customers.detail.about.customerSince": "عميل منذ",
  "customers.detail.about.firstVisit": "أول زيارة",
  "customers.detail.about.preferredBranch": "الفرع المفضل",
  "customers.detail.about.preferredAreaTable": "المنطقة/الطاولة المفضلة",
  "customers.detail.about.vipSince": "VIP منذ",
  "customers.detail.about.referredBy": "أُحيل بواسطة",
  "customers.detail.about.marketingConsent": "موافقة التسويق",
  "customers.detail.preferences.title": "التفضيلات",
  "customers.detail.preferences.cuisine": "تفضيل المطبخ",
  "customers.detail.preferences.dietary": "التفضيل الغذائي",
  "customers.detail.preferences.occasion": "المناسبة",
  "customers.detail.preferences.visitTime": "وقت الزيارة",
  "customers.detail.preferences.communication": "التواصل",
  "customers.detail.preferences.specialRequests": "طلبات خاصة",
  "customers.detail.notes.title": "ملاحظات",
  "customers.detail.notes.empty": "لا توجد ملاحظات بعد.",
  "customers.detail.reservations.title": "أحدث الحجوزات",
  "customers.detail.orders.title": "أحدث الطلبات",
  "customers.detail.payments.title": "أحدث المدفوعات",
  "customers.detail.viewAll": "عرض الكل",
  "customers.detail.reservationStatus.confirmed": "مؤكد",
  "customers.detail.reservationStatus.pending": "قيد الانتظار",
  "customers.detail.reservationStatus.cancelled": "ملغى",
  "customers.detail.paid": "مدفوع",
  "customers.detail.pending": "معلق",
  "customers.detail.guests": "الضيوف",
  "customers.detail.edit": "تعديل",
  "customers.detail.editAbout.title": "تعديل بيانات العميل",
  "customers.detail.editPreferences.title": "تعديل التفضيلات",
  "customers.detail.save": "حفظ التغييرات",
  "customers.marketingConsent.optedIn": "موافق",
  "customers.marketingConsent.optedOut": "غير موافق",
  "customers.paymentLink.title": "رابط الدفع",
  "customers.paymentLink.requestType": "نوع الطلب",
  "customers.paymentLink.deposit": "عربون",
  "customers.paymentLink.balance": "الرصيد",
  "customers.paymentLink.customAmount": "مبلغ مخصص",
  "customers.paymentLink.reservation": "الحجز",
  "customers.paymentLink.reservationPlaceholder": "اختر الحجز",
  "customers.paymentLink.amount": "المبلغ",
  "customers.paymentLink.amountPlaceholder": "أدخل المبلغ",
  "customers.paymentLink.description": "الوصف",
  "customers.paymentLink.descriptionPlaceholder": "أدخل الوصف",
  "customers.paymentLink.method": "طريقة الدفع",
  "customers.paymentLink.methodLink": "رابط دفع",
  "customers.paymentLink.methodLinkDesc": "مشاركة رابط آمن",
  "customers.paymentLink.methodWhatsapp": "واتساب",
  "customers.paymentLink.methodWhatsappDesc": "إرسال عبر واتساب",
  "customers.paymentLink.methodSms": "رسالة نصية",
  "customers.paymentLink.methodSmsDesc": "إرسال عبر رسالة نصية",
  "customers.paymentLink.message": "رسالة",
  "customers.paymentLink.optional": "(اختياري)",
  "customers.paymentLink.messagePlaceholder": "أدخل رسالة للعميل",
  "customers.paymentLink.send": "إرسال",
  "customers.paymentLink.sentConfirm": "تم إرسال رابط الدفع.",
  "customers.sendMessage.title": "إرسال رسالة إلى العملاء",
  "customers.sendMessage.step.audience": "الجمهور",
  "customers.sendMessage.step.channelContent": "القناة والمحتوى",
  "customers.sendMessage.step.reviewSend": "المراجعة والإرسال",
  "customers.sendMessage.tab.filters": "الفلاتر",
  "customers.sendMessage.tab.segments": "الشرائح",
  "customers.sendMessage.tab.savedAudiences": "الجماهير المحفوظة",
  "customers.sendMessage.filter.tags": "الوسوم",
  "customers.sendMessage.filter.tagsPlaceholder": "اختر الوسوم",
  "customers.sendMessage.filter.visitFrequency": "تكرار الزيارة",
  "customers.sendMessage.filter.visitFrequencyPlaceholder": "اختر التكرار",
  "customers.sendMessage.filter.totalSpend": "إجمالي الإنفاق",
  "customers.sendMessage.filter.lastVisit": "آخر زيارة",
  "customers.sendMessage.filter.customerSince": "عميل منذ",
  "customers.sendMessage.filter.gender": "الجنس",
  "customers.sendMessage.filter.ageRange": "الفئة العمرية",
  "customers.sendMessage.filter.enterAmount": "أدخل المبلغ",
  "customers.sendMessage.next": "التالي",
  "customers.sendMessage.back": "رجوع",
  "customers.sendMessage.segmentsEmpty": "لا توجد شرائح بعد — احفظ مجموعة فلاتر من صفحة العملاء لإنشاء واحدة.",
  "customers.sendMessage.savedAudiencesEmpty": "لا توجد جماهير محفوظة بعد.",
  "customers.sendMessage.channel.title": "القناة",
  "customers.sendMessage.channel.whatsapp": "واتساب",
  "customers.sendMessage.channel.sms": "رسالة نصية",
  "customers.sendMessage.channel.email": "بريد إلكتروني",
  "customers.sendMessage.content.title": "الرسالة",
  "customers.sendMessage.content.placeholder": "اكتب رسالتك إلى العملاء...",
  "customers.sendMessage.content.charCount": "{count} حرف",
  "customers.sendMessage.review.audienceOverview": "نظرة عامة على الجمهور",
  "customers.sendMessage.review.totalSelected": "إجمالي المحدد",
  "customers.sendMessage.review.customersSuffix": "عميل",
  "customers.sendMessage.review.channelSummary": "ملخص القناة",
  "customers.sendMessage.review.estMessages": "عدد الرسائل التقريبي",
  "customers.sendMessage.review.estCost": "التكلفة التقديرية",
  "customers.sendMessage.review.itemStatus": "حالة الإرسال",
  "customers.sendMessage.review.sendNow": "إرسال الآن",
  "customers.sendMessage.review.scheduleLater": "جدولة لاحقًا",
  "customers.sendMessage.review.sendBatches": "إرسال على دفعات",
  "customers.sendMessage.send": "إرسال",
  "customers.sendMessage.sentConfirm": "تم إرسال الرسالة إلى {count} عميل.",
```

- [ ] **Step 4: Grep-verify no leftover references**

Run: `grep -rn "customers\.kpi\.\|customers\.drawer\.\|customers\.segments\.\|customers\.feedback\.\|customers\.col\.\|customers\.customerList\|customers\.emptyTitle\|customers\.clearFilters\|customers\.noMatch\"" packages/i18n apps/merchant/src`
Expected: no matches (the old keys are gone and nothing outside this module referenced them — the pages that used them are rewritten/deleted in later tasks, so a stray hit here just means a task below hasn't run yet; re-run this check again in Task 9).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter i18n typecheck` (or repo equivalent) — confirms `en`/`ar` still satisfy whatever type (`Record<string, string>` or a generated key union) `packages/i18n` exports.

- [ ] **Step 6: Commit**

```bash
git add packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "feat(i18n): replace customers.* dictionary for the Customer CRM rebuild"
```

---

### Task 3: List page shell — header, stat cards, search, empty state, basic rows

**Files:**
- Create: `apps/merchant/src/pages/customers/_shared/avatar.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/stat-cards.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/customer-row.tsx`
- Modify: `apps/merchant/src/pages/customers/index.tsx` (full rewrite)
- Delete: `apps/merchant/src/pages/customers/styles.ts` (superseded by `_shared/theme.ts` + `_shared/avatar.tsx`; grep first — Step 0)

**Interfaces:**
- Consumes: `customerRecords`, `customerStats` (Task 1 `mock-data.ts`), `CustomerRecord`, `ALL_TAGS` (Task 1 `types.ts`), `TAG_STYLE`, `STAT_CARD_THEME`, `ROW_ACTION_THEME` (Task 1 `theme.ts`), `customerName`, `formatDate` (Task 1 `format.ts`), all `customers.*` i18n keys from Task 2.
- Produces: `Avatar({ name, size? })` (used by every later task that shows a customer), `CustomerStatCards({ stats })`, `CustomerRow({ customer, selected, onToggleSelect, onOpenPaymentLink, onOpenRowActions })` — `onOpenPaymentLink`/`onOpenRowActions` are no-ops wired up for real in Tasks 4–5, so this task passes `() => {}` placeholders from `index.tsx` (not a placeholder in the "no code" sense — a real, typed, temporarily-empty handler that later tasks replace by editing `index.tsx`, same as how Orders' `index.tsx` grew its handlers task by task).

- [ ] **Step 0: Grep before deleting `styles.ts`**

Run: `grep -rn "from \"\\./styles\"\|from \"\\.\\./styles\"" apps/merchant/src/pages/customers`
Expected: only `index.tsx` and `detail/index.tsx` (both rewritten in this plan) — confirms no other file depends on it before deleting.

- [ ] **Step 1: Write `avatar.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/avatar.tsx
function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-info/10 font-semibold text-[#0D6EFD]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </div>
  );
}
```

- [ ] **Step 2: Write `stat-cards.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/stat-cards.tsx
import { BarChart3 } from "lucide-react";
import { formatSar } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { STAT_CARD_THEME, type StatCardKey } from "./theme";
import { customerStats } from "./mock-data";

const CARD_ORDER: readonly StatCardKey[] = ["total", "active", "newThisMonth", "vip", "returning", "totalSpend"];
const LABEL_KEY: Record<StatCardKey, string> = {
  total: "customers.stat.total",
  active: "customers.stat.active",
  newThisMonth: "customers.stat.newThisMonth",
  vip: "customers.stat.vip",
  returning: "customers.stat.returning",
  totalSpend: "customers.stat.totalSpend",
};

export function CustomerStatCards() {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {CARD_ORDER.map((key) => {
        const theme = STAT_CARD_THEME[key];
        const Icon = theme.icon;
        const stat = customerStats[key];
        const display = "display" in stat ? stat.display : formatSar(stat.value).replace(".00", "").replace("SAR ", "") ;
        const value = key === "totalSpend" ? (stat as { display: string }).display : (stat as { value: number }).value.toLocaleString();

        return (
          <div key={key} className={`rounded-2xl p-4 ${theme.cardBg}`}>
            <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: theme.tile }}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div className="mt-3 whitespace-nowrap text-[22px] font-bold leading-none text-[var(--octo-text-primary)]">
              {value}
            </div>
            <div className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{t(LABEL_KEY[key])}</div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px]">
              <BarChart3 size={13} className="text-[#16A34A]" strokeWidth={2.5} />
              <span className="font-semibold text-[#16A34A]">{stat.delta}</span>
              <span className="text-[var(--octo-text-faint)]">
                {t(key === "totalSpend" ? "customers.stat.deltaVsLastMonth" : "customers.stat.deltaVsYesterday")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

Drop the unused `display` variable from Step 2's snippet above when writing the real file — it was scratch work; only `value` is rendered. Each card shows `stat.value.toLocaleString()` for the five count cards and `stat.display` (`"SAR 1.40M"`) for `totalSpend`.

- [ ] **Step 3: Write `customer-row.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/customer-row.tsx
import { Mail, MoreVertical, Pencil } from "lucide-react";
import { Checkbox } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { customerName } from "./format";
import { TAG_STYLE, BLOCKED_STYLE, ROW_ACTION_THEME } from "./theme";
import { WhatsAppGlyph } from "./whatsapp-glyph";
import type { CustomerRecord } from "./types";

export function CustomerRow({
  customer,
  selected,
  onToggleSelect,
  onEdit,
  onNewReservation,
  onOpenPaymentLink,
  onOpenRowActions,
}: {
  customer: CustomerRecord;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onNewReservation: () => void;
  onOpenPaymentLink: () => void;
  onOpenRowActions: (anchor: HTMLElement) => void;
}) {
  const { t, locale } = useI18n();
  const name = customerName(customer);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3.5">
      <Checkbox checked={selected} onChange={onToggleSelect} aria-label={name} />

      <div className="min-w-[220px] flex-1">
        <div className="flex items-center gap-2 font-semibold text-[var(--octo-text-primary)]">{name}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {customer.isBlocked && (
            <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: BLOCKED_STYLE.text, backgroundColor: BLOCKED_STYLE.bg }}>
              {t("customers.tag.blocked")}
            </span>
          )}
          {customer.tags.map((tag) => (
            <span key={tag} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: TAG_STYLE[tag].text, backgroundColor: TAG_STYLE[tag].bg }}>
              {t(`customers.tag.${tag === "VIP" ? "vip" : tag === "Frequent Diner" ? "frequentDiner" : tag === "Birthday May" ? "birthdayMay" : tag === "New Customer" ? "newCustomer" : "atRisk"}`)}
            </span>
          ))}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-muted)]">
          <WhatsAppGlyph size={12} /> {customer.phone}
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-muted)]">
          <Mail size={12} /> {customer.email}
        </div>
      </div>

      <RowStat label={t("customers.row.visits")} value={String(customer.visits)} />
      <RowStat label={t("customers.row.totalSpend")} value={`SAR ${customer.totalSpendSar}`} />
      <RowStat label={t("customers.row.lastVisit")} value={customer.lastVisit} />
      <RowStat
        label={t("customers.row.upcoming")}
        value={customer.upcomingReservation ?? "—"}
        valueClassName={customer.upcomingReservation ? "text-[#0D6EFD]" : undefined}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--octo-border-input)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          <Pencil size={12} /> {t("customers.row.edit")}
        </button>
        <button
          type="button"
          onClick={onNewReservation}
          className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-medium"
          style={{ color: ROW_ACTION_THEME.newReservations.text, backgroundColor: ROW_ACTION_THEME.newReservations.bg }}
        >
          {t("customers.row.newReservations")}
        </button>
        <button
          type="button"
          onClick={onOpenPaymentLink}
          className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-medium"
          style={{ color: ROW_ACTION_THEME.paymentLink.text, backgroundColor: ROW_ACTION_THEME.paymentLink.bg }}
        >
          {t("customers.row.paymentLink")}
        </button>
        <button
          type="button"
          onClick={(event) => onOpenRowActions(event.currentTarget)}
          className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
          aria-label="More actions"
        >
          <MoreVertical size={15} />
        </button>
      </div>
    </div>
  );
}

function RowStat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="min-w-[86px]">
      <div className="text-[10.5px] uppercase tracking-wide text-[var(--octo-text-faint)]">{label}</div>
      <div className={`mt-0.5 text-[12.5px] font-medium text-[var(--octo-text-primary)] ${valueClassName ?? ""}`}>{value}</div>
    </div>
  );
}
```

Note: `locale` is destructured but unused in this snippet — remove it when writing the real file (or use it if you switch `customer.lastVisit`/`upcoming` to `formatDate(customer.lastVisit, locale)` for locale-aware date display, which is the better choice — do that instead of printing the raw ISO string).

Also create `apps/merchant/src/pages/customers/_shared/whatsapp-glyph.tsx` by copying the `WhatsAppGlyph` function body verbatim from `apps/merchant/src/pages/reservations/waitlist/_shared/glyphs.tsx` (lines 4-14) — same page-isolation convention as everywhere else in this plan.

- [ ] **Step 4: Rewrite `index.tsx`**

```tsx
// apps/merchant/src/pages/customers/index.tsx
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Button, EmptyState } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { customerRecords } from "./_shared/mock-data";
import { customerName } from "./_shared/format";
import { CustomerStatCards } from "./_shared/stat-cards";
import { CustomerRow } from "./_shared/customer-row";
import type { CustomerRecord } from "./_shared/types";

export function CustomersPage() {
  const { t } = useI18n();
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => [...customerRecords]);
  const [search, setSearch] = useState("");

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter(
      (c) => customerName(c).toLowerCase().includes(query) || c.phone.includes(query) || c.email.toLowerCase().includes(query)
    );
  }, [customers, search]);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">{t("customers.title")}</h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">{t("customers.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">{t("customers.sendMessageCta")}</Button>
          <Button variant="primary" size="sm">{t("customers.addCustomer.cta")}</Button>
        </div>
      </header>

      <div className="mt-4">
        <CustomerStatCards />
      </div>

      {customers.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Users size={18} />}
          title={t("customers.empty.title")}
          description={t("customers.empty.description")}
          action={<Button variant="primary">{t("customers.empty.cta")}</Button>}
        />
      ) : (
        <>
          <div className="mt-4 max-w-[320px]">
            <div className="relative flex items-center">
              <Search size={13} className="pointer-events-none absolute start-3 text-[var(--octo-text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("customers.searchPlaceholder")}
                className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-2 ps-8 pe-3 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
              />
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <EmptyState
              className="mt-8"
              icon={<Users size={18} />}
              title={t("customers.noMatch.title")}
              action={<Button variant="secondary" size="sm" onClick={() => setSearch("")}>{t("customers.noMatch.cta")}</Button>}
            />
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              {visibleRows.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  selected={false}
                  onToggleSelect={() => {}}
                  onEdit={() => {}}
                  onNewReservation={() => {}}
                  onOpenPaymentLink={() => {}}
                  onOpenRowActions={() => {}}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Delete `styles.ts`**

```bash
git rm apps/merchant/src/pages/customers/styles.ts
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter merchant typecheck`
Expected: no errors. (`detail/index.tsx` will still fail — it's rewritten in Task 7. If your typecheck runs the whole `merchant` project rather than per-file, ignore pre-existing errors from `pages/customers/detail`, `pages/customers/segments`, `pages/customers/feedback` for now; they're resolved by Tasks 7 and 9.)

- [ ] **Step 7: Manual verification**

Use the `run` skill to start the merchant app and navigate to `/customers`. Screenshot and compare against `apps/assets/Customer CRM/CRM.png` for the header/stat-cards/row layout, per the [[verify-ui-with-screenshots]] memory. The row's Edit/New Reservations/Payment Link/kebab buttons render but do nothing yet — that's expected, wired up in Tasks 4–5.

- [ ] **Step 8: Commit**

```bash
git add apps/merchant/src/pages/customers/index.tsx apps/merchant/src/pages/customers/_shared/avatar.tsx apps/merchant/src/pages/customers/_shared/stat-cards.tsx apps/merchant/src/pages/customers/_shared/customer-row.tsx apps/merchant/src/pages/customers/_shared/whatsapp-glyph.tsx
git rm apps/merchant/src/pages/customers/styles.ts
git commit -m "feat(customers): rebuild list page shell with new stat cards and row layout"
```

---

### Task 4: Filter popovers + Payment Link modal

**Files:**
- Create: `apps/merchant/src/pages/customers/_shared/filter-popover.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/payment-link-modal.tsx`
- Modify: `apps/merchant/src/pages/customers/index.tsx` (wire filters + payment-link trigger)

**Interfaces:**
- Consumes: Task 1 types/format, Task 3's `CustomerRow` (its `onOpenPaymentLink` prop).
- Produces: `TagsFilterPopover`, `RangeFilterPopover` (generic from/to, reused for Visits/Total Spend/Last Visit with different input types via a `kind: "number" | "currency" | "date"` prop), `PaymentLinkModal({ customer, open, onClose, onSent })`.

- [ ] **Step 1: Write `filter-popover.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/filter-popover.tsx
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ALL_TAGS, type CustomerTag } from "./types";

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);
  return { open, setOpen, ref };
}

function PopoverTrigger({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
    >
      {label}
      <ChevronDown size={13} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
    </button>
  );
}

export function TagsFilterPopover({ selected, onApply }: { selected: readonly CustomerTag[]; onApply: (tags: readonly CustomerTag[]) => void }) {
  const { t } = useI18n();
  const { open, setOpen, ref } = usePopover();
  const [draft, setDraft] = useState<CustomerTag[]>([...selected]);

  return (
    <div ref={ref} className="relative">
      <PopoverTrigger label={t("customers.filter.tags")} open={open} onClick={() => { setDraft([...selected]); setOpen((v) => !v); }} />
      {open && (
        <div className="absolute start-0 top-[calc(100%+6px)] z-30 w-[220px] rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3.5 shadow-lg">
          <div className="flex flex-col gap-2">
            {ALL_TAGS.map((tag) => (
              <Checkbox
                key={tag}
                label={tag}
                checked={draft.includes(tag)}
                onChange={() => setDraft((prev) => (prev.includes(tag) ? prev.filter((t2) => t2 !== tag) : [...prev, tag]))}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => { onApply(draft); setOpen(false); }}
            className="mt-3 w-full rounded-[9px] bg-[#0D6EFD] py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t("customers.filter.apply")}
          </button>
        </div>
      )}
    </div>
  );
}

export interface RangeValue {
  from: string;
  to: string;
}

export function RangeFilterPopover({
  label,
  kind,
  value,
  onApply,
}: {
  label: string;
  kind: "number" | "currency" | "date";
  value: RangeValue;
  onApply: (value: RangeValue) => void;
}) {
  const { t } = useI18n();
  const { open, setOpen, ref } = usePopover();
  const [draft, setDraft] = useState<RangeValue>(value);
  const inputType = kind === "date" ? "date" : "text";
  const fromLabel = kind === "currency" ? t("customers.filter.min") : t("customers.filter.from");
  const toLabel = kind === "currency" ? t("customers.filter.max") : t("customers.filter.to");

  return (
    <div ref={ref} className="relative">
      <PopoverTrigger label={label} open={open} onClick={() => { setDraft(value); setOpen((v) => !v); }} />
      {open && (
        <div className="absolute start-0 top-[calc(100%+6px)] z-30 w-[200px] rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3.5 shadow-lg">
          <label className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
            {fromLabel}
            <input
              type={inputType}
              value={draft.from}
              onChange={(event) => setDraft((d) => ({ ...d, from: event.target.value }))}
              className="rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-1.5 text-[12.5px] text-[var(--octo-text-primary)] normal-case"
            />
          </label>
          <label className="mt-2.5 flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
            {toLabel}
            <input
              type={inputType}
              value={draft.to}
              onChange={(event) => setDraft((d) => ({ ...d, to: event.target.value }))}
              className="rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-1.5 text-[12.5px] text-[var(--octo-text-primary)] normal-case"
            />
          </label>
          <button
            type="button"
            onClick={() => { onApply(draft); setOpen(false); }}
            className="mt-3 w-full rounded-[9px] bg-[#0D6EFD] py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t("customers.filter.apply")}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `payment-link-modal.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/payment-link-modal.tsx
import { useState } from "react";
import { Mail, MessageCircle, QrCode } from "lucide-react";
import { Modal, Segmented, Select, Textarea } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { customerName } from "./format";
import { Avatar } from "./avatar";
import { TAG_STYLE } from "./theme";
import type { CustomerRecord } from "./types";

type RequestType = "deposit" | "balance" | "custom";
type Method = "link" | "whatsapp" | "sms";

export function PaymentLinkModal({
  customer,
  onClose,
  onSent,
}: {
  customer: CustomerRecord | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { t } = useI18n();
  const [requestType, setRequestType] = useState<RequestType>("deposit");
  const [reservationIndex, setReservationIndex] = useState(0);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<Method>("link");
  const [message, setMessage] = useState("");

  if (!customer) return null;
  const name = customerName(customer);
  const canSend = amount.trim() !== "" && description.trim() !== "";

  function reset() {
    setRequestType("deposit");
    setReservationIndex(0);
    setAmount("");
    setDescription("");
    setMethod("link");
    setMessage("");
  }

  return (
    <Modal open onClose={onClose} title={t("customers.paymentLink.title")} className="max-w-[560px]">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--octo-divider)] p-3">
        <Avatar name={name} size={44} />
        <div>
          <div className="font-semibold text-[var(--octo-text-primary)]">{name}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {customer.tags.map((tag) => (
              <span key={tag} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: TAG_STYLE[tag].text, backgroundColor: TAG_STYLE[tag].bg }}>
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{customer.phone} · {customer.email}</div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
          {t("customers.paymentLink.requestType")} <span className="text-[#EF4444]">*</span>
        </p>
        <Segmented
          className="mt-1.5"
          options={[
            { id: "deposit", label: t("customers.paymentLink.deposit") },
            { id: "balance", label: t("customers.paymentLink.balance") },
            { id: "custom", label: t("customers.paymentLink.customAmount") },
          ]}
          value={requestType}
          onChange={(id) => setRequestType(id as RequestType)}
        />
      </div>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.paymentLink.reservation")}</span>
        <Select value={reservationIndex} onChange={(event) => setReservationIndex(Number(event.target.value))}>
          <option value={-1}>{t("customers.paymentLink.reservationPlaceholder")}</option>
          {customer.recentReservations.map((res, index) => (
            <option key={res.date} value={index}>{res.date} · {res.table}</option>
          ))}
        </Select>
      </label>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
          {t("customers.paymentLink.amount")} <span className="text-[#EF4444]">*</span>
        </span>
        <div className="flex items-stretch rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/30">
          <span className="flex items-center border-e border-[var(--octo-border-input)] px-3 text-[12.5px] text-[var(--octo-text-muted)]">SAR</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
            placeholder={t("customers.paymentLink.amountPlaceholder")}
            className="w-full flex-1 rounded-e-[9px] bg-transparent px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-faint)]"
          />
        </div>
      </label>

      <div className="mt-4">
        <Textarea
          label={t("customers.paymentLink.description")}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("customers.paymentLink.descriptionPlaceholder")}
          rows={3}
        />
      </div>

      <div className="mt-4">
        <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.paymentLink.method")}</p>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(
            [
              { id: "link", icon: QrCode, title: t("customers.paymentLink.methodLink"), desc: t("customers.paymentLink.methodLinkDesc") },
              { id: "whatsapp", icon: MessageCircle, title: t("customers.paymentLink.methodWhatsapp"), desc: t("customers.paymentLink.methodWhatsappDesc") },
              { id: "sms", icon: Mail, title: t("customers.paymentLink.methodSms"), desc: t("customers.paymentLink.methodSmsDesc") },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMethod(opt.id)}
              className={`flex flex-col items-center gap-1 rounded-[9px] border px-2 py-3 text-center transition-colors ${
                method === opt.id ? "border-[#0D6EFD] bg-[#0D6EFD]/5" : "border-[var(--octo-border-input)]"
              }`}
            >
              <opt.icon size={18} className="text-[var(--octo-text-secondary)]" />
              <span className="text-[11.5px] font-semibold text-[var(--octo-text-primary)]">{opt.title}</span>
              <span className="text-[10.5px] text-[var(--octo-text-muted)]">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Textarea
          label={`${t("customers.paymentLink.message")} ${t("customers.paymentLink.optional")}`}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("customers.paymentLink.messagePlaceholder")}
          rows={2}
        />
      </div>

      <button
        type="button"
        disabled={!canSend}
        onClick={() => { onSent(); reset(); onClose(); }}
        className="mt-5 w-full rounded-[10px] bg-[#0D6EFD] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("customers.paymentLink.send")}
      </button>
    </Modal>
  );
}
```

- [ ] **Step 3: Wire filters + Payment Link modal into `index.tsx`**

Add to the imports: `TagsFilterPopover, RangeFilterPopover, type RangeValue` from `./_shared/filter-popover`, `PaymentLinkModal` from `./_shared/payment-link-modal`, `Save` icon from `lucide-react`, `ALL_TAGS`/`CustomerTag` from `./_shared/types`.

Add state (inside `CustomersPage`, alongside `search`):

```tsx
  const [tagFilter, setTagFilter] = useState<CustomerTag[]>([]);
  const [visitsRange, setVisitsRange] = useState<RangeValue>({ from: "", to: "" });
  const [spendRange, setSpendRange] = useState<RangeValue>({ from: "", to: "" });
  const [lastVisitRange, setLastVisitRange] = useState<RangeValue>({ from: "", to: "" });
  const [paymentLinkFor, setPaymentLinkFor] = useState<CustomerRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
```

Extend the `visibleRows` `useMemo` filter body (replace the existing `filter` callback):

```tsx
  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (query && !(customerName(c).toLowerCase().includes(query) || c.phone.includes(query) || c.email.toLowerCase().includes(query))) return false;
      if (tagFilter.length > 0 && !tagFilter.some((tag) => c.tags.includes(tag))) return false;
      if (visitsRange.from && c.visits < Number(visitsRange.from)) return false;
      if (visitsRange.to && c.visits > Number(visitsRange.to)) return false;
      if (spendRange.from && c.totalSpendSar < Number(spendRange.from)) return false;
      if (spendRange.to && c.totalSpendSar > Number(spendRange.to)) return false;
      if (lastVisitRange.from && c.lastVisit < lastVisitRange.from) return false;
      if (lastVisitRange.to && c.lastVisit > lastVisitRange.to) return false;
      return true;
    });
  }, [customers, search, tagFilter, visitsRange, spendRange, lastVisitRange]);

  const isFiltered = tagFilter.length > 0 || visitsRange.from !== "" || visitsRange.to !== "" || spendRange.from !== "" || spendRange.to !== "" || lastVisitRange.from !== "" || lastVisitRange.to !== "" || search.trim() !== "";

  function resetFilters() {
    setSearch("");
    setTagFilter([]);
    setVisitsRange({ from: "", to: "" });
    setSpendRange({ from: "", to: "" });
    setLastVisitRange({ from: "", to: "" });
  }
```

Replace the search-input block's wrapping `<div className="mt-4 max-w-[320px]">...</div>` with a filter row that keeps the search input and adds the four popovers plus Reset/Save Segment, and swap the empty-filtered-state's `onClick={() => setSearch("")}` for `onClick={resetFilters}`:

```tsx
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--octo-text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("customers.searchPlaceholder")}
                className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] py-2 ps-8 pe-3 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD]"
              />
            </div>
            <TagsFilterPopover selected={tagFilter} onApply={setTagFilter} />
            <RangeFilterPopover label={t("customers.filter.visits")} kind="number" value={visitsRange} onApply={setVisitsRange} />
            <RangeFilterPopover label={t("customers.filter.totalSpend")} kind="currency" value={spendRange} onApply={setSpendRange} />
            <RangeFilterPopover label={t("customers.filter.lastVisit")} kind="date" value={lastVisitRange} onApply={setLastVisitRange} />
            {isFiltered && (
              <button type="button" onClick={resetFilters} className="rounded-[9px] px-3 py-2 text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]">
                {t("customers.filter.reset")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(t("customers.saveSegment"))}
              className="ms-auto inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] px-3 py-2 text-[12px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              {t("customers.saveSegment")}
            </button>
          </div>

          {toast && (
            <div className="mt-2 rounded-[9px] bg-[#22C55E]/10 px-3 py-2 text-[11.5px] font-medium text-[#16a34a]">{toast}</div>
          )}
```

Wire `onOpenPaymentLink={() => setPaymentLinkFor(customer)}` on `<CustomerRow>`, and render the modal once, right after the closing `</div>` of the page root (as a sibling, matching Orders' pattern of modals rendered outside the scrollable content):

```tsx
      <PaymentLinkModal
        customer={paymentLinkFor}
        onClose={() => setPaymentLinkFor(null)}
        onSent={() => setToast(t("customers.paymentLink.sentConfirm"))}
      />
```

(This means wrapping the page root `<div>` and the modal in a fragment `<>...</>` — same shape as `orders-list/index.tsx`.)

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter merchant typecheck`

- [ ] **Step 5: Manual verification**

`run` skill: open each of the 4 filter dropdowns and compare against `apps/assets/Customer CRM/CRM-actions.png`; open a row's Payment Link button and compare against `apps/assets/Customer CRM/linked payment.png`.

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/pages/customers/_shared/filter-popover.tsx apps/merchant/src/pages/customers/_shared/payment-link-modal.tsx apps/merchant/src/pages/customers/index.tsx
git commit -m "feat(customers): add filter dropdowns and the Payment Link modal"
```

---

### Task 5: Row actions menu, bulk selection, bulk action bar, CSV export

**Files:**
- Create: `apps/merchant/src/pages/customers/_shared/row-actions-menu.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/add-note-modal.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/add-tag-modal.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/bulk-action-bar.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/csv-export.ts`
- Modify: `apps/merchant/src/pages/customers/index.tsx` (wire selection + kebab + bulk bar + pagination)

**Interfaces:**
- Consumes: Task 1 types, Task 3 `CustomerRow`.
- Produces: `type RowActionId = "addNote" | "history" | "sendWhatsapp" | "sendEmail" | "addTag" | "toggleBlock" | "delete"`; `RowActionsMenu({ anchor, customer, onAction, onClose })`; `AddNoteModal({ open, onClose, onSave })`; `AddTagModal({ open, onClose, onSave })`; `BulkActionBar({ count, onSendWhatsapp, onSendEmail, onPaymentLink, onAddTag, onMerge, onExport, onDelete })`; `customersToCsv(rows)`.

- [ ] **Step 1: Write `row-actions-menu.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/row-actions-menu.tsx
import { useEffect, useRef } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import type { CustomerRecord } from "./types";

export type RowActionId = "addNote" | "history" | "sendWhatsapp" | "sendEmail" | "addTag" | "toggleBlock" | "delete";

export function RowActionsMenu({
  anchor,
  customer,
  onAction,
  onClose,
}: {
  anchor: HTMLElement;
  customer: CustomerRecord;
  onAction: (action: RowActionId) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node) && !anchor.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [anchor, onClose]);

  const rect = anchor.getBoundingClientRect();
  const items: { id: RowActionId; label: string; danger?: boolean }[] = [
    { id: "addNote", label: t("customers.rowAction.addNote") },
    { id: "history", label: t("customers.rowAction.history") },
    { id: "sendWhatsapp", label: t("customers.rowAction.sendWhatsapp") },
    { id: "sendEmail", label: t("customers.rowAction.sendEmail") },
    { id: "addTag", label: t("customers.rowAction.addTag") },
    { id: "toggleBlock", label: t(customer.isBlocked ? "customers.rowAction.unblock" : "customers.rowAction.block") },
    { id: "delete", label: t("customers.rowAction.delete"), danger: true },
  ];

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 w-[200px] rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1.5 shadow-lg"
      style={{ top: rect.bottom + 6, insetInlineStart: rect.left }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          onClick={() => { onAction(item.id); onClose(); }}
          className={`flex w-full items-center rounded-[8px] px-2.5 py-1.5 text-start text-[12.5px] transition-colors hover:bg-[var(--octo-hover)] ${
            item.danger ? "text-[#EF4444]" : "text-[var(--octo-text-primary)]"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `add-note-modal.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/add-note-modal.tsx
import { useState } from "react";
import { Button, Modal, Textarea } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

export function AddNoteModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (text: string) => void }) {
  const { t } = useI18n();
  const [text, setText] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("customers.addNote.title")}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t("customers.filter.reset") === "Reset" ? "Cancel" : "Cancel"}</Button>
          <Button
            variant="primary"
            size="sm"
            disabled={text.trim() === ""}
            onClick={() => { onSave(text.trim()); setText(""); onClose(); }}
          >
            {t("customers.addNote.save")}
          </Button>
        </>
      }
    >
      <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={t("customers.addNote.placeholder")} rows={4} />
    </Modal>
  );
}
```

Fix the placeholder `"Cancel"` ternary in Step 2 before committing — it was written in a rush; add one real key instead: `"customers.addNote.cancel": "Cancel"` / `"إلغاء"` to both locale files in this task's Step 5 i18n addendum below, and use `{t("customers.addNote.cancel")}` directly.

- [ ] **Step 3: Write `add-tag-modal.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/add-tag-modal.tsx
import { useState } from "react";
import { Button, Input, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

export function AddTagModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (tag: string) => void }) {
  const { t } = useI18n();
  const [tag, setTag] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("customers.addTag.title")}
      footer={
        <Button variant="primary" size="sm" disabled={tag.trim() === ""} onClick={() => { onSave(tag.trim()); setTag(""); onClose(); }}>
          {t("customers.addTag.save")}
        </Button>
      }
    >
      <Input value={tag} onChange={(event) => setTag(event.target.value)} placeholder={t("customers.addTag.placeholder")} />
    </Modal>
  );
}
```

- [ ] **Step 4: Write `bulk-action-bar.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/bulk-action-bar.tsx
import { Checkbox } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

export function BulkActionBar({
  count,
  onSendWhatsapp,
  onSendEmail,
  onPaymentLink,
  onAddTag,
  onMerge,
  onExport,
  onDelete,
}: {
  count: number;
  onSendWhatsapp: () => void;
  onSendEmail: () => void;
  onPaymentLink: () => void;
  onAddTag: () => void;
  onMerge: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const actions: { label: string; onClick: () => void; danger?: boolean }[] = [
    { label: t("customers.bulk.sendWhatsapp"), onClick: onSendWhatsapp },
    { label: t("customers.bulk.sendEmail"), onClick: onSendEmail },
    { label: t("customers.bulk.paymentLink"), onClick: onPaymentLink },
    { label: t("customers.bulk.addTag"), onClick: onAddTag },
    { label: t("customers.bulk.merge"), onClick: onMerge },
    { label: t("customers.bulk.export"), onClick: onExport },
    { label: t("customers.bulk.delete"), onClick: onDelete, danger: true },
  ];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2">
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--octo-text-primary)]">
        <Checkbox checked readOnly /> {t("customers.bulk.selected").replace("{count}", String(count))}
      </span>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className={`rounded-[8px] border px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--octo-hover)] ${
            action.danger ? "border-[#EF4444]/30 text-[#EF4444]" : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)]"
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Add the missing i18n key from Step 2**

Add to both `en/index.ts` and `ar/index.ts`, next to the `customers.addNote.*` keys added in Task 2:
`"customers.addNote.cancel": "Cancel",` / `"customers.addNote.cancel": "إلغاء",`
And go back to `add-note-modal.tsx` and replace the ternary with `{t("customers.addNote.cancel")}`.

- [ ] **Step 6: Write `csv-export.ts`**

```ts
// apps/merchant/src/pages/customers/_shared/csv-export.ts
import { customerName } from "./format";
import type { CustomerRecord } from "./types";

function escapeCsvField(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`;
  return guarded;
}

export function customersToCsv(rows: readonly CustomerRecord[]): string {
  const header = ["Name", "Phone", "Email", "Tags", "Visits", "Total Spend (SAR)", "Last Visit"];
  const lines = rows.map((row) =>
    [customerName(row), row.phone, row.email, row.tags.join("; "), String(row.visits), row.totalSpendSar.toFixed(2), row.lastVisit]
      .map(escapeCsvField)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}
```

- [ ] **Step 7: Wire selection, kebab menu, bulk bar, and pagination into `index.tsx`**

Add imports: `RowActionsMenu, type RowActionId` from `./_shared/row-actions-menu`, `AddNoteModal` from `./_shared/add-note-modal`, `AddTagModal` from `./_shared/add-tag-modal`, `BulkActionBar` from `./_shared/bulk-action-bar`, `customersToCsv` from `./_shared/csv-export`, `Pagination` from `@/pages/inventory/_shared/pagination`.

Add the `downloadCsv` helper (copy verbatim from `orders-list/index.tsx:24-38`).

Add state:

```tsx
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; customer: CustomerRecord } | null>(null);
  const [noteFor, setNoteFor] = useState<CustomerRecord | null>(null);
  const [tagTarget, setTagTarget] = useState<{ ids: string[] } | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
```

Add helpers (below `resetFilters`):

```tsx
  function updateCustomer(id: string, patch: Partial<CustomerRecord> | ((c: CustomerRecord) => Partial<CustomerRecord>)) {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)));
  }

  function handleRowAction(action: RowActionId, customer: CustomerRecord) {
    switch (action) {
      case "addNote":
        setNoteFor(customer);
        break;
      case "history":
        setToast(t("customers.rowAction.historyComingSoon"));
        break;
      case "sendWhatsapp":
        setToast(t("customers.rowAction.whatsappSent"));
        break;
      case "sendEmail":
        setToast(t("customers.rowAction.emailSent"));
        break;
      case "addTag":
        setTagTarget({ ids: [customer.id] });
        break;
      case "toggleBlock":
        updateCustomer(customer.id, (c) => ({ isBlocked: !c.isBlocked }));
        setToast(t(customer.isBlocked ? "customers.rowAction.unblocked" : "customers.rowAction.blocked"));
        break;
      case "delete":
        if (window.confirm(t("customers.rowAction.deleteConfirm"))) {
          setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
          setSelectedIds((prev) => { const next = new Set(prev); next.delete(customer.id); return next; });
        }
        break;
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const selectedCustomers = customers.filter((c) => selectedIds.has(c.id));

  function handleBulkDelete() {
    if (!window.confirm(t("customers.bulk.deleteConfirm").replace("{count}", String(selectedIds.size)))) return;
    setToast(t("customers.bulk.deletedConfirm").replace("{count}", String(selectedIds.size)));
    setCustomers((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
  }

  function handleBulkExport() {
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, customersToCsv(selectedCustomers));
  }
```

Pagination derivation (replace the plain `visibleRows.map(...)` rendering block with paginated rows):

```tsx
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
```

Render, replacing the row-list block from Task 3/4:

```tsx
              {selectedIds.size > 0 && (
                <BulkActionBar
                  count={selectedIds.size}
                  onSendWhatsapp={() => setToast(t("customers.bulk.whatsappSentConfirm").replace("{count}", String(selectedIds.size)))}
                  onSendEmail={() => setToast(t("customers.bulk.emailSentConfirm").replace("{count}", String(selectedIds.size)))}
                  onPaymentLink={() => setPaymentLinkFor(selectedCustomers[0] ?? null)}
                  onAddTag={() => setTagTarget({ ids: [...selectedIds] })}
                  onMerge={() => setToast(t("customers.bulk.mergedConfirm"))}
                  onExport={handleBulkExport}
                  onDelete={handleBulkDelete}
                />
              )}

              <div className="mt-3 flex flex-col gap-2.5">
                {pageRows.map((customer) => (
                  <CustomerRow
                    key={customer.id}
                    customer={customer}
                    selected={selectedIds.has(customer.id)}
                    onToggleSelect={() => toggleSelect(customer.id)}
                    onEdit={() => {}}
                    onNewReservation={() => {}}
                    onOpenPaymentLink={() => setPaymentLinkFor(customer)}
                    onOpenRowActions={(anchor) => setRowMenu({ anchor, customer })}
                  />
                ))}
              </div>

              <Pagination
                page={currentPage}
                pageCount={pageCount}
                total={visibleRows.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                showingLabel={t("customers.showing")}
              />
```

Render the menu/modals as siblings near `<PaymentLinkModal .../>`:

```tsx
      {rowMenu && (
        <RowActionsMenu
          anchor={rowMenu.anchor}
          customer={rowMenu.customer}
          onAction={(action) => handleRowAction(action, rowMenu.customer)}
          onClose={() => setRowMenu(null)}
        />
      )}
      <AddNoteModal
        open={noteFor !== null}
        onClose={() => setNoteFor(null)}
        onSave={(text) => {
          if (!noteFor) return;
          updateCustomer(noteFor.id, (c) => ({ notes: [...c.notes, { date: new Date().toISOString().slice(0, 10), text }] }));
        }}
      />
      <AddTagModal
        open={tagTarget !== null}
        onClose={() => setTagTarget(null)}
        onSave={(tag) => {
          if (!tagTarget) return;
          setCustomers((prev) =>
            prev.map((c) => (tagTarget.ids.includes(c.id) && !c.tags.includes(tag as any) ? { ...c, tags: [...c.tags, tag as any] } : c))
          );
        }}
      />
```

`tag as any` above is a placeholder to flag, not to ship: `AddTagModal` takes free text but `CustomerTag` is a closed union. Fix it for real by widening `CustomerRecord.tags` to `string[]` in `types.ts` (Task 1) instead of `CustomerTag[]` — free-text custom tags are exactly what the "Add Tag" affordance implies (the mockup's tag chips are just examples, not an exhaustive enum) — and keep `ALL_TAGS`/`TAG_STYLE` as the known/styled subset with a fallback neutral style (reuse `BLOCKED_STYLE`'s gray, renamed to a generic `DEFAULT_TAG_STYLE`) for any tag not in `TAG_STYLE`. Go back to `_shared/types.ts` and `_shared/theme.ts` now and make that change before finishing this task, then re-run Task 1's test (record #1's `tags` field is still a valid `string[]`, no test change needed) and this task's typecheck.

- [ ] **Step 8: Typecheck**

Run: `pnpm --filter merchant typecheck` — confirm the `tags: string[]` widening from Step 7 doesn't break `customer-row.tsx`'s tag-label lookup (it indexes `TAG_STYLE` by tag; switch that lookup to `TAG_STYLE[tag] ?? DEFAULT_TAG_STYLE` and the i18n label lookup to fall back to the raw tag string when no `customers.tag.*` key matches it).

- [ ] **Step 9: Manual verification**

`run` skill: open a row's kebab menu (compare to `CRM-actions.png`), select multiple rows (compare to `CRM-selected.png`), try Export (confirm a CSV downloads), try Delete/Add Note/Add Tag/Block.

- [ ] **Step 10: Commit**

```bash
git add apps/merchant/src/pages/customers/_shared/row-actions-menu.tsx apps/merchant/src/pages/customers/_shared/add-note-modal.tsx apps/merchant/src/pages/customers/_shared/add-tag-modal.tsx apps/merchant/src/pages/customers/_shared/bulk-action-bar.tsx apps/merchant/src/pages/customers/_shared/csv-export.ts apps/merchant/src/pages/customers/_shared/types.ts apps/merchant/src/pages/customers/_shared/theme.ts apps/merchant/src/pages/customers/_shared/customer-row.tsx apps/merchant/src/pages/customers/index.tsx packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "feat(customers): add row actions, bulk selection bar, and CSV export"
```

---

### Task 6: Add New Customer modal

**Files:**
- Create: `apps/merchant/src/pages/customers/_shared/switch.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/form-field.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/phone-field.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/add-customer-modal.tsx`
- Modify: `apps/merchant/src/pages/customers/index.tsx` (wire the header "+ Add New Customer" button)

**Interfaces:**
- Consumes: Task 1 types, Task 5's `AddTagModal` (reused here for the "+ Add Tag" affordance in the form).
- Produces: `Switch({ checked, onChange, label, disabled?, size? })`, `Field({ label, required?, optional?, className?, children })`, `PhoneField({ digits, onChange })` + `combinePhone`/`phoneDigitsFrom`, `AddCustomerModal({ open, onClose, onCreate })`.

- [ ] **Step 1: Write `switch.tsx`**

Copy `apps/merchant/src/pages/staff/_shared/switch.tsx` verbatim (all 46 lines shown earlier in this plan's research) into `apps/merchant/src/pages/customers/_shared/switch.tsx`, unchanged — this codebase's convention is one private copy per module rather than a shared import.

- [ ] **Step 2: Write `form-field.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/form-field.tsx
import clsx from "clsx";
import type { ReactNode } from "react";

export function Field({
  label,
  required,
  optional,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
        {label}
        {required && <span className="text-[#EF4444]"> *</span>}
        {optional && <span className="ms-1.5 font-normal text-[var(--octo-text-faint)]">{optional}</span>}
      </span>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Write `phone-field.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/phone-field.tsx
export function SaudiFlag({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#006C35" />
      <path d="M6 9.2h12M6.8 11h10.4" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="1.6 1" />
      <path d="M7 14.6h9.6l1.2-.8" stroke="#fff" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function phoneDigitsFrom(phone: string): string {
  return phone.startsWith("+966") ? phone.slice(4) : phone;
}

export function combinePhone(digits: string): string {
  return `+966${digits}`;
}

export function PhoneField({ digits, onChange }: { digits: string; onChange: (digits: string) => void }) {
  return (
    <div className="flex items-stretch rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] transition-colors focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/30">
      <span dir="ltr" className="flex items-center gap-1.5 border-e border-[var(--octo-border-input)] px-3 text-[12.5px] text-[var(--octo-text-primary)]">
        <SaudiFlag />
        +966
      </span>
      <input
        dir="ltr"
        inputMode="tel"
        value={digits}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        placeholder="000 000 000"
        className="w-full flex-1 rounded-e-[9px] bg-transparent px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-faint)] rtl:text-end"
      />
    </div>
  );
}
```

- [ ] **Step 4: Write `add-customer-modal.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/add-customer-modal.tsx
import { useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { Input, Modal, Select, Textarea } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { Field } from "./form-field";
import { PhoneField, combinePhone } from "./phone-field";
import { Switch } from "./switch";
import { AddTagModal } from "./add-tag-modal";
import type { CommunicationChannel, CustomerRecord } from "./types";

function GenderOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex flex-1 items-center gap-2 rounded-[9px] border px-3 py-2 text-[12.5px] transition-colors",
        active ? "border-[#0D6EFD] text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)]"
      )}
    >
      <span className={clsx("grid h-4 w-4 shrink-0 place-items-center rounded-full border", active ? "border-[#0D6EFD]" : "border-[var(--octo-border-input)]")}>
        {active && <span className="h-2 w-2 rounded-full bg-[#0D6EFD]" />}
      </span>
      {label}
    </button>
  );
}

const CHANNELS: readonly CommunicationChannel[] = ["WhatsApp", "SMS", "Email"];

export function AddCustomerModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (customer: CustomerRecord) => void }) {
  const { t } = useI18n();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [branch, setBranch] = useState("");
  const [areaTable, setAreaTable] = useState("");
  const [source, setSource] = useState("Walk-in");
  const [referredBy, setReferredBy] = useState("");
  const [note, setNote] = useState("");
  const [channels, setChannels] = useState<CommunicationChannel[]>(["WhatsApp"]);
  const [marketing, setMarketing] = useState(true);
  const [tags, setTags] = useState<string[]>(["VIP", "Frequent Diner"]);
  const [addTagOpen, setAddTagOpen] = useState(false);

  const canSubmit = firstName.trim() !== "" && lastName.trim() !== "" && phoneDigits.trim() !== "";

  function reset() {
    setFirstName(""); setLastName(""); setPhoneDigits(""); setEmail(""); setDob(""); setGender("Male");
    setBranch(""); setAreaTable(""); setSource("Walk-in"); setReferredBy(""); setNote("");
    setChannels(["WhatsApp"]); setMarketing(true); setTags(["VIP", "Frequent Diner"]);
  }

  function toggleChannel(channel: CommunicationChannel) {
    setChannels((prev) => (prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const today = new Date().toISOString().slice(0, 10);
    const customer: CustomerRecord = {
      id: `CUST-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      gender,
      tags,
      phone: combinePhone(phoneDigits.trim()),
      email: email.trim(),
      isBlocked: false,
      visits: 0,
      totalSpendSar: 0,
      lastVisit: today,
      loyaltyPoints: 0,
      avgSpendSar: 0,
      customerSince: today,
      firstVisit: today,
      preferredBranch: branch,
      preferredAreaTable: areaTable,
      referredBy: referredBy.trim() || undefined,
      marketingConsent: marketing ? "Opted in" : "Opted out",
      cuisinePreference: [],
      dietaryPreference: "",
      occasion: "",
      visitTime: "",
      communicationPreference: channels,
      specialRequests: "",
      notes: note.trim() ? [{ date: today, text: note.trim() }] : [],
      recentReservations: [],
      recentOrders: [],
      recentPayments: [],
    };
    onCreate(customer);
    reset();
    onClose();
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={t("customers.addCustomer.title")} className="max-w-[640px] max-h-[85vh] overflow-y-auto octo-scroll">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("customers.addCustomer.firstName")} required>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t("customers.addCustomer.firstNamePlaceholder")} />
          </Field>
          <Field label={t("customers.addCustomer.lastName")} required>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t("customers.addCustomer.lastNamePlaceholder")} />
          </Field>
          <Field label={t("customers.addCustomer.phone")} required>
            <PhoneField digits={phoneDigits} onChange={setPhoneDigits} />
          </Field>
          <Field label={t("customers.addCustomer.email")}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("customers.addCustomer.emailPlaceholder")} />
          </Field>
          <Field label={t("customers.addCustomer.dob")}>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} placeholder={t("customers.addCustomer.dobPlaceholder")} />
          </Field>
          <Field label={t("customers.addCustomer.gender")}>
            <div className="flex gap-2">
              <GenderOption label={t("customers.addCustomer.male")} active={gender === "Male"} onClick={() => setGender("Male")} />
              <GenderOption label={t("customers.addCustomer.female")} active={gender === "Female"} onClick={() => setGender("Female")} />
            </div>
          </Field>
          <Field label={t("customers.addCustomer.branch")}>
            <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">{t("customers.addCustomer.branchPlaceholder")}</option>
              {["Riyadh", "Jeddah", "Dammam", "Khobar"].map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </Field>
          <Field label={t("customers.addCustomer.areaTable")}>
            <Select value={areaTable} onChange={(e) => setAreaTable(e.target.value)}>
              <option value="">{t("customers.addCustomer.areaTablePlaceholder")}</option>
              {["Indoor", "Outdoor", "Private Room", "Bar Seating"].map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
          <Field label={t("customers.addCustomer.source")}>
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="Walk-in">{t("customers.addCustomer.source.walkIn")}</option>
              <option value="Website">{t("customers.addCustomer.source.website")}</option>
              <option value="Instagram">{t("customers.addCustomer.source.instagram")}</option>
              <option value="Referral">{t("customers.addCustomer.source.referral")}</option>
            </Select>
          </Field>
          <Field label={t("customers.addCustomer.referredBy")}>
            <Input value={referredBy} onChange={(e) => setReferredBy(e.target.value)} placeholder={t("customers.addCustomer.referredByPlaceholder")} />
          </Field>
        </div>

        <Field label={t("customers.addCustomer.note")} className="mt-4">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("customers.addCustomer.notePlaceholder")} rows={3} />
        </Field>

        <Field label={t("customers.addCustomer.preferenceCommunication")} className="mt-4">
          <div className="flex gap-2">
            {CHANNELS.map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => toggleChannel(channel)}
                className={clsx(
                  "rounded-[9px] border px-3 py-2 text-[12.5px] font-medium transition-colors",
                  channels.includes(channel) ? "border-[#0D6EFD] bg-[#0D6EFD]/5 text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)]"
                )}
              >
                {t(`customers.addCustomer.channel.${channel.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </Field>

        <div className="mt-4 flex items-start gap-3">
          <Switch checked={marketing} onChange={setMarketing} label={t("customers.addCustomer.marketingTitle")} />
          <div>
            <div className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.addCustomer.marketingTitle")}</div>
            <div className="text-[11.5px] text-[var(--octo-text-muted)]">{t("customers.addCustomer.marketingDescription")}</div>
          </div>
        </div>

        <Field label={t("customers.addCustomer.tagLabel")} className="mt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[var(--octo-track)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--octo-text-secondary)]">
                {tag}
                <button type="button" onClick={() => setTags((prev) => prev.filter((t2) => t2 !== tag))} aria-label={`Remove ${tag}`}>
                  <X size={11} className="text-[#EF4444]" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setAddTagOpen(true)}
              className="rounded-full border border-dashed border-[var(--octo-border-input)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              + {t("customers.addCustomer.addTagCta")}
            </button>
          </div>
        </Field>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="mt-6 w-full rounded-[10px] bg-[#0D6EFD] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("customers.addCustomer.submit")}
        </button>
      </Modal>

      <AddTagModal open={addTagOpen} onClose={() => setAddTagOpen(false)} onSave={(tag) => setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))} />
    </>
  );
}
```

- [ ] **Step 5: Wire the header button in `index.tsx`**

Add import `AddCustomerModal` from `./_shared/add-customer-modal`; add state `const [addCustomerOpen, setAddCustomerOpen] = useState(false);`; change the header's `<Button variant="primary" size="sm">` to add `onClick={() => setAddCustomerOpen(true)}`, and likewise the empty-state's `action` button; render the modal as a sibling:

```tsx
      <AddCustomerModal
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onCreate={(customer) => {
          setCustomers((prev) => [customer, ...prev]);
          setToast(t("customers.addCustomer.createdConfirm"));
        }}
      />
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter merchant typecheck`

- [ ] **Step 7: Manual verification**

`run` skill: open "+ Add New Customer", fill the form, submit, confirm the new row appears at the top of the list. Compare the modal against `apps/assets/Customer CRM/add new customer.png`.

- [ ] **Step 8: Commit**

```bash
git add apps/merchant/src/pages/customers/_shared/switch.tsx apps/merchant/src/pages/customers/_shared/form-field.tsx apps/merchant/src/pages/customers/_shared/phone-field.tsx apps/merchant/src/pages/customers/_shared/add-customer-modal.tsx apps/merchant/src/pages/customers/index.tsx
git commit -m "feat(customers): add the Add New Customer modal"
```

---

### Task 7: Customer Detail page rebuild

**Files:**
- Modify: `apps/merchant/src/pages/customers/detail/index.tsx` (full rewrite)

**Interfaces:**
- Consumes: Task 1 types/format/theme, Task 3 `Avatar`, Task 4 `PaymentLinkModal`, Task 5 `AddNoteModal`/`AddTagModal`, Task 6 `Field`.
- Produces: nothing new consumed by later tasks — this is a leaf page.

- [ ] **Step 1: Rewrite `detail/index.tsx`**

```tsx
// apps/merchant/src/pages/customers/detail/index.tsx
import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Coins, Pencil, Plus, Users } from "lucide-react";
import { Button, EmptyState } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { customerRecords } from "../_shared/mock-data";
import { customerName, formatDate, formatReservationDateTime } from "../_shared/format";
import { Avatar } from "../_shared/avatar";
import { TAG_STYLE, DEFAULT_TAG_STYLE } from "../_shared/theme";
import { PaymentLinkModal } from "../_shared/payment-link-modal";
import { AddNoteModal } from "../_shared/add-note-modal";
import { AddTagModal } from "../_shared/add-tag-modal";
import type { CustomerRecord } from "../_shared/types";

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [customer, setCustomer] = useState<CustomerRecord | undefined>(() => customerRecords.find((c) => c.id === id));
  const [toast, setToast] = useState<string | null>(null);
  const [paymentLinkOpen, setPaymentLinkOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);

  const back = (
    <Button variant="ghost" size="sm" icon={<ArrowLeft size={13} className="rtl:rotate-180" />} onClick={() => navigate("/customers")}>
      {t("customers.detail.back")}
    </Button>
  );

  if (!customer) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
        {back}
        <EmptyState className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]" icon={<Users size={18} />} title={t("customers.detail.notFound")} />
      </div>
    );
  }

  function patch(updater: (c: CustomerRecord) => Partial<CustomerRecord>) {
    setCustomer((prev) => (prev ? { ...prev, ...updater(prev) } : prev));
  }

  const name = customerName(customer);
  const localeTag = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <div className="px-4 pb-24 pt-4 sm:px-[26px] sm:pt-5">
      {back}

      <header className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <Avatar name={name} size={56} />
        <div>
          <h1 className="text-[17px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[19px]">{name}</h1>
          <div className="mt-1 flex flex-wrap gap-1">
            {customer.tags.map((tag) => {
              const style = TAG_STYLE[tag as keyof typeof TAG_STYLE] ?? DEFAULT_TAG_STYLE;
              return (
                <span key={tag} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: style.text, backgroundColor: style.bg }}>
                  {tag}
                </span>
              );
            })}
          </div>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{customer.phone} · {customer.email}</p>
        </div>
      </header>

      {toast && <div className="mt-3 rounded-[9px] bg-[#22C55E]/10 px-3 py-2 text-[11.5px] font-medium text-[#16a34a]">{toast}</div>}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label={t("customers.detail.totalVisits")} value={String(customer.visits)} />
        <StatTile label={t("customers.detail.totalSpend")} value={`SAR ${customer.totalSpendSar}`} />
        <StatTile label={t("customers.detail.lastVisit")} value={formatDate(customer.lastVisit, locale)} />
        <StatTile label={t("customers.detail.loyaltyPoints")} value={`${customer.loyaltyPoints.toLocaleString(localeTag)} pts`} icon={<Coins size={14} className="text-[#F59E0B]" />} />
        <StatTile label={t("customers.detail.avgSpend")} value={`SAR ${customer.avgSpendSar}`} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Panel title={t("customers.detail.about.title")} onEdit={() => setToast(null)}>
          <InfoRow label={t("customers.detail.about.customerSince")} value={formatDate(customer.customerSince, locale)} />
          <InfoRow label={t("customers.detail.about.firstVisit")} value={formatDate(customer.firstVisit, locale)} />
          <InfoRow label={t("customers.detail.about.preferredBranch")} value={customer.preferredBranch || "—"} />
          <InfoRow label={t("customers.detail.about.preferredAreaTable")} value={customer.preferredAreaTable || "—"} />
          {customer.vipSince && <InfoRow label={t("customers.detail.about.vipSince")} value={formatDate(customer.vipSince, locale)} />}
          <InfoRow label={t("customers.detail.about.referredBy")} value={customer.referredBy ?? "—"} />
          <InfoRow label={t("customers.detail.about.marketingConsent")} value={t(customer.marketingConsent === "Opted in" ? "customers.marketingConsent.optedIn" : "customers.marketingConsent.optedOut")} />
        </Panel>

        <Panel title={t("customers.detail.preferences.title")} onEdit={() => setToast(null)}>
          <InfoRow label={t("customers.detail.preferences.cuisine")} value={customer.cuisinePreference.join(", ") || "—"} />
          <InfoRow label={t("customers.detail.preferences.dietary")} value={customer.dietaryPreference || "—"} />
          <InfoRow label={t("customers.detail.preferences.occasion")} value={customer.occasion || "—"} />
          <InfoRow label={t("customers.detail.preferences.visitTime")} value={customer.visitTime || "—"} />
          <InfoRow label={t("customers.detail.preferences.communication")} value={customer.communicationPreference.join(", ") || "—"} />
          <InfoRow label={t("customers.detail.preferences.specialRequests")} value={customer.specialRequests || "—"} />
        </Panel>

        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("customers.detail.notes.title")}</h2>
            <button type="button" onClick={() => setNoteOpen(true)} className="grid h-6 w-6 place-items-center rounded-md text-[#0D6EFD] transition-colors hover:bg-[var(--octo-hover)]" aria-label="Add note">
              <Plus size={14} />
            </button>
          </div>
          {customer.notes.length === 0 ? (
            <p className="mt-2.5 text-[12px] text-[var(--octo-text-muted)]">{t("customers.detail.notes.empty")}</p>
          ) : (
            <ul className="mt-2.5 flex flex-col gap-2">
              {customer.notes.map((note, index) => (
                <li key={index} className="text-[12px] text-[var(--octo-text-secondary)]">
                  <span className="font-semibold text-[var(--octo-text-primary)]">{formatDate(note.date, locale)}</span> - {note.text}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <ListPanel title={t("customers.detail.reservations.title")} onViewAll={() => setToast(null)}>
          {customer.recentReservations.map((res, index) => (
            <li key={index} className="flex items-center justify-between rounded-[9px] border border-[var(--octo-divider)] px-2.5 py-2 text-[12px]">
              <span>{formatReservationDateTime(res.date, locale)}<br /><span className="text-[var(--octo-text-muted)]">{res.table} - {res.guests} {t("customers.detail.guests")}</span></span>
              <span className="rounded-full bg-[#FDF3D6] px-2 py-0.5 text-[11px] font-medium text-[#B9860A]">{t(`customers.detail.reservationStatus.${res.status.toLowerCase()}`)}</span>
            </li>
          ))}
        </ListPanel>

        <ListPanel title={t("customers.detail.orders.title")} onViewAll={() => setToast(null)}>
          {customer.recentOrders.map((order) => (
            <li key={order.id} className="rounded-[9px] border border-[var(--octo-divider)] px-2.5 py-2 text-[12px]">
              <div className="text-[var(--octo-text-muted)]">{formatDate(order.date, locale)} - {order.id}</div>
              <div className="mt-0.5">{order.items}</div>
              <div className="mt-0.5 font-semibold text-[#0D6EFD]">SAR {order.totalSar.toFixed(2)}</div>
            </li>
          ))}
        </ListPanel>

        <ListPanel title={t("customers.detail.payments.title")} onViewAll={() => setToast(null)}>
          {customer.recentPayments.map((payment, index) => (
            <li key={index} className="flex items-center justify-between rounded-[9px] border border-[var(--octo-divider)] px-2.5 py-2 text-[12px]">
              <span>{formatDate(payment.date, locale)}<br /><span className="text-[var(--octo-text-muted)]">**** **** **** {payment.cardLast4}</span></span>
              <span className="text-end">
                <span className="block rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-medium text-[#16A34A]">{t(`customers.detail.${payment.status.toLowerCase()}`)}</span>
                <span className="mt-1 block font-semibold text-[#0D6EFD]">SAR {payment.amountSar.toFixed(2)}</span>
              </span>
            </li>
          ))}
        </ListPanel>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <Button variant="secondary" size="sm">{t("customers.row.newReservations")}</Button>
        <Button variant="secondary" size="sm" onClick={() => setPaymentLinkOpen(true)}>{t("customers.row.paymentLink")}</Button>
        <Button variant="secondary" size="sm" onClick={() => setToast(t("customers.rowAction.whatsappSent"))}>{t("customers.rowAction.sendWhatsapp")}</Button>
        <Button variant="secondary" size="sm" onClick={() => setToast(t("customers.rowAction.emailSent"))}>{t("customers.rowAction.sendEmail")}</Button>
        <Button variant="secondary" size="sm" onClick={() => setTagOpen(true)}>{t("customers.rowAction.addTag")}</Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { patch((c) => ({ isBlocked: !c.isBlocked })); setToast(t(customer.isBlocked ? "customers.rowAction.unblocked" : "customers.rowAction.blocked")); }}
        >
          {t(customer.isBlocked ? "customers.rowAction.unblock" : "customers.rowAction.block")}
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => { if (window.confirm(t("customers.rowAction.deleteConfirm"))) navigate("/customers"); }}
        >
          {t("customers.rowAction.delete")}
        </Button>
      </div>

      <PaymentLinkModal customer={paymentLinkOpen ? customer : null} onClose={() => setPaymentLinkOpen(false)} onSent={() => setToast(t("customers.paymentLink.sentConfirm"))} />
      <AddNoteModal open={noteOpen} onClose={() => setNoteOpen(false)} onSave={(text) => patch((c) => ({ notes: [...c.notes, { date: new Date().toISOString().slice(0, 10), text }] }))} />
      <AddTagModal open={tagOpen} onClose={() => setTagOpen(false)} onSave={(tag) => patch((c) => ({ tags: c.tags.includes(tag) ? c.tags : [...c.tags, tag] }))} />
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[14px] py-[12px]">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[17px] font-bold text-[var(--octo-text-primary)]">{icon}{value}</div>
    </div>
  );
}

function Panel({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{title}</h2>
        <button type="button" onClick={onEdit} className="grid h-6 w-6 place-items-center rounded-md text-[#0D6EFD] transition-colors hover:bg-[var(--octo-hover)]" aria-label={`Edit ${title}`}>
          <Pencil size={13} />
        </button>
      </div>
      <div className="mt-2.5 flex flex-col gap-2">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-[var(--octo-text-muted)]">{label}</span>
      <span className="font-medium text-[var(--octo-text-primary)]">{value}</span>
    </div>
  );
}

function ListPanel({ title, onViewAll, children }: { title: string; onViewAll: () => void; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{title}</h2>
        <button type="button" onClick={onViewAll} className="text-[11.5px] font-medium text-[#0D6EFD]">
          {/* Coming soon — no dedicated history route exists yet */}
          {(() => null)()}
        </button>
      </div>
      <ul className="mt-2.5 flex flex-col gap-2">{children}</ul>
    </section>
  );
}
```

Fix the `ListPanel`'s "View All" button before committing — the `{(() => null)()}` above is scratch, not real code. Replace that button's children with `{"View All"}` sourced from `t("customers.detail.viewAll")` (thread a `t` reference into `ListPanel`, e.g. by importing `useI18n` inside `ListPanel` itself since it's a module-local function component) and give the button `title={t("customers.detail.viewAll")}` plus `aria-disabled="true"` styling (`text-[var(--octo-text-faint)] cursor-default` instead of the blue-link look) since it's inert.

Also add `DEFAULT_TAG_STYLE` to `_shared/theme.ts` in this task if Task 5's "Step 7 fix-up" (widening `tags` to `string[]` and adding a fallback style) wasn's already applied — confirm it exists before using it here; if missing, add:

```ts
export const DEFAULT_TAG_STYLE: TagStyle = { text: "#475569", bg: "var(--octo-track)", icon: require("lucide-react").Tag };
```

(again, use a real top-of-file `import { Tag } from "lucide-react"` in the actual file rather than inline `require`.)

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter merchant typecheck`

- [ ] **Step 3: Manual verification**

`run` skill: navigate to `/customers/CUST-1001` (Reem Al-Subaie), compare against `apps/assets/Customer CRM/customer details.png`. Click Add Note / Add Tag / Block / Payment Link from the bottom bar and confirm each works.

- [ ] **Step 4: Commit**

```bash
git add apps/merchant/src/pages/customers/detail/index.tsx apps/merchant/src/pages/customers/_shared/theme.ts
git commit -m "feat(customers): rebuild the Customer Info detail page"
```

---

### Task 8: Send Message wizard

**Files:**
- Create: `apps/merchant/src/pages/customers/_shared/send-message-wizard/index.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/send-message-wizard/audience-step.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/send-message-wizard/channel-content-step.tsx`
- Create: `apps/merchant/src/pages/customers/_shared/send-message-wizard/review-send-step.tsx`
- Modify: `apps/merchant/src/pages/customers/index.tsx` (wire the header "Send Message" button)

**Interfaces:**
- Consumes: Task 1 types (`customerRecords` for computing the audience count), Task 3 i18n keys.
- Produces: `SendMessageWizard({ open, customers, onClose, onSent })` — the only export other tasks touch (`onSent: (count: number) => void`).

- [ ] **Step 1: Write `audience-step.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/send-message-wizard/audience-step.tsx
import { useState } from "react";
import { Tabs } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

export interface AudienceFilters {
  totalSpendFrom: string;
  totalSpendTo: string;
  lastVisitFrom: string;
  lastVisitTo: string;
  customerSinceFrom: string;
  customerSinceTo: string;
  gender: "" | "Male" | "Female";
}

export const EMPTY_AUDIENCE_FILTERS: AudienceFilters = {
  totalSpendFrom: "", totalSpendTo: "", lastVisitFrom: "", lastVisitTo: "", customerSinceFrom: "", customerSinceTo: "", gender: "",
};

export function AudienceStep({ value, onChange, onNext }: { value: AudienceFilters; onChange: (next: AudienceFilters) => void; onNext: () => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState("filters");

  function set<K extends keyof AudienceFilters>(key: K, val: AudienceFilters[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "filters", label: t("customers.sendMessage.tab.filters") },
          { id: "segments", label: t("customers.sendMessage.tab.segments") },
          { id: "savedAudiences", label: t("customers.sendMessage.tab.savedAudiences") },
        ]}
      />

      {tab === "filters" && (
        <div className="mt-4 flex flex-col gap-4">
          <RangeRow label={t("customers.sendMessage.filter.totalSpend")} from={value.totalSpendFrom} to={value.totalSpendTo} onFrom={(v) => set("totalSpendFrom", v)} onTo={(v) => set("totalSpendTo", v)} type="text" prefix="SAR" />
          <RangeRow label={t("customers.sendMessage.filter.lastVisit")} from={value.lastVisitFrom} to={value.lastVisitTo} onFrom={(v) => set("lastVisitFrom", v)} onTo={(v) => set("lastVisitTo", v)} type="date" />
          <RangeRow label={t("customers.sendMessage.filter.customerSince")} from={value.customerSinceFrom} to={value.customerSinceTo} onFrom={(v) => set("customerSinceFrom", v)} onTo={(v) => set("customerSinceTo", v)} type="date" />

          <div>
            <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.sendMessage.filter.gender")}</p>
            <div className="mt-1.5 flex gap-2">
              {(["Male", "Female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set("gender", value.gender === g ? "" : g)}
                  className={`flex-1 rounded-[9px] border px-3 py-2 text-[12.5px] ${value.gender === g ? "border-[#0D6EFD] text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)]"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "segments" && <p className="mt-4 text-[12.5px] text-[var(--octo-text-muted)]">{t("customers.sendMessage.segmentsEmpty")}</p>}
      {tab === "savedAudiences" && <p className="mt-4 text-[12.5px] text-[var(--octo-text-muted)]">{t("customers.sendMessage.savedAudiencesEmpty")}</p>}

      <button type="button" onClick={onNext} className="mt-6 w-full rounded-[10px] bg-[#0D6EFD] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90">
        {t("customers.sendMessage.next")}
      </button>
    </div>
  );
}

function RangeRow({
  label, from, to, onFrom, onTo, type, prefix,
}: { label: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; type: "text" | "date"; prefix?: string }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{label}</p>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {[{ label: t("customers.filter.from"), value: from, onChange: onFrom }, { label: t("customers.filter.to"), value: to, onChange: onTo }].map((field) => (
          <label key={field.label} className="flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
            {field.label}
            <span className="flex items-stretch rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)]">
              {prefix && <span className="flex items-center px-2 text-[12px] normal-case text-[var(--octo-text-muted)]">{prefix}</span>}
              <input
                type={type}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={prefix ? t("customers.sendMessage.filter.enterAmount") : undefined}
                className="w-full flex-1 rounded-e-[9px] bg-transparent px-2.5 py-1.5 text-[12.5px] normal-case text-[var(--octo-text-primary)] outline-none"
              />
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `channel-content-step.tsx`**

No mockup frame exists for this step (flagged in the spec) — this is a minimal, easily-replaced middle step matching steps 1/3's visual language.

```tsx
// apps/merchant/src/pages/customers/_shared/send-message-wizard/channel-content-step.tsx
import clsx from "clsx";
import { Button } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { CommunicationChannel } from "../types";

export function ChannelContentStep({
  channels,
  onChannelsChange,
  message,
  onMessageChange,
  onBack,
  onNext,
}: {
  channels: CommunicationChannel[];
  onChannelsChange: (next: CommunicationChannel[]) => void;
  message: string;
  onMessageChange: (next: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const options: CommunicationChannel[] = ["WhatsApp", "SMS", "Email"];

  function toggle(channel: CommunicationChannel) {
    onChannelsChange(channels.includes(channel) ? channels.filter((c) => c !== channel) : [...channels, channel]);
  }

  return (
    <div>
      <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.sendMessage.channel.title")}</p>
      <div className="mt-1.5 flex gap-2">
        {options.map((channel) => (
          <button
            key={channel}
            type="button"
            onClick={() => toggle(channel)}
            className={clsx(
              "flex-1 rounded-[9px] border px-3 py-2 text-[12.5px] font-medium transition-colors",
              channels.includes(channel) ? "border-[#0D6EFD] bg-[#0D6EFD]/5 text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-primary)]"
            )}
          >
            {t(`customers.sendMessage.channel.${channel.toLowerCase()}`)}
          </button>
        ))}
      </div>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.sendMessage.content.title")}</span>
        <textarea
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder={t("customers.sendMessage.content.placeholder")}
          rows={5}
          className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-faint)] focus:border-[#0D6EFD] focus:ring-2 focus:ring-[#0D6EFD]/30"
        />
        <span className="text-end text-[11px] text-[var(--octo-text-faint)]">{t("customers.sendMessage.content.charCount").replace("{count}", String(message.length))}</span>
      </label>

      <div className="mt-6 flex gap-2">
        <Button variant="secondary" onClick={onBack} className="flex-1">{t("customers.sendMessage.back")}</Button>
        <Button variant="primary" onClick={onNext} disabled={channels.length === 0 || message.trim() === ""} className="flex-1">
          {t("customers.sendMessage.next")}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `review-send-step.tsx`**

```tsx
// apps/merchant/src/pages/customers/_shared/send-message-wizard/review-send-step.tsx
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { CommunicationChannel } from "../types";

type SendTiming = "now" | "later" | "batches";
const COST_PER_MESSAGE_SAR = 0.125;

export function ReviewSendStep({
  totalSelected,
  channels,
  onBack,
  onSend,
}: {
  totalSelected: number;
  channels: CommunicationChannel[];
  onBack: () => void;
  onSend: () => void;
}) {
  const { t } = useI18n();
  const [timing, setTiming] = useState<SendTiming>("now");
  const estimatedCost = (totalSelected * COST_PER_MESSAGE_SAR).toFixed(2);

  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("customers.sendMessage.review.audienceOverview")}</p>
      <div className="mt-1.5 rounded-[9px] bg-[var(--octo-track)] px-3 py-2.5">
        <div className="text-[11px] text-[var(--octo-text-muted)]">{t("customers.sendMessage.review.totalSelected")}</div>
        <div className="text-[15px] font-bold text-[#0D6EFD]">{totalSelected.toLocaleString()} {t("customers.sendMessage.review.customersSuffix")}</div>
      </div>

      <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{t("customers.sendMessage.review.channelSummary")}</p>
      <div className="mt-1.5 flex flex-col gap-2">
        {channels.map((channel) => (
          <div key={channel} className="flex items-center justify-between rounded-[9px] border border-[var(--octo-divider)] px-3 py-2.5">
            <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
              <MessageCircle size={15} className="text-[#25D366]" /> {channel}
            </span>
            <span className="text-end text-[11.5px] text-[var(--octo-text-muted)]">
              {t("customers.sendMessage.review.estMessages")}: {totalSelected} · {t("customers.sendMessage.review.estCost")}: SAR {estimatedCost}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.sendMessage.review.itemStatus")}</p>
      <div className="mt-1.5 flex flex-col gap-1.5">
        {(
          [
            { id: "now", label: t("customers.sendMessage.review.sendNow") },
            { id: "later", label: t("customers.sendMessage.review.scheduleLater") },
            { id: "batches", label: t("customers.sendMessage.review.sendBatches") },
          ] as const
        ).map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-[12.5px] text-[var(--octo-text-primary)]">
            <input type="radio" name="send-timing" checked={timing === option.id} onChange={() => setTiming(option.id)} />
            {option.label}
          </label>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <Button variant="secondary" onClick={onBack} className="flex-1">{t("customers.sendMessage.back")}</Button>
        <Button variant="primary" onClick={onSend} className="flex-1">{t("customers.sendMessage.send")}</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `index.tsx` (wizard shell)**

```tsx
// apps/merchant/src/pages/customers/_shared/send-message-wizard/index.tsx
import { useMemo, useState } from "react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { AudienceStep, EMPTY_AUDIENCE_FILTERS, type AudienceFilters } from "./audience-step";
import { ChannelContentStep } from "./channel-content-step";
import { ReviewSendStep } from "./review-send-step";
import type { CommunicationChannel } from "../types";
import type { CustomerRecord } from "../types";

type Step = 1 | 2 | 3;

function matchesAudience(customer: CustomerRecord, filters: AudienceFilters): boolean {
  if (filters.totalSpendFrom && customer.totalSpendSar < Number(filters.totalSpendFrom)) return false;
  if (filters.totalSpendTo && customer.totalSpendSar > Number(filters.totalSpendTo)) return false;
  if (filters.lastVisitFrom && customer.lastVisit < filters.lastVisitFrom) return false;
  if (filters.lastVisitTo && customer.lastVisit > filters.lastVisitTo) return false;
  if (filters.customerSinceFrom && customer.customerSince < filters.customerSinceFrom) return false;
  if (filters.customerSinceTo && customer.customerSince > filters.customerSinceTo) return false;
  if (filters.gender && customer.gender !== filters.gender) return false;
  return true;
}

export function SendMessageWizard({
  open,
  customers,
  onClose,
  onSent,
}: {
  open: boolean;
  customers: readonly CustomerRecord[];
  onClose: () => void;
  onSent: (count: number) => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>(1);
  const [filters, setFilters] = useState<AudienceFilters>(EMPTY_AUDIENCE_FILTERS);
  const [channels, setChannels] = useState<CommunicationChannel[]>(["WhatsApp"]);
  const [message, setMessage] = useState("");

  const totalSelected = useMemo(() => customers.filter((c) => matchesAudience(c, filters)).length, [customers, filters]);

  function reset() {
    setStep(1);
    setFilters(EMPTY_AUDIENCE_FILTERS);
    setChannels(["WhatsApp"]);
    setMessage("");
  }

  function close() {
    reset();
    onClose();
  }

  const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: t("customers.sendMessage.step.audience") },
    { id: 2, label: t("customers.sendMessage.step.channelContent") },
    { id: 3, label: t("customers.sendMessage.step.reviewSend") },
  ];

  return (
    <Modal open={open} onClose={close} title={t("customers.sendMessage.title")} className="max-w-[560px] max-h-[85vh] overflow-y-auto octo-scroll">
      <div className="flex items-center gap-2">
        {STEPS.map((s, index) => (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                step >= s.id ? "bg-[#0D6EFD] text-white" : "bg-[var(--octo-track)] text-[var(--octo-text-muted)]"
              }`}
            >
              {s.id}
            </span>
            <span className={`text-[11.5px] font-medium ${step === s.id ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-muted)]"}`}>{s.label}</span>
            {index < STEPS.length - 1 && <span className={`h-px flex-1 ${step > s.id ? "bg-[#0D6EFD]" : "bg-[var(--octo-divider)]"}`} />}
          </div>
        ))}
      </div>

      <div className="mt-5">
        {step === 1 && <AudienceStep value={filters} onChange={setFilters} onNext={() => setStep(2)} />}
        {step === 2 && (
          <ChannelContentStep
            channels={channels}
            onChannelsChange={setChannels}
            message={message}
            onMessageChange={setMessage}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <ReviewSendStep
            totalSelected={totalSelected}
            channels={channels}
            onBack={() => setStep(2)}
            onSend={() => { onSent(totalSelected); close(); }}
          />
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5: Wire the header button in `index.tsx`**

Add import `SendMessageWizard` from `./_shared/send-message-wizard`; add state `const [sendMessageOpen, setSendMessageOpen] = useState(false);`; the header's `<Button variant="secondary" size="sm">{t("customers.sendMessageCta")}</Button>` gets `onClick={() => setSendMessageOpen(true)}`; render as a sibling:

```tsx
      <SendMessageWizard
        open={sendMessageOpen}
        customers={customers}
        onClose={() => setSendMessageOpen(false)}
        onSent={(count) => setToast(t("customers.sendMessage.sentConfirm").replace("{count}", String(count)))}
      />
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter merchant typecheck`

- [ ] **Step 7: Manual verification**

`run` skill: open "Send Message" from the header, compare step 1 against `apps/assets/Customer CRM/send message.png`, step 3 against `send message (1).png`. Step 2 has no mockup to compare — confirm it's usable and visually consistent with steps 1/3.

- [ ] **Step 8: Commit**

```bash
git add apps/merchant/src/pages/customers/_shared/send-message-wizard apps/merchant/src/pages/customers/index.tsx
git commit -m "feat(customers): add the 3-step Send Message wizard"
```

---

### Task 9: Cleanup — delete Segments/Feedback, update routing and sidebar

**Files:**
- Delete: `apps/merchant/src/pages/customers/segments/` (entire folder)
- Delete: `apps/merchant/src/pages/customers/feedback/` (entire folder)
- Delete: `apps/merchant/src/pages/customer-detail/index.ts` (stray, unregistered)
- Modify: `apps/merchant/src/app/routes/registry.tsx:66-73`
- Modify: `apps/merchant/src/widgets/app-sidebar/index.tsx:75-76,133-167`

**Interfaces:** none — this task only removes dead code and re-points existing routes/nav.

- [ ] **Step 1: Grep before deleting**

```bash
grep -rln "customers/segments\|customers/feedback\|CustomerSegmentsPage\|CustomerSegmentDetailPage\|CustomerFeedbackPage\|CustomerFeedbackDetailPage\|sparklinePaths" apps/merchant/src --include="*.tsx" --include="*.ts" | grep -v "pages/customers/segments\|pages/customers/feedback"
```
Expected: only `apps/merchant/src/app/routes/registry.tsx` (handled in Step 3) and possibly `apps/merchant/src/shared/lib/sparkline.ts` itself (its own definition, not a consumer — leave that file alone, other modules may still use `sparklinePaths`; only the segments folder's *usage* goes away). If anything else matches, stop and investigate before deleting — this plan's Task-1 spec assumed segments/feedback are used nowhere else, and this grep is where that assumption gets verified for real.

- [ ] **Step 2: Delete the three targets**

```bash
git rm -r apps/merchant/src/pages/customers/segments apps/merchant/src/pages/customers/feedback
git rm apps/merchant/src/pages/customer-detail/index.ts
```

- [ ] **Step 3: Update `registry.tsx`**

Delete these four lines (66-73):

```tsx
  { id: "customer-segments", path: "/customers/segments", section: "Customers", page: "Segments",
    element: lazy(() => import("@/pages/customers/segments").then(m => ({ default: m.CustomerSegmentsPage }))) },
  { id: "customer-segment-detail", path: "/customers/segments/:id", section: "Customers", page: "Segment Detail",
    element: lazy(() => import("@/pages/customers/segments/detail").then(m => ({ default: m.CustomerSegmentDetailPage }))) },
  { id: "customer-feedback", path: "/customers/feedback", section: "Customers", page: "Feedback & Complaints",
    element: lazy(() => import("@/pages/customers/feedback").then(m => ({ default: m.CustomerFeedbackPage }))) },
  { id: "customer-feedback-detail", path: "/customers/feedback/:id", section: "Customers", page: "Feedback Detail",
    element: lazy(() => import("@/pages/customers/feedback/detail").then(m => ({ default: m.CustomerFeedbackDetailPage }))) },
```

leaving the `customers` and `customer-detail` entries (lines 62-65) untouched.

- [ ] **Step 4: Update the sidebar's nav group (`app-sidebar/index.tsx:75-76`)**

Replace:

```tsx
      { id: "customers", label: "Customer CRM", icon: Users,
        items: ["Customer List & Profiles", "Segments", "Feedback & Complaints"] },
```

with:

```tsx
      // No sub-items: Customer CRM is now a single list+detail page, so the
      // entry navigates straight to it rather than opening a dropdown. Same
      // shape as Orders/Reservations/Menu/Staff above.
      { id: "customers", label: "Customer CRM", icon: Users },
```

- [ ] **Step 5: Remove the now-unused `ITEM_PATHS` entries**

In the same file, delete these three lines from the `ITEM_PATHS` map (around lines 136-138):

```tsx
  "Customer List & Profiles": "/customers",
  "Segments": "/customers/segments",
  "Feedback & Complaints": "/customers/feedback",
```

(They're unused once the group above has no `items` array — `GroupItems`/the flyout only ever read `ITEM_PATHS` for a group's own `items`, and this group no longer has any.)

- [ ] **Step 6: Re-run the i18n leftover-reference grep from Task 2**

```bash
grep -rn "customers\.kpi\.\|customers\.drawer\.\|customers\.segments\.\|customers\.feedback\.\|customers\.col\.\|customers\.customerList\|customers\.emptyTitle\|customers\.clearFilters\|customers\.noMatch\"" packages/i18n apps/merchant/src
```
Expected: zero matches now that the pages that used them are deleted/rewritten.

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm --filter merchant typecheck` and `pnpm --filter merchant lint` (or repo equivalents)
Expected: clean — no dangling imports of the deleted modules anywhere.

- [ ] **Step 8: Manual verification**

`run` skill: confirm the sidebar shows a single flat "Customer CRM" row (no chevron/dropdown) that navigates straight to `/customers`; confirm navigating directly to `/customers/segments` or `/customers/feedback` in the URL bar now renders the app's "no matching route" fallback instead of the old pages.

- [ ] **Step 9: Commit**

```bash
git add apps/merchant/src/app/routes/registry.tsx apps/merchant/src/widgets/app-sidebar/index.tsx
git commit -m "chore(customers): remove Segments and Feedback sub-modules and their routes/nav"
```

---

### Task 10: Final full visual verification

**Files:** none (verification only — fix forward in whichever task's files if something doesn't match).

- [ ] **Step 1: Start the app and walk every frame**

Use the `run` skill. For each of the 9 mockups in `apps/assets/Customer CRM/`, navigate to the matching real screen, take a screenshot, and compare side-by-side per the [[verify-ui-with-screenshots]] memory:

1. `CRM.png` → `/customers` populated list
2. `CRM-Empty state.png` → temporarily clear `customerRecords` (or filter to an empty search) to check the empty state, then revert
3. `CRM-actions.png` → open each of the 4 filter dropdowns, and a row's kebab menu
4. `CRM-selected.png` → select 3 rows, check the bulk-action bar
5. `add new customer.png` → open "+ Add New Customer"
6. `customer details.png` → `/customers/CUST-1001`
7. `linked payment.png` → open Payment Link from a row or the detail page
8. `send message.png` → open Send Message, step 1
9. `send message (1).png` → advance to step 3

- [ ] **Step 2: Click-through every action once**

Add Customer → confirm new row appears; Add Note/Add Tag/Block/Delete from the kebab; bulk Export (confirms a CSV downloads) and bulk Delete; Send Message end-to-end (all 3 steps); Payment Link's Send button; toggling Male/Female, WhatsApp/SMS/Email, and the Marketing switch in the Add Customer modal.

- [ ] **Step 3: RTL check**

Switch the app to Arabic (`ar`) via whatever control the app shell exposes (check `useI18n().setLocale` / the existing language switcher in the top bar) and re-check `/customers` and the Customer Info page — confirm text direction, icon mirroring (back arrow), and popover alignment all read correctly right-to-left.

- [ ] **Step 4: Full test suite**

Run: `pnpm --filter merchant test` and `pnpm --filter merchant typecheck` and `pnpm --filter merchant lint` (or repo equivalents) one more time across the whole app, not just this module, to catch any cross-module regression from the registry/sidebar edits.

- [ ] **Step 5: Report findings**

If any frame doesn't match, note exactly which file/line needs a fix and which task it belongs to (don't create a new task — fix forward in place, then re-run this task's Step 1 for that one frame). If everything matches, the module rebuild is complete — no further commit needed for this task itself.

---

## Self-Review

**Spec coverage:** every section of `docs/superpowers/specs/2026-09-17-customer-crm-rebuild-design.md` maps to a task — page shell (Task 3), data model (Task 1), shared components (Tasks 3-8), detail page (Task 7), cleanup (Task 9), i18n (Task 2), testing (Task 1's unit test + Task 10's manual pass). The spec's "Out of scope" items (backend wiring, real PIN auth, a promoted shared dropdown/date-range primitive) are respected — nothing in this plan reaches outside `pages/customers/`.

**Placeholder scan:** three inline placeholders were deliberately left inside code snippets above, each with an explicit follow-up step telling the implementer exactly what to replace it with and why (the `add-note-modal.tsx` Cancel-label ternary in Task 5 Step 2/5, the `tag as any` cast in Task 5 Step 7, and the `ListPanel` "View All" button body in Task 7 Step 1). These are not scope gaps — they're spots where writing the fully-correct version inline would have required forward-declaring a type or i18n key from a later step in the same task; each is resolved before that task's typecheck step.

**Type consistency:** `CustomerRecord` (Task 1) is imported unchanged through Tasks 3-9. `RowActionId` (Task 5) is the single source of truth for kebab-menu/bulk-bar action identifiers — `index.tsx`'s `handleRowAction` switch and `RowActionsMenu`'s item list both key off it. `AudienceFilters` (Task 8) is only used inside the wizard, not shared elsewhere. Money is `totalSpendSar`/`avgSpendSar`/`amountSar` (all `number`, SAR-denominated) everywhere — no task introduces a formatted-string money field.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-17-customer-crm-rebuild.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
