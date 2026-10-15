# Guest table ordering — a customer orders from a scanned place code

**Date:** 2026-10-15
**Sub-project 2 of 3** (1 place codes — done · 2 guest ordering · 3 public link US-019).
**Backend source of truth:** `octopus-backend` `main` @ `d63848aa` — `specs/011-table-qr-codes/contracts/http-endpoints.md`, `public-write-scope.md`, `shared-session.md`; DTOs `Menu.Contracts/Dtos/PublicRead/PublicPlaceMenuResponse.cs`, `Order.Contracts/Dtos/Orders/ScanOrderDtos.cs`, `OrderDtos.cs`, occupancy DTOs in `Order.Contracts`.

## 1. Goal

A printed place code opens `{PublicCodesBaseUri}/p/{key}`. Today the customer app has no `/p/` route, and its dine-in flow (`/table/*`, 25 screens) runs entirely in the browser with a mock order and mock payment. Make a scanned code lead to a real order the restaurant receives, and give staff what they need to handle those orders.

**Success:** a customer scans a code, browses that restaurant's menu, sends an order, and sees the server's reference and totals; the order appears in the merchant's order list marked as a QR order; staff can decline it without a PIN while nobody has accepted it, and can see and close the table's session.

## 2. Decisions (agreed 2026-10-15)

- **Approach 1:** a new `/p/[key]/…` route family in `apps/customer` that reuses the existing table-flow view components with data from the scan. `/table/*` stays as the demo.
- **Payment and bill splitting are hidden** from the `/p/` flow (the backend has no guest payment). Their screens are kept, not deleted. The order confirmation says payment is at the table.
- **Staff side:** a QR-orders filter, a QR marker, decline without PIN where the server allows it, and the table session card with close / reopen.
- **Not in scope:** guest payment, a guest cancelling or tracking their own order (the backend gives a guest no read of an order or a session — SD-3), a sound/notification on new orders.

## 3. Backend contract used

| Call | Route | Notes |
|---|---|---|
| Scan | `GET /v1/public/place-codes/{key}?lang=` (PublicApi) | 200 `{ status: "open"\|"unavailable", reason?: "place"\|"menu", place?: { number, name, zone }, menu?: PublicMenuResponse, ordering?: { basis, items: { [menuItemId]: entryId }, optionGroups: { [groupId]: optionId[] } } }`. 404 `menu.public.not-found` for unknown/revoked/regenerated keys (indistinguishable on purpose). `ordering` is present only when self-ordering is on and the menu takes orders |
| Order | `POST /v1/public/place-codes/{key}/orders` (PublicApi) | header `Idempotency-Key: <uuid>`; body `{ basis, lines: [{ entryId, quantity, optionIds?, note? }] }`; 201 `{ reference, currency, lines: [{ name, quantity, lineTotal }], netTotal, taxTotal, grandTotal }`; 404 `order.intake.not-found`, 409 `order.intake.unavailable`, 409 `order.intake.basis-changed`, 422 validation, 429 `order.intake.too-many-pending` / `rate.limited` |
| Order list | `GET /v1/businesses/{b}/orders?selfService=&intakeCodeId=&occupancyId=` (AdminApi) | each order gains `intakeKind` (`"self-service"` or empty), `intakeCodeId`, `occupancyId` |
| Cancel | existing cancel route | for a self-service order nobody accepted, started or took money on, an employee with `order.orders.cancel` cancels **without** an approval; otherwise the existing 422 `order.approval.needed` |
| Session | `GET /orders/occupancies?resourceId=`, `GET /orders/occupancies/{id}`, `POST …/{id}/close {expectedVersion}`, `POST …/{id}/reopen {expectedVersion}` | `OccupancyResponse { id, place { code, displayName, resourceId, … }, status, openedVia, openedAtUtc, closedAtUtc, reopenCount, orderCount, unacceptedOrderCount, version }`; 404 `order.occupancy.none-open`; 409 `order.occupancy.has-unaccepted-orders` (names the codes), 409 `order.occupancy.place-already-open` |

## 4. Customer side (`apps/customer`)

### Routes

| Route | View reused | Data |
|---|---|---|
| `/p/[key]` | `welcome-view` | scan (server-side): brand, place number/name, whether ordering is on |
| `/p/[key]/menu` | `menu-view` | `menuFromDocument(scan.menu)`; items absent from `ordering.items` have no Add button |
| `/p/[key]/menu/[item]` | `product-view` | same; modifiers map to `optionIds` |
| `/p/[key]/cart` | `cart-view` | cart; primary button "Send order" (no Pay) |
| `/p/[key]/order` | `order-view` (adapted) | the server's confirmation: reference, lines, net/tax/grand total; "Payment is at the table"; "Order something else" |
| `/p/[key]/orders` | `orders-view` (adapted) | confirmations sent from this phone (local only) |

