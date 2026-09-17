# Customer CRM Module Rebuild

Date: 2026-09-17
Status: Approved for implementation

## Context

The merchant app's `/customers` section (`apps/merchant/src/pages/customers/`)
is a first-generation module: a plain list page with a hand-rolled
`<table>`, a separate detail page, plus two extra sub-modules —
Segments (`/customers/segments`, `/customers/segments/:id`) and
Feedback & Complaints (`/customers/feedback`, `/customers/feedback/:id`)
— reachable from a 3-item dropdown under "Customer CRM" in the
sidebar. New mockups (`apps/assets/Customer CRM/*.png`, 9 frames)
specify a materially different, single-page-plus-detail design: a
richer 6-stat header, card-style customer rows with inline tag chips
and always-visible quick actions, dropdown filters (Tags / Visits /
Total Spend / Last Visit), multi-select bulk actions, a redesigned
Customer Info detail page, an Add New Customer modal, a Payment Link
modal, and a 3-step Send Message wizard (Audience → Channel & Content
→ Review & Send). This spec covers rebuilding `/customers` to match
those mockups, and **removing Segments and Feedback & Complaints
entirely** (confirmed with the user — the new design has no nav
entries or frames for either, and old-CRM cleanup is in scope).

Backend integration is out of scope: everything is mock/local state,
same precedent as Staff ([[2026-09-11-staff-module-design]]) and
Orders ([[2026-09-16-orders-module-design]]).

## Reference mockups (9 frames, `apps/assets/Customer CRM/`)

- `CRM.png` — populated list; `CRM-Empty state.png` — empty state
- `CRM-actions.png` — the 4 filter dropdowns open (Tags, Visits, Total
  Spend, Last Visit) and a row's kebab (⋮) menu open
- `CRM-selected.png` — multi-select bulk-action bar ("3 Selected")
- `add new customer.png` — Add New Customer modal
- `customer details.png` — Customer Info detail page
- `linked payment.png` — Payment Link modal
- `send message.png` — Send Message wizard, step 1 (Audience/Filters)
- `send message (1).png` — Send Message wizard, step 3 (Review & Send)

No frame shows step 2 (Channel & Content) — flagged below as an
explicit interpretation, easy to correct.

## Architecture

### Page shell

`apps/merchant/src/pages/customers/index.tsx` is rewritten in place
(same route, same exported `CustomersPage`):

- Header (title/subtitle) + `Send Message` (secondary) / `+ Add New
  Customer` (primary) buttons.
