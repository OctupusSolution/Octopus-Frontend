# OCTOPUS — Postman collection (Merchant console)

Complete API surface for `apps/merchant`, organised the way the console is organised:
one folder per sidebar group, sub-folders per screen.

| File | What it is |
|---|---|
| `OCTOPUS-Merchant-API.postman_collection.json` | 619 requests across 17 top-level folders |
| `OCTOPUS-Local.postman_environment.json` | Points at `http://localhost:4000` (the mock-api) |
| `OCTOPUS-Staging.postman_environment.json` | Same variables, empty values, staging host |

## Import

Postman → **Import** → drop all three files in → select the **OCTOPUS · Local**
environment from the picker at the top right.

## First run

```bash
npm run dev --workspace=@octopus/mock-api
```

Then, in Postman:

1. **00 · Platform & Health → Health check** — confirms the environment resolves.
2. **01 · Auth & Session → Login (password)** — its test script writes `accessToken`,
   `refreshToken`, `tenantId` and `userId` into the environment. Every other request
   inherits the bearer token from the collection, so nothing else needs configuring.

Login is 🟡 planned, so against the local mock-api it will 404 — that is expected.
The five 🟢 requests under **04 · Orders & POS → Live orders** work today with no token.

## Status legend

Most of this API does not exist yet. Every request's description opens with its status:

| Badge | Meaning |
|---|---|
| 🟢 **Live** (5) | Implemented in `apps/mock-api`, callable now. |
| 🟡 **Planned** (602) | Screen is built and reads a typed mock file; this is the contract that mock gets swapped for. |
| 🔴 **Stub** (12) | Route exists in the app but the screen is an empty placeholder. Endpoint shape is a proposal. |

The live ones are `GET /api/health`, `GET /api/orders`, `GET /api/orders/:id`,
`POST /api/orders`, `PATCH /api/orders/:id/status`.

## Folder map

| Folder | Reqs | Covers |
|---|---:|---|
| 00 · Platform & Health | 6 | Liveness, enums, reference data, feature flags |
| 01 · Auth & Session | 22 | Password + OTP + social login, tokens, 2FA, sessions, `/me`, notifications |
| 02 · Businesses & Onboarding | 31 | Wizard catalogue, 10-step onboarding, multi-business switcher, billing |
| 03 · Dashboard | 9 | One endpoint per Overview widget |
| 04 · Orders & POS | 44 | Live orders, history, pre-orders, KDS, POS tills, SSE streams |
| 05 · Reservations & Bookings | 41 | Calendar, floor plan, waitlist, private events |
| 06 · Menu & Catalogue | 51 | Categories, items, modifiers, combos, price lists, day parts, 86 board |
| 07 · Inventory & Supply | 55 | Ingredients, recipes, purchasing, counts, waste, transfers, production |
| 08 · Customers & CRM | 30 | Profiles, segments, feedback & complaints |
| 09 · Marketing & Loyalty | 52 | Loyalty, gift cards, subscriptions, promotions, campaigns |
| 10 · Delivery & Dispatch | 31 | Zones, dispatch board, drivers, aggregator channels |
| 11 · Finance, Payments & ZATCA | 56 | Transactions, tax invoices, settlements, accounting sync, house accounts |
| 12 · Staff & HR | 49 | Employees, schedule, attendance, leave, tips, payroll inputs |
| 13 · Reports & Analytics | 34 | Sales, margin, channels, customers, compliance, scheduled, exports |
| 14 · Settings | 65 | Business, branches, devices, roles, tax profile, modules, audit |
| 15 · Integration Hub | 31 | Connections, event logs, outbound + inbound webhooks |
| 16 · Messaging | 12 | WhatsApp / SMS / email as one shared send service |

## Conventions baked into the collection

- **Base path.** Live endpoints sit under `/api`. Everything planned is versioned:
  `/api/v1/...`.
- **Auth.** Collection-level Bearer `{{accessToken}}`. Inbound provider webhooks
  (15 · Integration Hub) override this to *no auth* — they authenticate with a provider
  signature header instead.
- **Tenancy.** `X-Tenant-Id` on every authenticated request; `X-Branch-Id` is present but
  disabled by default (tick it to scope to one branch).
- **List envelope.** `{ "data": [...], "meta": { "page", "pageSize", "total" } }`.
  Shared query params — `page`, `pageSize`, `sort` (`-createdAt` descending), `q`,
  `branchId`, `dateFrom`, `dateTo` — are present but disabled; tick the ones you need.
- **Money.** Always SAR, always a number in `*Sar` fields. Display formatting
  (`SAR 187.4K`) is the front-end's job.
- **Errors.** `{ "error": { "code": "snake_case", "message": "..." } }`. `422` validation,
  `409` state conflict, `403` permission **and** consent failures.
- **Async work.** Exports, syncs and bulk sends return `202` + a `jobId`; poll
  `GET /api/v1/exports/:jobId`.
- **Tests.** Collection-level scripts assert no 5xx and a sub-2s response on every request;
  list endpoints additionally assert the `data[]` envelope. Login/create requests chain
  their ids into environment variables.

## Where the shapes came from

- Routes — `apps/merchant/src/app/routes/registry.tsx`
- Response shapes — `apps/merchant/src/shared/api/mock-*.ts`
- Canonical order/menu/tenant contracts — `packages/api-client/src/contracts/*.ts`
- Multi-business design — `docs/superpowers/specs/2026-08-17-multi-business-switcher-design.md`

Each request names the screen it serves and the mock file it was derived from, so when a
mock is replaced with a real call you can find its contract by searching the file name.

## A note on ZATCA

ZATCA Phase 2 is legally mandatory in Saudi Arabia and shapes the whole Finance folder.
**Standard** (B2B) invoices need *clearance* — ZATCA signs them before they are valid to
hand to a buyer. **Simplified** (B2C) invoices need *reporting* within 24 hours. Both carry
a UUID, a hash chain via `previousInvoiceHash`, a cryptographic stamp and a TLV QR code. A
break anywhere in the chain rejects everything after it, which is why
`GET /api/v1/finance/tax-invoices/chain-check` exists.

## Regenerating

The collection is generated, not hand-edited — the sources live in `_generator/`.
Edit those rather than the JSON; hand edits to the JSON are lost on the next build.

```bash
node docs/postman/_generator/build.js docs/postman
```

- `_generator/lib.js` — request/folder builders, shared query-param sets, test snippets,
  and the sample values used for path variables.
- `_generator/s01…s05-*.js` — one file per group of folders.
- `_generator/build.js` — assembles the collection, stamps the tenancy headers onto every
  authenticated request, writes both environments, and prints a per-folder count.
