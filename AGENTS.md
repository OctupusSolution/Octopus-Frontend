# AGENTS.md — OCTOPUS Frontend

**EVERY agent MUST read this file completely before writing any code.**
Then open `docs/TASKS.md`, find your assigned task number, and follow it exactly.

---

## 1. What OCTOPUS is (business context)

OCTOPUS is a **Modular Business Operating System for the Saudi market**.
It targets restaurants (first vertical), then salons, clinics, beach clubs, retail.

The core idea: a business owner should not run ten disconnected systems. OCTOPUS is an
**orchestration layer** — the merchant keeps using tools they already trust (Moyasar for
payments, Qoyod for accounting, Foodics for POS, Jisr for HR), while OCTOPUS stays the
single source of truth internally and connects everything through a central Integration Hub.

**Why it sells:** ZATCA e-invoicing compliance is *legally mandatory* for every Saudi
business. That is a guaranteed demand driver, not an optional feature.

### The 12 business modules

| # | Module | What it covers |
|---|---|---|
| 1 | Core Settings | Branches, roles, permissions — everything depends on this |
| 2 | Bookings & Reservations | Reservation deposits, appointments, events, waitlist |
| 3 | Orders & POS | Online orders, restaurant orders, menus, items |
| 4 | Payments | Unified payment object, gateways, buy-now-pay-later |
| 5 | Tax Invoicing (ZATCA) | Standard/simplified invoices, QR code, clearance/reporting |
| 6 | Accounting | Journal sync, ledger mapping, VAT reports |
| 7 | Inventory | SKUs, warehouses, stock transfers, waste, recipes |
| 8 | Customers / CRM | Customer profile, visit history, saved cards |
| 9 | Loyalty & Marketing | Points, gift cards, campaigns |
| 10 | HR / Staff | Employees, shifts, leave, payroll inputs |
| 11 | Messaging | WhatsApp, SMS, email — a shared service, not a standalone screen |
| 12 | Integration Hub | Per-provider connection status and logs |

### Key integrations (for realistic mock data)

- **Payments:** Moyasar, Tap, PayTabs, HyperPay · BNPL: Tabby, Tamara
- **Accounting:** Qoyod, Wafeq, Daftra
- **POS:** Foodics · **HR:** Jisr, ZenHR
- **Messaging:** WhatsApp Cloud API
- **Tax:** ZATCA Phase 2 (Fatoora portal, CSID, clearance vs reporting)
- **Payment methods in KSA:** Mada, Apple Pay, STC Pay, Visa/Mastercard

### Merchant roles (used for permissions in the UI)

`owner` · `branch_manager` · `cashier` · `waiter` · `kitchen`

### Currency & locale rules

- Currency is **SAR**. Format as `SAR 187.4K`, `SAR 62.10`, `SAR 2.8M`.
- Dates support **both** Gregorian and Hijri.
- Every screen must work in **Arabic (RTL)** and **English (LTR)**.

---

## 2. The four portals

| Portal | Path | Stack | Status |
|---|---|---|---|
| Merchant console | `apps/merchant` | React + Vite + TS | **ACTIVE — all current work is here** |
| Customer storefront | `apps/customer` | Next.js | Empty scaffold |
| Marketing website | `apps/website` | Next.js | Empty scaffold |
| Platform admin | `apps/admin` | React + Vite + TS | Empty scaffold |

> Merchant and Admin are **Vite SPAs, not Next.js**. There are no Server Components and
> `"use client"` is meaningless here — never add it.

---

## 3. Current state — what already exists

**Working and finished (do NOT rewrite these unless your task says so):**

- `apps/merchant/src/app.tsx` — app shell (grey outer, sidebar, white main card, routes)
- `apps/merchant/src/main.tsx` — React root + `BrowserRouter`
- `apps/merchant/src/index.css` — token import, `.octo-scroll` scrollbar, `octo-pulse` keyframe
- `apps/merchant/src/pages/dashboard/index.tsx` — **finished reference page**
- `apps/merchant/src/pages/orders-list/index.tsx` — **finished reference page (copy this style)**
- `apps/merchant/src/widgets/app-sidebar/index.tsx` — full 12-group nav, collapse rail, flyout
- `apps/merchant/src/widgets/top-bar/index.tsx` — route-aware breadcrumb
- `apps/merchant/src/widgets/page-transition/index.tsx` — fade + centered logo between routes
- Dashboard widgets: `sales-summary-chart` (StatCard), `revenue-channel-chart`,
  `order-channel-donut`, `ai-insights-panel`, `performance-heatmap`, `branch-distribution`