- 6 stat cards: Total Customers, Active Customers, New this Month, VIP
  Customers, Returning Customers, Total Spend — icon-tile style like
  Orders' `OrdersStatCards`, fed by a static `customerStats` object
  (see Data model — these are decorative business KPIs, not a
  filter-pill count that must match the visible rows 1:1, so unlike
  Orders' stats they stay hand-authored constants mirroring the
  mockup's exact numbers).
- Filter bar: search input, 4 dropdown filters (Tags multi-checkbox;
  Visits From/To; Total Spend Min/Max; Last Visit date range), each
  with its own "Apply" button, plus Reset and "Save Segment" (bookmark
  icon — opens a small named-save affordance; no dedicated Segments
  page exists anymore, so this just tags the current filter combo for
  reuse in the Send Message wizard's "Saved Audiences" tab).
- Row list: card-style rows (avatar, name, tag chips, phone w/
  WhatsApp-glyph, email; Visits / Total Spend / Last Visit / Upcoming
  columns; Edit / New Reservations / Payment Link quick actions; kebab
  menu). Leading checkbox per row.
- Selecting ≥1 row swaps the filter bar for the bulk-action bar ("N
  Selected", Send Via WhatsApp, Send Email, Payment Link, Add Tag,
  Merge, Export, Delete) — matches `CRM-selected.png`.
- `EmptyState` (no customers at all) matches `CRM-Empty state.png`;
  a separate "no rows match filters" case reuses the same `EmptyState`
  primitive with different copy (no dedicated frame — small,
  low-risk interpretation).
- Pagination via the existing cross-module `Pagination`
  (`pages/inventory/_shared/pagination.tsx`), same as Orders.

### Data model (`apps/merchant/src/pages/customers/_shared/`)

`types.ts`:

```ts
type CustomerTag = "VIP" | "Frequent Diner" | "Birthday May" | "New Customer" | "At Risk";
type CommunicationChannel = "WhatsApp" | "SMS" | "Email";

interface CustomerRecord {
  id: string;
  firstName: string;
  lastName: string;
  gender: "Male" | "Female";
  tags: CustomerTag[];
  phone: string;                 // "+966510002877"
  email: string;
  isBlocked: boolean;
  visits: number;
  totalSpendSar: number;
  lastVisit: string;             // ISO date
  upcomingReservation?: string;  // ISO date
  loyaltyPoints: number;
  avgSpendSar: number;
  customerSince: string;
  firstVisit: string;
  preferredBranch: string;
  preferredAreaTable: string;
  vipSince?: string;
  referredBy?: string;
  marketingConsent: "Opted in" | "Opted out";
  cuisinePreference: string[];
  dietaryPreference: string;
  occasion: string;
  visitTime: string;
  communicationPreference: CommunicationChannel[];
  specialRequests: string;
  notes: { date: string; text: string }[];
  recentReservations: { date: string; table: string; guests: number; status: string }[];
  recentOrders: { id: string; date: string; items: string; totalSar: number }[];
  recentPayments: { date: string; cardLast4: string; amountSar: number; status: "PAID" | "PENDING" }[];
}
```

`mock-data.ts` (+ `.test.ts`): a small **generator** (name pool ×
tag/spend/visit distribution) producing ~60 varied `CustomerRecord`s
for realistic browsing/filtering/pagination — deliberately *not*
cloning one repeated fake row the way the raw mockup screenshots do
(every visible row in `CRM.png` is literally "Reem Al-Subaie" ×8,
which is placeholder Figma data, not a spec to replicate literally).
"Reem Al-Subaie" is kept as record #1 so the Customer Info / Payment
Link / Send Message frames — which all key off that exact
name/phone/email/stats — still have a real matching record to open.
Pinned by a test asserting record count and that record #1 matches
the mockup's Reem Al-Subaie fields exactly.

`stats.ts` holds the static `customerStats` (Total Customers 2,845
+15%, Active Customers 1,986 +10%, New this Month 156 +15%, VIP
Customers 312 +12%, Returning Customers 1,247 +20%, Total Spend SAR
1.40M +50% vs Last Month) verbatim from the mockup — note the mockup's
"SAE 1,40M" is read as a currency-code/decimal-separator typo for "SAR
1.40M" and corrected, since this app's currency is SAR everywhere else
and Arabic-locale-style comma-decimal formatting isn't used anywhere
else in the codebase.

`theme.ts`: tag chip colors (VIP gold, Frequent Diner green, Birthday
May purple, New Customer blue, At Risk red), the 6 stat-card icon
tiles' colors, and the row-action pill colors (Edit neutral, New
Reservations amber, Payment Link violet) — centralized like Orders'
`theme.ts` rather than inlined per-file.

### Shared components

- `stat-cards.tsx` — the 6-card row.
- `filter-bar.tsx` + `filter-popover.tsx` — one popover component
  parameterized per filter kind (checkbox-list for Tags; numeric
  from/to for Visits; currency from/to for Total Spend; date-range for
  Last Visit), each with its own local draft state + Apply button,
  matching `CRM-actions.png`. No shared date-range-picker exists in
  the kit — a small local one is built here (native `<input
  type="date">` styled to match, not a calendar widget — no frame
  shows a calendar dropdown, only styled date fields).
- `customer-row.tsx` — the card row, desktop + a stacked mobile
  variant.
- `bulk-action-bar.tsx` — the "N Selected" bar.
- `row-actions-menu.tsx` — the kebab dropdown (Add Note, History, Send
  Via WhatsApp, Send Email, Add Tag, Block, Delete). No shared
  dropdown-menu primitive exists project-wide; built locally here,
  same as Orders built its own popover. "Block" toggles
  `isBlocked` (local state) and flips its own label to "Unblock";
  blocked customers get a small "Blocked" chip next to their tags in
  the row and detail header — no frame depicts a blocked customer, so
  this is a small interpretation to make the toggle visibly do
  something rather than being a no-op.
- `add-customer-modal.tsx` — full form from `add new customer.png`.
  Reuses the flag+`+966`+digits phone field pattern from
  `pages/reservations/_shared/reservation-form.tsx` (adapted locally,
  per this codebase's convention of not reaching across page
  boundaries), a local `switch.tsx` for Marketing Communications
  (same visual pattern as `pages/staff/_shared/switch.tsx`), and
  removable tag chips for "Add Customer Tag".
- `payment-link-modal.tsx` — Request Type segmented control
  (Deposit/Balance/Custom Amount), reservation select, amount, and
  a description field are `.trim()`-required per the frame's red
  asterisks. Payment Method is a single-select of 3 cards
  (Payment Link / WhatsApp / SMS).
- `send-message-wizard/` — 3-step shell (`index.tsx` owns
  `step: 1 | 2 | 3` state + the shared progress-rail header):
  - `audience-step.tsx` — `Filters` / `Segments` / `Saved Audiences`
    tabs (reusing `Tabs`); Filters tab has Tags, Visit Frequency,
    Total Spend range, Last Visit range, Customer Since range, Gender,
    Age Range — matches `send message.png` exactly. `Segments` tab
    shows a short empty note ("No segments yet — save a filter
    combination from Customer CRM to create one") since Segments as a
    dedicated module is removed; `Saved Audiences` lists anything
    saved via the list page's "Save Segment" button (session-local
    state, not persisted).
  - `channel-content-step.tsx` — **no mockup exists for this step.**
    Built as a reasonable minimal middle step: channel checkboxes
    (WhatsApp/SMS/Email), a message textarea with a live character
    counter, matching the visual language (card sections, blue
    primary button) of steps 1 and 3. Flagged here for easy
    replacement if a real frame turns up later.
  - `review-send-step.tsx` — Audience Overview (Total Selected),
    Channel Summary (icon, Est. Messages, Estimated Cost), Item/Send
    Status radio (Send Now / Schedule For Later / Send in Batches) —
    matches `send message (1).png`. "Estimated Cost" is a simple
    `messages × SAR 0.125` placeholder rate, not a real pricing table.
- `avatar.tsx` — initials-circle helper (kept, same as today's
  `styles.ts` `initials()`, promoted into its own file since the
  module no longer has a single flat `styles.ts`).

### Detail page

`apps/merchant/src/pages/customers/detail/index.tsx` (`CustomerDetailPage`,
same route `/customers/:id`) is rebuilt to match `customer details.png`:

- Header card: avatar, name, tag chips, phone/email — plus 5 stat
  tiles (Total Visits, Total Spend, Last Visit, Loyalty Points, Avg
  Spend).
- Row of 3 panels: **About Customer** (Customer Since, First Visit,
  Preferred Branch, Preferred Area/Table, VIP Since, Referred By,
  Marketing Consent) and **Preferences** (Cuisine, Dietary, Occasion,
  Visit Time, Communication, Special Requests), each with an edit
  pencil icon opening a small inline-field edit modal (local state
  only, no persistence); **Notes** with a bulleted date+text list and
  a "+" button opening an add-note modal.
- Row of 3 panels: Recent Reservations, Recent Orders, Recent Payments
  — each a short list + "View All" link. "View All" is inert (`title="Coming soon"`-style
  disabled affordance) since no dedicated history route exists for
  either.
- Bottom action bar: New Reservations, Payment Link, Send Via
  WhatsApp, Send Email, Add Tag, Block, Delete — the same actions as
  the row kebab menu, reused via `row-actions-menu.tsx`'s action
  handlers rather than duplicated.

### Cleanup

- Delete `pages/customers/segments/**`, `pages/customers/feedback/**`,
  and the stray unregistered `pages/customer-detail/index.ts`.
- `apps/merchant/src/app/routes/registry.tsx`: remove the
  `customer-segments`, `customer-segment-detail`,
  `customer-feedback`, `customer-feedback-detail` route entries. Keep
  `customers` and `customer-detail`.
- `apps/merchant/src/widgets/app-sidebar/index.tsx`: collapse the
  3-item "Customer CRM" dropdown group into a single flat nav entry
  (`{ id: "customers", label: "Customer CRM", icon: Users }`, no
  `items`) that links straight to `/customers`, matching the sidebar
  shown in every new mockup and mirroring Orders' single-entry style.
  Remove the now-unused `ITEM_PATHS` entries for Segments and
  Feedback & Complaints.

### i18n

`packages/i18n/src/locales/{en,ar}/index.ts`: the existing
`customers.*` block (~115 keys, lines ~1328-2042) is replaced —
segments/feedback/`.drawer.` sub-blocks removed; `.kpi.` renamed to
`.stat.` for consistency with Orders. New keys added for: the 4
filter popovers (`customers.filter.*`), row actions
(`customers.rowAction.*`), bulk bar (`customers.bulk.*`), the
Add-Customer modal (`customers.addCustomer.*`), the Payment Link modal
(`customers.paymentLink.*`), and the Send Message wizard
(`customers.sendMessage.*`, per-step). en/ar kept 1:1 per the header
comment's requirement.

## Testing

- `mock-data.test.ts` — pins generated record count and that record #1
  matches the mockup's Reem Al-Subaie fields.
- Manual verification via the `run` skill against all 9 frames per
  [[verify-ui-with-screenshots]]: empty state, populated list, all 4
  filter popovers, kebab menu, bulk-select bar, Add Customer modal,
  Customer Info detail page, Payment Link modal, and the full Send
  Message wizard (including the un-mocked-up step 2).
- Confirm `/customers/segments*` and `/customers/feedback*` return
  404/no-match (routes fully removed) and the sidebar shows one flat
  "Customer CRM" entry.
- No other module imports `pages/customers/**` internals (segments'
  `sparklinePaths` usage and feedback's hand-rolled pagination are
  local to the deleted folders) — confirmed via grep before deleting.

## Out of scope

- Any backend/API wiring — Add Customer, Payment Link, Send Message,
  Block/Delete/Add Note/Add Tag/Merge/Export all stay local-state or
  client-side-only (CSV export), same as Orders' action flows.
- Real PIN/manager-auth gating (no frame shows one for CRM actions,
  unlike Orders).
- A general-purpose dropdown-menu or date-range-picker primitive
  promoted into `@ui/primitives` — built locally in this module's
  `_shared/`, consistent with how Orders and other modules keep
  bespoke pieces local rather than prematurely generalizing.