**Middleware:** `/p/*` has no tenant on the host (like `/c/*`): the tenant-slug and sample-storefront headers are removed, and the table-flow header is set so the root layout draws the mobile chrome instead of the site chrome. `/api/place-orders/*` is likewise tenant-free. The restaurant's name and logo come from the scan's menu, not from the host.

A `/p/[key]/layout.tsx` loads the scan once per request (server, `cache: "no-store"` — the backend sends `Cache-Control: no-store`) and provides it to the subtree through a context (`PlaceScanProvider`), alongside the existing `TableBrandProvider`. The pay, split, invoice and thanks screens are not routed under `/p/`.

### State

- **Cart:** per code, in `sessionStorage` under `octo.placeCart.{key}` (survives a refresh, does not leak between tables), wrapped in try/catch.
- **Sent orders:** per code, in `localStorage` under `octo.placeOrders.{key}` — the confirmations only, for the "my orders" screen.
- **Prices in the cart are estimates**; the confirmation shows the server's totals.

### Sending an order

- The browser posts to a Next.js route handler `app/api/place-orders/[key]/route.ts`, which forwards to PublicApi (`PUBLIC_API_URL`) with the body and the `Idempotency-Key` header. This avoids CORS on PublicApi and keeps the API origin server-side.
- One idempotency key per send attempt of a given cart; a retry after a network failure reuses it; a changed cart gets a new one.
- The Send button is disabled while a request is in flight.

### Errors (customer-facing)

| Condition | What the customer sees |
|---|---|
| 404 on the scan | "This code isn't working — ask staff for a new one" (no reason given; the server hides it on purpose) |
| `unavailable` / `place` | "This table isn't taking orders right now — ask staff" |
| `unavailable` / `menu` | "The menu isn't available right now" + Retry |
| `ordering` absent | menu is browse-only + "Ordering from your phone isn't available right now — ask staff" |
| 409 `basis-changed` | reload the scan, mark cart lines whose item vanished or whose price changed, "The menu was updated — check your cart", send again |
| 409 `intake.unavailable` / 404 `intake.not-found` | "Phone ordering just closed — ask staff"; the cart is kept |
| 429 `too-many-pending` | "You have orders the restaurant hasn't answered yet — please wait" |
| 429 `rate.limited` | "Try again in a minute" |
| network failure | "Send again" with the same idempotency key |

Language: `?lang=` or the browser's `Accept-Language`, both locales, RTL for Arabic.

## 5. Staff side (`apps/merchant`, `packages/api-client`)

- **api-client:** order list query gains `selfService`, `intakeCodeId`, `occupancyId`; order DTO gains `intakeKind`, `intakeCodeId`, `occupancyId`; new occupancy contract + client (`getOpenOccupancy(resourceId)`, `getOccupancy(id)`, `closeOccupancy(id, expectedVersion)`, `reopenOccupancy(id, expectedVersion)`).
- **Orders list:** already has a source filter and a "QR Code" source chip (self-service orders arrive with `sourceCode: "qr"`), so no new filter is added. Rows whose `intakeKind === "self-service"` get a second chip, "Ordered by customer", to tell them from QR-source orders staff entered.
- **Cancel / decline:** no change needed. The existing cancel flow (`use-order-action-confirm.ts`) already sends the cancel without an approval first and asks for the PIN only when the server answers `order.approval.needed`, so a self-service order nobody accepted is declined without a PIN. (Corrected 2026-10-15 after reading the code; the first draft assumed it always asked.)
- **Table session card** in the order details when the order has an `occupancyId`: open/closed, order count, unanswered count, opened at; **Close** (409 `has-unaccepted-orders` lists the order codes to answer first) and **Reopen** (409 `place-already-open` names the open one). Stale `expectedVersion` → reload the card. Permissions: reading needs `order.orders.read`; close/reopen need `order.orders.operate`; 403 shows a toast.

## 6. Testing

- Customer: unit tests for the scan → menu mapping (orderable items, option ids), the cart → order-lines mapping, the basis-changed cart reconciliation, idempotency-key reuse rules, and the error-code → message mapping; a route-handler test for header/body forwarding.
- Merchant/api-client: unit tests for the new query params, the badge/filter logic, the cancel flow's "try without PIN, then ask" state machine, and the session card's error mapping.
- Manual against the running `main` backend: scan a generated code, order, see it in the merchant list, decline it without a PIN, close the session.

## 7. Out of scope

Guest payment and splitting (screens hidden, not removed), guest order tracking or cancel, staff notifications, changes to `/table/*` (demo) or `/c/[key]` (view-only access codes).