- `apps/merchant/src/shared/api/mock-dashboard.ts`, `mock-orders.ts`
- `apps/merchant/src/shared/lib/sparkline.ts`
- `packages/ui/src/tokens/*` — colors, typography, tokens.css
- `packages/ui/src/primitives/` — **only** `card.tsx` and `badge.tsx` exist so far
- `packages/config/tailwind/preset.ts`
- `apps/assets/Logo/OCTOPUS LOGO.svg`

**Empty placeholders (folders exist, files are stubs returning `export {}`):**
- All other `pages/*`, all `entities/*`, all `features/*`, most `widgets/*`
- `packages/i18n` — files exist but are **not wired into the app**
- `packages/api-client`, `packages/realtime`, `packages/module-kit` — empty

---

## 4. Architecture — Feature-Sliced Design

Folders inside `apps/merchant/src`, and the **import direction is strictly downward**:

```
app/        providers, router, global styles      (may import everything below)
pages/      one folder per route-level screen
widgets/    large self-contained UI blocks
features/   a single user action ("void order", "issue invoice")
entities/   business objects + how they render (Order, Invoice, Customer)
shared/     business-agnostic: ui, api, lib, config   (imports nothing above)
```

Two hard rules:
1. **A layer may only import from layers below it.** `features` may use `entities` and
   `shared`; it may never import `widgets` or `pages`.
2. **Every slice exposes exactly one public surface: its `index.ts`.**
   Never deep-import into another slice's internals.

Path aliases (already configured in `vite.config.ts` and `tsconfig.json`):

```ts
"@/..."     -> apps/merchant/src/...
"@ui/..."   -> packages/ui/src/...
"@i18n/..." -> packages/i18n/src/...
```

---

## 5. Design system — use these exact values

### Colours (never invent new hex values)

```
Brand
  Ocean Blue        #0D6EFD     Octopus Violet   #6C4DFF     Deep Navy   #081026

Text
  Primary text      #16161d     Secondary        #6b6b74     Muted       #8b8b93
  Faint / labels    #a9a9b2

Surfaces & lines
  Page background   #e9eaec     Shell            #f4f4f5     Card        #ffffff
  Card border       #ececf0     Input border     #e8e8ec     Divider     #f0f0f2
  Hover surface     #f8f8fa     Track / inactive #f2f2f4

Semantic
  Success #22C55E   Info #3B82F6   Warning #F59E0B   Error #EF4444
  Accent  #885CF6   Alt success #14B8A6   Positive text #16a34a

Chart series (in this order)
  #2ec9c0  #22c9d9  #5b8def  #8b7cf0  #4c35d4
KPI sparkline colours
  #a78bfa  #60a5fa  #a3e635  #fb923c
```

### Typography

Latin = **Inter**. Arabic = **Readex Pro** (Inter has no Arabic glyphs).
The active family switches automatically from `dir`/`lang` — never hardcode a font per locale.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| Page title | 21px / tight | 700 | `h1` on a page |
| Card title | 13px | 600 | `h2` inside a card |
| KPI value | 36px | 700 | the big number |
| Body | 12.5px | 400 | default text |
| Small / meta | 11.5px | 400 | secondary info |
| Label | 10.5px uppercase, tracking `0.06em` | 600 | KPI labels, column headers |

### Shape & spacing

- Card: `rounded-xl` (12px) + `border border-[#ececf0]` + `bg-white`
- Card padding: `px-[18px] py-[15px]`
- Page padding: `px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5`
- Gap between cards: `gap-3`
- Buttons: `rounded-[9px]`, `px-3 py-[7px]`, `text-[12px] font-medium`
- Icons: `lucide-react`, size 13–16, colour `#8b8b93` when decorative

### RTL — mandatory

Use **logical** Tailwind classes only. This is not optional; Arabic is a launch language.

```
USE:      ms-  me-  ps-  pe-  text-start  text-end  border-s  border-e
NEVER:    ml-  mr-  pl-  pr-  text-left   text-right  border-l  border-r
```

---

## 6. Code conventions

- **TypeScript everywhere.** No `.js`/`.jsx`. No `any`.
- **No chart library.** Recharts was deliberately removed. Bars are flex `div`s with
  percentage heights; donuts and sparklines are inline `<svg>`.
- **Server state** would be TanStack Query — but the backend does not exist yet, so all data
  comes from typed mock files in `shared/api/mock-*.ts`. Shape them like a real API response
  so swapping them later is a one-file change.
- **Mock data lives in its own file**, exported as typed `readonly` consts. Never inline a
  big data array inside a component.
- Components take **props**; they do not reach into globals.
- Define components at **module scope**, never inside another component's render body
  (doing so remounts the subtree on every render and breaks CSS transitions).
- Keep comments minimal and only where the "why" is non-obvious.

---

## 7. RULES FOR PARALLEL AGENTS — read this twice

Several agents run at the same time in this repo. The single biggest risk is two agents
editing the same file and destroying each other's work.

### 7.1 Shared files — DO NOT EDIT unless your task explicitly names the file

These are owned by specific tasks only:

```
apps/merchant/src/app.tsx
apps/merchant/src/main.tsx
apps/merchant/src/index.css
apps/merchant/src/app/routes/registry.tsx
apps/merchant/src/widgets/app-sidebar/index.tsx
apps/merchant/src/widgets/top-bar/index.tsx
packages/ui/src/index.ts
packages/ui/src/primitives/index.ts
packages/i18n/src/index.ts
package.json  (any of them)
tailwind.config.ts  vite.config.ts  tsconfig.json
```

If your task needs a change in one of these and your task text does **not** say you own it:
**stop, do not edit it, and report what you needed.** Do not "just quickly add one line."

### 7.2 What you DO own

Your task will name your files. Typically that is one page folder plus one mock-data file —
files nobody else touches. Create them freely.

### 7.3 Dev server / port

Only **one** dev server can run on port 5173. If you need to check the app in a browser and
the port is busy, another agent is already running it — **reuse it, do not kill it**.
Prefer verifying with `npx tsc --noEmit` instead of starting a server.

### 7.4 Never do these

- Never run `npm install <package>` without the task telling you to. Adding a dependency
  changes shared lockfiles and breaks other agents.
- Never run `git commit`, `git checkout`, `git reset`, or `git push` unless told to.
- Never delete or rewrite a file that another task owns.
- Never reformat a file you did not write.

---

## 8. How to verify your work

Run this from `apps/merchant` — it must print nothing:

```bash
npx tsc --noEmit
```

If your task is visual and no other agent is using the port, you may run the dev server
(`npm run dev` in `apps/merchant`, serves on 5173) and check the page loads with no console
errors. Otherwise a clean typecheck is the required minimum.

**Do not claim a task is done without running the typecheck and seeing it pass.**

---

## 9. Reference files — copy these patterns

| I need to build... | Copy the pattern from |
|---|---|
| A whole page with header + KPI row + table | `src/pages/orders-list/index.tsx` |
| A page with charts and mixed card grid | `src/pages/dashboard/index.tsx` |
| A KPI stat card | `src/widgets/sales-summary-chart/index.tsx` |
| A card with a title + icon | `src/widgets/performance-heatmap/index.tsx` |
| An inline SVG donut / progress ring | `src/widgets/order-channel-donut/index.tsx` |
| A bar chart with no chart library | `src/widgets/revenue-channel-chart/index.tsx` |
| A segmented toggle control | `src/widgets/branch-distribution/index.tsx` |
| Typed mock data | `src/shared/api/mock-orders.ts` |

When in doubt: **open `orders-list/index.tsx` and follow it line by line.** It is the
canonical example of a correct page in this codebase.
