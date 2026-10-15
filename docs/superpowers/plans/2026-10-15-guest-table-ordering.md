# Guest Table Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A scanned place code (`/p/{key}`) leads a customer through menu → cart → a real order on the backend, and staff see the table's session on the order page.

**Architecture:** Pure mapping in `apps/customer/src/shared/lib/place-order.ts` (scan → orderable menu, cart → order lines, cart reconciliation, error copy), a server-side PublicApi helper for the scan and the POST, a Next route handler as the browser's POST target, and a `/p/[key]` route family that reuses the table flow's menu/product/cart views through `MobileFlowProvider`, plus three small place-only views (welcome, send, confirmation/orders). Merchant: occupancy client + a table-session card on the order details page.

**Tech Stack:** Next.js app router (customer), React + Vite (merchant), TypeScript, vitest (`environment: node`, `src/**/*.test.ts` only).

**Spec:** `docs/superpowers/specs/2026-10-15-guest-table-ordering-design.md`

## Global Constraints

- Branch `feature/guest-table-ordering`; commits carry **no** Claude / Co-Authored-By lines.
- Never modify `octopus-backend*` repos.
- The working tree holds the user's uncommitted work (merchant files, `packages/i18n` locales). Stage **only** this plan's hunks: for the locale files build `HEAD + new keys` and stage via `git hash-object -w` + `git update-index --cacheinfo` (as in sub-project 1); use `git add <exact paths>` elsewhere and check `git diff --cached --stat` before every commit.
- Customer strings: `store.place.*`, merchant strings: `orders.session.*`, both in `packages/i18n/src/locales/{en,ar}/index.ts`; `apps/customer/src/shared/i18n/keys.test.ts` requires identical en/ar key sets and non-empty `store.*` in ar.
- Backend routes: scan `GET /v1/public/place-codes/{key}?lang=`; order `POST /v1/public/place-codes/{key}/orders` with header `Idempotency-Key: <uuid>`; occupancies under `/v1/businesses/{b}/orders/occupancies`.
- Keys in `ordering.items` are the menu's item refs (`i1`…); `ordering.optionGroups[groupRef][i]` is the id of `modifierGroups[groupRef].options[i]` (backend `PublicPlaceMenuResponse.cs` remarks).
- `/table/*` and `/c/*` behaviour must not change.

## Review Focus

1. **Item listed in two sections** (`menuFromDocument` makes ids `cat-1-i1` and `cat-2-i1`) → both map to entry `items["i1"]`; a cart line added from either sends the right entryId. Test in Task 1.
2. **A modifier option added in the cart no longer exists after a menu update** → reconciliation drops that line and reports it, never sends an unknown optionId. Test in Task 1.
3. **Double tap on Send / retry after a network drop** → the same `Idempotency-Key` for the same cart; a different cart gets a new key. Test in Task 1 (`idempotencyKeyFor`).
4. **Two tables on one phone** → carts never mix (per-code storage key). Test in Task 3 (`cartStorageKey`).
5. **A scan with `ordering` absent** → menu browsable, nothing addable, banner shown; the send page refuses to post. Test in Task 1 (`orderableMenu` with `null` ordering).

---

### Task 1: Pure place-order module (customer)

**Files:**
- Create: `apps/customer/src/shared/lib/place-order.ts`
- Test: `apps/customer/src/shared/lib/place-order.test.ts`

**Interfaces — Produces:**
```ts
export interface PlaceOrdering { basis: string; items: Record<string, string>; optionGroups: Record<string, string[]>; }
export interface PlaceScan { status: "open" | "unavailable"; reason?: "place" | "menu" | null; place?: { number: string; name: string | null; zone: string | null } | null; menu?: PublicMenuDocument | null; ordering?: PlaceOrdering | null; }
export interface ScanOrderLine { entryId: string; quantity: number; optionIds?: string[]; note?: string; }
export interface ScanOrderConfirmation { reference: string; currency: string; lines: { name: string; quantity: number; lineTotal: number }[]; netTotal: number; taxTotal: number; grandTotal: number; }
export function itemRefOf(menuItemId: string): string;                       // "cat-2-i7" → "i7"
export function optionIdOf(ordering: PlaceOrdering, groupRef: string, optionId: string): string | null; // "m1-2" → optionGroups.m1[2]
export function orderableMenu(menu: Menu, ordering: PlaceOrdering | null): Menu; // non-orderable items get inStock:false
export function toScanLines(lines: readonly OrderLine[], ordering: PlaceOrdering): { lines: ScanOrderLine[]; unknown: string[] }; // unknown = lineIds that cannot be sent
export function reconcileCart(lines: readonly OrderLine[], menu: Menu, ordering: PlaceOrdering | null): { keep: OrderLine[]; dropped: OrderLine[]; repriced: OrderLine[] };
export function cartSignature(lines: readonly OrderLine[]): string;
export function idempotencyKeyFor(signature: string, previous: { signature: string; key: string } | null, newKey: () => string): { signature: string; key: string };
export type PlaceProblem = "notFound" | "closed" | "basisChanged" | "tooManyPending" | "rateLimited" | "invalid" | "network" | "generic";
export function placeProblemOf(status: number, errorCode: string | undefined): PlaceProblem;
export const PLACE_PROBLEM_KEY: Record<PlaceProblem, string>; // i18n keys store.place.error.*
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import type { MenuItem, OrderLine } from "@octopus/api-client";
import type { Menu } from "@/shared/api/menu-document";
import {
  cartSignature, idempotencyKeyFor, itemRefOf, optionIdOf, orderableMenu, placeProblemOf,
  reconcileCart, toScanLines, type PlaceOrdering,
} from "./place-order";

const ordering: PlaceOrdering = {
  basis: "b1",
  items: { i1: "e-1", i2: "e-2" },
  optionGroups: { m1: ["o-a", "o-b", "o-c"] },
};
const item = (id: string, priceSar = 10): MenuItem => ({
  id, categoryId: id.split("-").slice(0, 2).join("-"), name: id, description: "", priceSar, imageUrl: "",
  available: true, availableFor: ["dine_in"], inStock: true,
  modifierGroups: [{ id: "m1", label: "Size", required: false, multiple: false, options: [
    { id: "m1-0", label: "S", priceDeltaSar: 0 }, { id: "m1-1", label: "M", priceDeltaSar: 2 }, { id: "m1-2", label: "L", priceDeltaSar: 4 } ] }],
});
const menu: Menu = { categories: [], items: [item("cat-1-i1"), item("cat-2-i1"), item("cat-1-i2"), item("cat-1-i3")] };
const line = (over: Partial<OrderLine>): OrderLine => ({
  lineId: "l1", menuItemId: "cat-1-i1", name: "x", unitPriceSar: 10, quantity: 1, modifiers: [], notes: "", ...over,
});

describe("refs", () => {
  it("reads the menu ref out of a storefront item id, wherever the item is listed", () => {
    expect(itemRefOf("cat-1-i1")).toBe("i1");
    expect(itemRefOf("cat-12-i40")).toBe("i40");
  });
  it("maps an option by its position in the group", () => {
    expect(optionIdOf(ordering, "m1", "m1-2")).toBe("o-c");
    expect(optionIdOf(ordering, "m1", "m1-9")).toBeNull();
    expect(optionIdOf(ordering, "mX", "mX-0")).toBeNull();
  });
});

describe("orderableMenu", () => {
  it("marks items the order cannot carry as not in stock", () => {
    const out = orderableMenu(menu, ordering);
    expect(out.items.find((i) => i.id === "cat-1-i3")?.inStock).toBe(false);
    expect(out.items.find((i) => i.id === "cat-2-i1")?.inStock).toBe(true);
  });
  it("makes the whole menu browse-only when ordering is off", () => {
    expect(orderableMenu(menu, null).items.every((i) => i.inStock === false)).toBe(true);
  });
});

describe("toScanLines", () => {
  it("sends entry ids, option ids and notes", () => {
    const out = toScanLines([
      line({ menuItemId: "cat-2-i1", quantity: 2, notes: " no ice ", modifiers: [{ groupId: "m1", optionId: "m1-1", label: "M", priceDeltaSar: 2 }] }),
    ], ordering);
    expect(out).toEqual({ lines: [{ entryId: "e-1", quantity: 2, optionIds: ["o-b"], note: "no ice" }], unknown: [] });
  });
  it("reports lines it cannot send instead of guessing", () => {
    const out = toScanLines([line({ lineId: "bad", menuItemId: "cat-1-i3" })], ordering);
    expect(out.lines).toEqual([]);
    expect(out.unknown).toEqual(["bad"]);
  });
});

describe("reconcileCart", () => {
  it("drops lines whose item or option vanished and flags a changed price", () => {
    const next: Menu = { categories: [], items: [item("cat-1-i1", 12)] };
    const nextOrdering: PlaceOrdering = { basis: "b2", items: { i1: "e-1" }, optionGroups: { m1: ["o-a"] } };
    const r = reconcileCart([
      line({ lineId: "a" }),
      line({ lineId: "b", menuItemId: "cat-1-i2" }),
      line({ lineId: "c", modifiers: [{ groupId: "m1", optionId: "m1-2", label: "L", priceDeltaSar: 4 }] }),
    ], next, nextOrdering);
    expect(r.keep.map((l) => l.lineId)).toEqual(["a"]);
    expect(r.dropped.map((l) => l.lineId)).toEqual(["b", "c"]);
    expect(r.repriced.map((l) => l.lineId)).toEqual(["a"]);
    expect(r.keep[0].unitPriceSar).toBe(12);
  });
});

describe("idempotency", () => {
  it("keeps the key for the same cart and makes a new one for a changed cart", () => {
    let n = 0;
    const mk = () => `k${++n}`;
    const s1 = cartSignature([line({})]);
    const first = idempotencyKeyFor(s1, null, mk);
    expect(idempotencyKeyFor(s1, first, mk).key).toBe(first.key);
    const s2 = cartSignature([line({ quantity: 2 })]);
    expect(idempotencyKeyFor(s2, first, mk).key).not.toBe(first.key);
  });
});

describe("placeProblemOf", () => {
  it("maps the backend's answers", () => {
    expect(placeProblemOf(404, "order.intake.not-found")).toBe("closed");
    expect(placeProblemOf(409, "order.intake.unavailable")).toBe("closed");
    expect(placeProblemOf(409, "order.intake.basis-changed")).toBe("basisChanged");
    expect(placeProblemOf(429, "order.intake.too-many-pending")).toBe("tooManyPending");
    expect(placeProblemOf(429, "rate.limited")).toBe("rateLimited");
    expect(placeProblemOf(422, "validation")).toBe("invalid");
    expect(placeProblemOf(0, undefined)).toBe("network");
    expect(placeProblemOf(500, "x")).toBe("generic");
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`cd apps/customer && npx vitest run src/shared/lib/place-order.test.ts` → cannot resolve `./place-order`).

- [ ] **Step 3: Implement**

```ts
// A scanned place code's ordering: what the menu may sell, how a cart becomes
// the backend's order lines, and how a cart survives a menu update. Pure.
import type { OrderLine, PublicMenuDocument } from "@octopus/api-client";
import type { Menu } from "@/shared/api/menu-document";

export interface PlaceOrdering { basis: string; items: Record<string, string>; optionGroups: Record<string, string[]>; }
export interface PlaceScan {
  status: "open" | "unavailable";
  reason?: "place" | "menu" | null;
  place?: { number: string; name: string | null; zone: string | null } | null;
  menu?: PublicMenuDocument | null;
  ordering?: PlaceOrdering | null;
}
export interface ScanOrderLine { entryId: string; quantity: number; optionIds?: string[]; note?: string; }
export interface ScanOrderConfirmation {
  reference: string; currency: string;
  lines: { name: string; quantity: number; lineTotal: number }[];
  netTotal: number; taxTotal: number; grandTotal: number;
}

/** menuFromDocument names items `cat-{n}-{ref}`; the order speaks refs. */
export function itemRefOf(menuItemId: string): string {
  const m = /^cat-\d+-(.+)$/.exec(menuItemId);
  return m ? m[1] : menuItemId;
}

/** menuFromDocument names a public option `{groupRef}-{index}`; the scan lists ids in that order. */
export function optionIdOf(ordering: PlaceOrdering, groupRef: string, optionId: string): string | null {
  const m = /-(\d+)$/.exec(optionId);
  const list = ordering.optionGroups[groupRef];
  if (!m || !list) return null;
  return list[Number(m[1])] ?? null;
}

export function orderableMenu(menu: Menu, ordering: PlaceOrdering | null): Menu {
  return {
    ...menu,
    items: menu.items.map((i) => (ordering && ordering.items[itemRefOf(i.id)] ? i : { ...i, inStock: false })),
  };
}

export function toScanLines(lines: readonly OrderLine[], ordering: PlaceOrdering): { lines: ScanOrderLine[]; unknown: string[] } {
  const out: ScanOrderLine[] = [];
  const unknown: string[] = [];
  for (const l of lines) {
    const entryId = ordering.items[itemRefOf(l.menuItemId)];
    const optionIds = l.modifiers.map((m) => optionIdOf(ordering, m.groupId, m.optionId));
    if (!entryId || optionIds.some((o) => o === null)) {
      unknown.push(l.lineId);
      continue;
    }
    const note = l.notes.trim();
    out.push({
      entryId,
      quantity: l.quantity,
      ...(optionIds.length ? { optionIds: optionIds as string[] } : {}),
      ...(note ? { note } : {}),
    });
  }
  return { lines: out, unknown };
}

export function reconcileCart(lines: readonly OrderLine[], menu: Menu, ordering: PlaceOrdering | null) {
  const keep: OrderLine[] = [];
  const dropped: OrderLine[] = [];
  const repriced: OrderLine[] = [];
  const byId = new Map(menu.items.map((i) => [i.id, i]));
  for (const l of lines) {
    const item = byId.get(l.menuItemId);
    const sendable = ordering ? toScanLines([l], ordering).unknown.length === 0 : false;
    if (!item || !sendable) {
      dropped.push(l);
      continue;
    }
    if (item.priceSar !== l.unitPriceSar) {
      const next = { ...l, unitPriceSar: item.priceSar };
      repriced.push(next);
      keep.push(next);
    } else keep.push(l);
  }
  return { keep, dropped, repriced };
}

export function cartSignature(lines: readonly OrderLine[]): string {
  return JSON.stringify(lines.map((l) => [l.menuItemId, l.quantity, l.notes.trim(), l.modifiers.map((m) => m.optionId)]));
}

/** One key per cart content: a retry of the same cart replays, a changed cart is a new order. */
export function idempotencyKeyFor(
  signature: string,
  previous: { signature: string; key: string } | null,
  newKey: () => string
): { signature: string; key: string } {
  return previous && previous.signature === signature ? previous : { signature, key: newKey() };
}

export type PlaceProblem = "notFound" | "closed" | "basisChanged" | "tooManyPending" | "rateLimited" | "invalid" | "network" | "generic";

export function placeProblemOf(status: number, errorCode: string | undefined): PlaceProblem {
  if (status === 0) return "network";
  if (errorCode === "order.intake.basis-changed") return "basisChanged";
  if (errorCode === "order.intake.unavailable" || errorCode === "order.intake.not-found") return "closed";
  if (errorCode === "order.intake.too-many-pending") return "tooManyPending";
  if (status === 429) return "rateLimited";
  if (status === 422) return "invalid";
  if (status === 404) return "notFound";
  return "generic";
}

export const PLACE_PROBLEM_KEY: Record<PlaceProblem, string> = {
  notFound: "store.place.error.notFound",
  closed: "store.place.error.closed",
  basisChanged: "store.place.error.basisChanged",
  tooManyPending: "store.place.error.tooManyPending",
  rateLimited: "store.place.error.rateLimited",
  invalid: "store.place.error.invalid",
  network: "store.place.error.network",
  generic: "store.place.error.generic",
};
```

- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat(customer): place-code ordering model, with tests` (only the two files).

---

### Task 2: PublicApi calls (customer, server side)

**Files:**
- Modify: `apps/customer/src/shared/api/public-api.ts` (add a POST-capable request and two functions next to `fetchMenuDocumentByCode`)
- Test: `apps/customer/src/shared/api/public-api.test.ts` (add cases using its existing fake `node:http` server)

**Interfaces — Produces:**
```ts
export type PlaceScanResult = { kind: "ok"; scan: PlaceScan } | { kind: "notFound" } | { kind: "error" };
export async function fetchPlaceScan(key: string, lang?: string | null): Promise<PlaceScanResult>;   // never cached (backend sends no-store)
export async function postPlaceOrder(key: string, body: unknown, idempotencyKey: string): Promise<{ status: number; body: string }>; // status 0 = network failure
```

- [ ] **Step 1: Failing tests** — read the top of `public-api.test.ts` to reuse its fake server helpers (it records the last request's method, path and headers). Add:
  - `fetchPlaceScan("K1", "ar-SA")` → requests `GET /v1/public/place-codes/K1?lang=ar`, returns `{ kind: "ok", scan }` for a 200 JSON body; `{ kind: "notFound" }` for 404; `{ kind: "error" }` for 500; two calls make two requests (no cache).
  - `postPlaceOrder("K1", { basis: "b", lines: [] }, "idem-1")` → `POST /v1/public/place-codes/K1/orders` with headers `Idempotency-Key: idem-1`, `Content-Type: application/json`, JSON body echoed; returns the server's status and raw body; with the server stopped (or an unreachable port via `PUBLIC_API_URL`), returns `{ status: 0, body: "" }`.
- [ ] **Step 2: Run — FAIL** (functions missing).
- [ ] **Step 3: Implement** — generalise the private `request()` into `send(method, host, path, { body?, headers? })` keeping `request()` as a thin GET wrapper so existing callers are untouched; then:

```ts
/** A scanned place code (`/p/{key}`): its table, its menu and whether it takes orders. Never cached. */
export async function fetchPlaceScan(key: string, lang?: string | null): Promise<PlaceScanResult> {
  const path = `/v1/public/place-codes/${encodeURIComponent(key)}${query({ lang: knownLocale(lang) })}`;
  try {
    const res = await request(BASE.host, path);
    if (res.status === 404) return { kind: "notFound" };
    if (res.status < 200 || res.status >= 300) return { kind: "error" };
    return { kind: "ok", scan: JSON.parse(res.body) as PlaceScan };
  } catch {
    return { kind: "error" };
  }
}

/** The place-code order request, forwarded as is. Status 0 means the API was not reached. */
export async function postPlaceOrder(key: string, body: unknown, idempotencyKey: string) {
  try {
    return await send("POST", BASE.host, `/v1/public/place-codes/${encodeURIComponent(key)}/orders`, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    });
  } catch {
    return { status: 0, body: "" };
  }
}
```
  (`send` resolves on any HTTP status — only socket errors and the timeout reject. POST timeout 10 s.)
- [ ] **Step 4: Run — PASS**, and the whole `public-api.test.ts` still passes.
- [ ] **Step 5: Commit** `feat(customer): PublicApi scan and order calls for place codes`.

---

### Task 3: Routing plumbing — middleware, per-code cart storage, route handler (customer)

**Files:**
- Modify: `apps/customer/src/shared/lib/merchant-origins.ts:40` (`isBareDocumentPath` also matches `/p/{key}` and `/api/place-orders/{key}`)
- Modify: `apps/customer/src/shared/lib/merchant-origins.test.ts` (cases)
- Modify: `apps/customer/src/entities/order/session-provider.tsx` (props `storageKey?: string`, `storage?: "local" | "session"`)
- Create: `apps/customer/src/shared/lib/place-storage.ts` + `place-storage.test.ts`
- Create: `apps/customer/src/app/api/place-orders/[key]/route.ts`

**Interfaces — Produces:**
```ts
export const cartStorageKey = (key: string) => `octo.placeCart.${key}`;
export const sentOrdersKey = (key: string) => `octo.placeOrders.${key}`;
export function readSentOrders(storage: Pick<Storage, "getItem"> | null, key: string): ScanOrderConfirmation[];
export function appendSentOrder(storage: Pick<Storage, "getItem" | "setItem"> | null, key: string, c: ScanOrderConfirmation): void; // newest first, max 20
// OrderingSessionProvider({ children, persist?, storageKey?, storage? })
// POST /api/place-orders/{key}  body { basis, lines }  header Idempotency-Key  → backend status + body
```

- [ ] **Step 1: Failing tests**
  - `merchant-origins.test.ts`: `isBareDocumentPath("/p/ABC")` true, `"/p/ABC/menu"` true, `"/p/"` false, `"/pickup"` false, `"/api/place-orders/ABC"` true; `/c/abc` still true.
  - `place-storage.test.ts`: keys differ per code (`cartStorageKey("A") !== cartStorageKey("B")`); `appendSentOrder` keeps newest first and caps at 20; `readSentOrders` returns `[]` for missing, malformed JSON, or a `null` storage; a throwing `setItem` does not throw out of `appendSentOrder`.
- [ ] **Step 2: Run — FAIL.**
- [ ] **Step 3: Implement**
  - `merchant-origins.ts:40`: `isCanvasPath(pathname) || /^\/c\/[^/]+/.test(pathname) || /^\/p\/[^/]+/.test(pathname) || /^\/api\/place-orders\/[^/]+/.test(pathname)` and update its comment ("…the QR menu (`/c/*`) and a place code (`/p/*`) — no tenant from the host").
  - `session-provider.tsx`: replace the constant `STORAGE_KEY` use with `storageKey ?? STORAGE_KEY` and `storage === "session" ? window.sessionStorage : window.localStorage` at the read (≈211) and write (≈230); defaults unchanged.
  - `place-storage.ts` as specified, every access in try/catch.
  - Route handler:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { postPlaceOrder } from "@/shared/api/public-api";

// The browser's target for a place-code order: forwards body and Idempotency-Key to PublicApi
// server-side (no CORS, no API origin in the page) and answers with the backend's own status and body.
export async function POST(request: NextRequest, { params }: { params: { key: string } }) {
  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) return NextResponse.json({ errorCode: "idempotency-key.missing" }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errorCode: "body.invalid" }, { status: 400 });
  }
  const res = await postPlaceOrder(params.key, body, idempotencyKey);
  if (res.status === 0) return NextResponse.json({ errorCode: "upstream.unreachable" }, { status: 502 });
  return new NextResponse(res.body || null, { status: res.status, headers: { "content-type": "application/json" } });
}
```
- [ ] **Step 4: Run — PASS** (plus full `npx vitest run` in apps/customer).
- [ ] **Step 5: Commit** `feat(customer): route /p/* without a tenant host, per-code cart storage, order proxy`.

---

### Task 4: `/p/[key]` layout, flow and browsing screens (customer)

**Files:**
- Modify: `apps/customer/src/shared/lib/table-flow.ts` (add `placeFlow(key)` and `PLACE_ROUTES(key)`)
- Modify: `apps/customer/src/shared/lib/flow-context.tsx` (`MobileFlowProvider` accepts `mode` **or** `flow`)
- Create: `apps/customer/src/features/place/place-scan-context.tsx` (`PlaceScanProvider`, `usePlaceScan()`)
- Create: `apps/customer/src/views/place/welcome-view.tsx`, `apps/customer/src/views/place/unavailable-view.tsx`, `apps/customer/src/views/place/index.ts`
- Create: `apps/customer/src/app/p/[key]/layout.tsx`, `page.tsx`, `menu/page.tsx`, `menu/[item]/page.tsx`, `cart/page.tsx`, `not-found.tsx`
- Test: `apps/customer/src/shared/lib/table-flow.test.ts` (create if absent) for `placeFlow`

**Interfaces — Produces:**
```ts
export function placeFlow(key: string): MobileFlow; // mode "table"; home/menu/menuIndex `/p/{k}/menu`, bestSellers `/p/{k}/menu?best=1`, offers `/p/{k}/menu`, cart `/p/{k}/cart`, checkout `/p/{k}/send`, booking `/p/{k}/menu`
export const PLACE_ROUTES: (key: string) => { welcome: string; menu: string; cart: string; send: string; order: string; orders: string };
// MobileFlowProvider({ mode?, flow?, children })  — flow wins when given
// PlaceScanProvider({ value: { key: string; scan: PlaceScan; menu: Menu; ordering: PlaceOrdering | null }, children }); usePlaceScan()
```

- [ ] **Step 1: Failing test** — `placeFlow("K")` gives `/p/K/menu`, `/p/K/cart`, `/p/K/send`; `flowItemHref(placeFlow("K"), "cat-1-i1") === "/p/K/menu/cat-1-i1"`; `encodeURIComponent` applied to a key with odd characters.
- [ ] **Step 2: FAIL. Step 3: Implement** `placeFlow`, `PLACE_ROUTES`, and `MobileFlowProvider({ mode, flow, children })` → `value={flow ?? MOBILE_FLOWS[mode ?? "table"]}` (pickup layout keeps passing `mode="pickup"`).
- [ ] **Step 4: PASS.**
- [ ] **Step 5: Layout** `app/p/[key]/layout.tsx` (server):

```tsx
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PlaceLayout({ params, children }: { params: { key: string }; children: ReactNode }) {
  const lang = headers().get("accept-language")?.split(",")[0]?.trim() || null;
  const cookieLang = cookies().get(LOCALE_COOKIE_NAME)?.value ?? null;   // the table top card's language switch
  const result = await fetchPlaceScan(params.key, cookieLang ?? lang);
  if (result.kind === "notFound") notFound();
  const scan = result.kind === "ok" ? result.scan : null;
  const language = scan?.menu?.language ?? cookieLang ?? defaultLocale;
  const locale: Locale = (locales as readonly string[]).includes(language) ? (language as Locale) : defaultLocale;
  const menu = scan?.menu ? orderableMenu(menuFromDocument(scan.menu), scan.ordering ?? null) : { categories: [], items: [] };
  return (
    <StoreI18nProvider locale={locale}>
      <div dir={getDirection(locale)} lang={locale} className="mx-auto min-h-dvh w-full max-w-[480px] bg-gray-50 [font-family:var(--font-family-active),var(--font-arabic-loaded)]">
        {!scan || scan.status !== "open" ? (
          <PlaceUnavailableView reason={scan ? scan.reason ?? "place" : "error"} />
        ) : (
          <TableBrandProvider brand={{ name: scan.menu?.menu.name ?? "", logoUrl: scan.menu?.menu.theme.logo?.url ?? null, branchName: scan.menu?.locationLabel ?? undefined, languages: scan.menu?.availableLanguages }}>
            <MobileFlowProvider flow={placeFlow(params.key)}>
              <OrderingSessionProvider storageKey={cartStorageKey(params.key)} storage="session">
                <PlaceScanProvider value={{ key: params.key, scan, menu, ordering: scan.ordering ?? null }}>{children}</PlaceScanProvider>
              </OrderingSessionProvider>
            </MobileFlowProvider>
          </TableBrandProvider>
        )}
      </div>
    </StoreI18nProvider>
  );
}
```
  (Imports: `cookies, headers` from `next/headers`; `notFound`; `defaultLocale, getDirection, locales, type Locale` from `@i18n/index`; `LOCALE_COOKIE_NAME` from wherever `table-top-card.tsx` imports it; `StoreI18nProvider` from `@/app/providers`; `fetchPlaceScan`, `menuFromDocument` from `@/shared/api/public-api`; `orderableMenu` from `@/shared/lib/place-order`; `cartStorageKey`; `placeFlow`; `MobileFlowProvider`; `OrderingSessionProvider` from `@/entities/order`; `TableBrandProvider` from `@/widgets/table-shell`.) The scan's `ordering` and `place` reach client views only through `PlaceScanProvider` (serializable props).

- [ ] **Step 6: Screens**
  - `page.tsx` → `<PlaceWelcomeView />`: brand logo + name, "Table {number}" (+ name/zone), a primary `TableButton href={PLACE_ROUTES(key).menu}` labelled `store.place.start`; when `ordering` is null a muted note `store.place.browseOnly`. On mount calls `useOrderingSession().setTable(scan.place.number)` and `setChannel(null, "dine_in")` — check `setChannel`'s first parameter type and pass `""` if it is not nullable.
  - `menu/page.tsx` → `<Suspense fallback={null}><PlaceMenu /></Suspense>` where the client wrapper reads `usePlaceScan().menu` and renders `<TableMenuView categories={menu.categories} items={menu.items} groups={getMenuGroups()} />` plus, when `ordering` is null, a sticky banner `store.place.browseOnly`.
  - `menu/[item]/page.tsx` → client wrapper finds `item` in `usePlaceScan().menu.items` by `params.item` (`notFound()` equivalent: render `PlaceUnavailableView reason="item"`), renders `<Suspense><TableProductView item={item} items={menu.items} /></Suspense>`.
  - `cart/page.tsx` → `<TableCartView items={usePlaceScan().menu.items} />` (its checkout button already goes to `flow.checkout` = `/p/{k}/send`).
  - `PlaceUnavailableView({ reason: "place" | "menu" | "item" | "error" })`: icon + `store.place.unavailable.{reason}.title/body`; for `"menu"` and `"error"` a Retry button doing `router.refresh()`.
  - `not-found.tsx` → `store.place.error.notFound` page (no reason given).
- [ ] **Step 7: Verify** `npx tsc -p apps/customer/tsconfig.json --noEmit` (no new errors), `npx vitest run` in apps/customer; manual: `/p/<a real key>` shows welcome → menu → item → cart; `/table/*` unchanged; `/c/<key>` unchanged.
- [ ] **Step 8: Commit** `feat(customer): /p/[key] — welcome, menu, item and cart from the scanned code`.

---

### Task 5: Send, confirmation and my orders (customer)

**Files:**
- Create: `apps/customer/src/views/place/send-view.tsx`, `order-view.tsx`, `orders-view.tsx`
- Create: `apps/customer/src/app/p/[key]/send/page.tsx`, `order/page.tsx`, `orders/page.tsx`

**Interfaces — Consumes:** Task 1 (`toScanLines`, `reconcileCart`, `cartSignature`, `idempotencyKeyFor`, `placeProblemOf`, `PLACE_PROBLEM_KEY`, `orderableMenu`, types), Task 3 (`appendSentOrder`, `readSentOrders`, `/api/place-orders/{key}`), Task 4 (`usePlaceScan`, `PLACE_ROUTES`).

- [ ] **Step 1: `PlaceSendView`** — summary of `useOrderingSession().state.lines` (name × qty, estimated line total, estimated total via `computeTableBill(lines, 0, null)`), a note `store.place.estimate`, and the Send button:

```ts
const idem = useRef<{ signature: string; key: string } | null>(null);
const [pending, setPending] = useState(false);
const [problem, setProblem] = useState<PlaceProblem | null>(null);

async function send() {
  if (pending || !ordering) return;
  const { lines, unknown } = toScanLines(state.lines, ordering);
  if (unknown.length || lines.length === 0) return setProblem("basisChanged");
  idem.current = idempotencyKeyFor(cartSignature(state.lines), idem.current, () => crypto.randomUUID());
  setPending(true);
  setProblem(null);
  try {
    const res = await fetch(`/api/place-orders/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idem.current.key },
      body: JSON.stringify({ basis: ordering.basis, lines }),
    });
    const text = await res.text();
    if (res.ok) {
      const confirmation = JSON.parse(text) as ScanOrderConfirmation;
      appendSentOrder(safeLocalStorage(), key, confirmation);
      clearCart();
      idem.current = null;
      router.push(`${PLACE_ROUTES(key).order}?ref=${encodeURIComponent(confirmation.reference)}`);
      return;
    }
    let code: string | undefined;
    try { code = (JSON.parse(text) as { errorCode?: string }).errorCode; } catch { /* not JSON */ }
    const p = res.status === 502 ? "network" : placeProblemOf(res.status, code);
    if (p === "basisChanged") {
      router.refresh();          // the layout re-scans; the effect below reconciles the cart against the new menu
      setStale(true);
    }
    setProblem(p);
  } catch {
    setProblem("network");
  } finally {
    setPending(false);
  }
}
```
  - Effect when `stale` and the scan's `ordering.basis` changed: `reconcileCart(state.lines, menu, ordering)`; for each dropped line `removeLine`, for each repriced line `replaceLine(...)` with the new price; then `setStale(false)` and keep `problem === "basisChanged"` showing `store.place.error.basisChanged` (with "{n} items removed" when any were dropped).
  - Send button: `disabled={pending || !ordering || state.lines.length === 0}`, label `pending ? store.place.sending : problem === "network" ? store.place.sendAgain : store.place.send`.
  - `ordering === null` → the button is replaced by `store.place.browseOnly`.
  - `safeLocalStorage()` returns `window.localStorage` inside try/catch, else `null`.
- [ ] **Step 2: `PlaceOrderView`** — reads `?ref=`, finds it in `readSentOrders(safeLocalStorage(), key)`; shows reference, lines (`name × quantity`, `lineTotal`), net / tax / grand total in the confirmation's currency, the note `store.place.payAtTable`, and buttons `store.place.orderMore` (→ menu) and `store.place.myOrders` (→ orders). Unknown ref → link to orders.
- [ ] **Step 3: `PlaceOrdersView`** — `readSentOrders(...)` newest first: reference, item count, grand total; empty state `store.place.noOrders`; a muted line `store.place.ordersLocalHint` ("Orders sent from this phone").
- [ ] **Step 4: Pages** `send/page.tsx`, `order/page.tsx` (wrap in `<Suspense>` for `useSearchParams`), `orders/page.tsx` render the views.
- [ ] **Step 5: Verify** tsc + vitest; manual against the running backend: send an order → confirmation with the server's reference and totals; tap Send twice quickly → one order; kill the network mid-send → "Send again" re-sends with the same key (merchant shows one order).
- [ ] **Step 6: Commit** `feat(customer): send a place-code order, confirmation and this phone's orders`.

---

### Task 6: Customer strings (en + ar)

**Files:** `packages/i18n/src/locales/{en,ar}/index.ts` (anchor: after the last `store.table.*` key). Stage HEAD+keys only.

| key | en | ar |
|---|---|---|
| `store.place.start` | Start ordering | ابدأ الطلب |
| `store.place.tableLabel` | Table {n} | طاولة {n} |
| `store.place.browseOnly` | Ordering from your phone isn't available right now — ask staff. | الطلب من الجوال غير متاح الآن — اطلب من الموظف. |
| `store.place.send` | Send order | إرسال الطلب |
| `store.place.sending` | Sending… | جارٍ الإرسال… |
| `store.place.sendAgain` | Send again | إعادة الإرسال |
| `store.place.estimate` | Estimated — the restaurant confirms the final total. | تقديري — يؤكد المطعم الإجمالي النهائي. |
| `store.place.payAtTable` | Your order reached the restaurant. Payment is at the table. | وصل طلبك إلى المطعم. الدفع عند الطاولة. |
| `store.place.orderReference` | Order {ref} | الطلب {ref} |
| `store.place.subtotal` | Subtotal | المجموع الفرعي |
| `store.place.tax` | Tax | الضريبة |
| `store.place.total` | Total | الإجمالي |
| `store.place.orderMore` | Order something else | اطلب شيئًا آخر |
| `store.place.myOrders` | My orders | طلباتي |
| `store.place.noOrders` | No orders sent from this phone yet. | لم تُرسل أي طلبات من هذا الجوال بعد. |
| `store.place.ordersLocalHint` | Orders sent from this phone | الطلبات المرسلة من هذا الجوال |
| `store.place.itemsRemoved` | {n} items were removed from your cart. | تمت إزالة {n} من العناصر من سلتك. |
| `store.place.unavailable.place.title` | This table isn't taking orders | هذه الطاولة لا تستقبل طلبات |
| `store.place.unavailable.place.body` | Please ask a member of staff. | يرجى التواصل مع أحد الموظفين. |
| `store.place.unavailable.menu.title` | The menu isn't available right now | القائمة غير متاحة الآن |
| `store.place.unavailable.menu.body` | Try again in a moment. | حاول مرة أخرى بعد قليل. |
| `store.place.unavailable.item.title` | This item isn't on the menu | هذا الصنف غير موجود في القائمة |
| `store.place.unavailable.item.body` | Go back to the menu to pick something else. | ارجع إلى القائمة لاختيار شيء آخر. |
| `store.place.unavailable.error.title` | Something went wrong | حدث خطأ ما |
| `store.place.unavailable.error.body` | Check your connection and try again. | تحقق من الاتصال وحاول مرة أخرى. |
| `store.place.retry` | Try again | حاول مرة أخرى |
| `store.place.error.notFound` | This code isn't working — ask staff for a new one. | هذا الرمز لا يعمل — اطلب رمزًا جديدًا من الموظف. |
| `store.place.error.closed` | Phone ordering just closed — please ask staff. | أُغلق الطلب من الجوال للتو — يرجى التواصل مع الموظف. |
| `store.place.error.basisChanged` | The menu was updated — check your cart and send again. | تم تحديث القائمة — راجع سلتك وأرسل مرة أخرى. |
| `store.place.error.tooManyPending` | You have orders the restaurant hasn't answered yet — please wait. | لديك طلبات لم يرد عليها المطعم بعد — يرجى الانتظار. |
| `store.place.error.rateLimited` | Too many tries — wait a minute and try again. | محاولات كثيرة — انتظر دقيقة وحاول مرة أخرى. |
| `store.place.error.invalid` | Something in your cart can't be ordered — please review it. | يوجد عنصر في سلتك لا يمكن طلبه — يرجى المراجعة. |
| `store.place.error.network` | Couldn't reach the restaurant. Your order wasn't lost — send again. | تعذّر الوصول إلى المطعم. طلبك لم يضِع — أرسله مرة أخرى. |
| `store.place.error.generic` | Something went wrong. Please try again. | حدث خطأ ما. يرجى المحاولة مرة أخرى. |

- [ ] Add (both locales), run `cd apps/customer && npx vitest run src/shared/i18n/keys.test.ts` → PASS, commit `feat(i18n): place-code ordering strings`.

> Order of execution: do Task 6 **before** Task 4's manual check (views use these keys). It is listed separately so its commit stays reviewable.

---

### Task 7: Order contracts and the occupancy client (api-client)

**Files:**
- Modify: `packages/api-client/src/contracts/order-admin.ts` (`OrderResponse` + `OrderSummaryResponse` gain `intakeKind?: string | null; intakeCodeId?: string | null; occupancyId?: string | null`; `ListOrdersParams` gains `selfService?: boolean; intakeCodeId?: string; occupancyId?: string`)
- Modify: `packages/api-client/src/lib/order-admin-client.ts` (`listOrders` passes the three new params; four occupancy functions)
- Create: `packages/api-client/src/contracts/occupancy.ts`; export from `packages/api-client/src/index.ts`
- Test: `apps/merchant/src/entities/order/occupancy.test.ts` (merchant has vitest; api-client has none) for the pure helper below

**Interfaces — Produces:**
```ts
export interface OccupancyPlace { sourceKey: string; containerId: string; resourceId: string; code: string; displayName: string; }
export interface OccupancyResponse { id: string; businessId: string; branchId: string | null; place: OccupancyPlace; status: "open" | "closed" | string; openedVia: string; openedByAccountId: string | null; openedAtUtc: string; closedAtUtc: string | null; closedByAccountId: string | null; reopenCount: number; orderCount: number; unacceptedOrderCount: number; version: number; }
export function getOpenOccupancy(businessId: string, resourceId: string): Promise<OccupancyResponse>;   // GET /orders/occupancies?resourceId=
export function getOccupancy(businessId: string, occupancyId: string): Promise<OccupancyResponse>;
export function closeOccupancy(businessId: string, occupancyId: string, expectedVersion: number): Promise<OccupancyResponse>;
export function reopenOccupancy(businessId: string, occupancyId: string, expectedVersion: number): Promise<OccupancyResponse>;
// merchant: entities/order/occupancy.ts
export type OccupancyProblem = "hasUnaccepted" | "alreadyOpen" | "stale" | "forbidden" | "generic";
export function occupancyProblemOf(e: unknown): { problem: OccupancyProblem; detail: string | null };
```
- [ ] **Step 1: Failing test** for `occupancyProblemOf`: `ApiError(409, { errorCode: "order.occupancy.has-unaccepted-orders", detail: "#101, #102" })` → `{ problem: "hasUnaccepted", detail: "#101, #102" }`; `place-already-open` → `alreadyOpen`; 409 with `…stale`/`concurrency` code → `stale`; 403 → `forbidden`; anything else → `generic`.
- [ ] **Step 2: FAIL. Step 3: Implement** contracts, client functions (`apiRequest` with `{ method: "POST", body: { expectedVersion } }` for close/reopen), and `occupancyProblemOf`. Before implementing the stale mapping, read the occupancy endpoints on backend main (`git -C ../octopus-backend-main show HEAD:src/Modules/Order/Octopus.Modules.Order.Api/Occupancies/OccupancyEndpoints.cs`) for the exact stale error code and the JSON casing of `status`; adjust the union and the test to match.
- [ ] **Step 4: PASS; `npx tsc -p apps/merchant/tsconfig.json --noEmit` clean.**
- [ ] **Step 5: Commit** `feat(api-client): order intake fields and the table session client`.

---

### Task 8: Table session card on the order page (merchant)

**Files:**
- Create: `apps/merchant/src/pages/orders-list/details/session-card.tsx`
- Modify: `apps/merchant/src/pages/orders-list/details/details-view.tsx:61-67` (add the card to the bottom grid when `order.occupancyId`)
- Modify: `apps/merchant/src/entities/order/order-record-bridge.ts` (map `intakeKind === "self-service"` to `OrderRecord.selfService?: boolean`) and `apps/merchant/src/pages/orders-list/_shared/types.ts` (`selfService?: boolean` on `OrderRecord`)
- Modify: `apps/merchant/src/pages/orders-list/_shared/order-row.tsx:210` (next to the source chip, when `order.selfService`: a second chip `orders.session.byCustomer`)
- Strings: `orders.session.*` (en/ar), staged as HEAD+keys.

**Interfaces — Consumes:** Task 7.

- [ ] **Step 1: Failing test** in `apps/merchant/src/entities/order/order-record-bridge.test.ts` (create if absent): an `OrderResponse` fixture with `intakeKind: "self-service"` maps to `selfService: true`; without it → `false`.
- [ ] **Step 2: FAIL. Step 3: Implement** the bridge field + chip.
- [ ] **Step 4: `SessionCard({ order })`** — loads `getOccupancy(businessId, order.occupancyId)`; shows status (open/closed), "opened {time}" (`formatDate` style used by `bottom-cards.tsx`), `orderCount`, `unacceptedOrderCount` (amber when > 0), `reopenCount`; buttons **Close session** (open only) and **Reopen** (closed only), each disabled while pending; on success replace the card's state with the response; on failure `occupancyProblemOf(e)` → toast/inline text `orders.session.error.{problem}` with `{detail}` for `hasUnaccepted` / `alreadyOpen`; `stale` → reload the card. Style: copy `MetadataCard`'s wrapper (`CardTitle`, `LINE_COLOR`, `InfoRow`) from `bottom-cards.tsx`.

| key | en | ar |
|---|---|---|
| `orders.session.title` | Table session | جلسة الطاولة |
| `orders.session.open` | Open | مفتوحة |
| `orders.session.closed` | Closed | مغلقة |
| `orders.session.openedAt` | Opened | فُتحت |
| `orders.session.orders` | Orders | الطلبات |
| `orders.session.unanswered` | Waiting for an answer | بانتظار الرد |
| `orders.session.reopened` | Reopened | أعيد فتحها |
| `orders.session.close` | Close session | إغلاق الجلسة |
| `orders.session.reopen` | Reopen | إعادة الفتح |
| `orders.session.byCustomer` | Ordered by customer | طلب من العميل |
| `orders.session.error.hasUnaccepted` | Accept or decline these orders first: {detail} | اقبل أو ارفض هذه الطلبات أولًا: {detail} |
| `orders.session.error.alreadyOpen` | This table already has an open session: {detail} | لهذه الطاولة جلسة مفتوحة بالفعل: {detail} |
| `orders.session.error.stale` | The session changed — showing the latest. | تغيّرت الجلسة — تم عرض أحدث حالة. |
| `orders.session.error.forbidden` | You don't have permission to do that. | ليس لديك صلاحية للقيام بذلك. |
| `orders.session.error.generic` | Something went wrong. Please try again. | حدث خطأ ما. يرجى المحاولة مرة أخرى. |

- [ ] **Step 5: Verify** merchant tsc + vitest (compare with the 4 known `table-picking.test.ts` failures); manual: open an order placed from `/p/…` → chip "Ordered by customer", session card; Close with an unanswered order → the error names it; decline it (no PIN asked — existing flow) → Close works → Reopen works.
- [ ] **Step 6: Commit** `feat(merchant): customer-order chip and the table session card`.

---

### Task 9: Final verification

- [ ] customer: `npx tsc -p apps/customer/tsconfig.json --noEmit`, `cd apps/customer && npx vitest run`; merchant: tsc + vitest (only the 4 known failures).
- [ ] `/table/*`, `/c/{key}`, `/pickup/*` render as before (manual).
- [ ] Full manual pass AR + EN on a phone-width window: scan → order → merchant sees it → decline without PIN → session close/reopen.
- [ ] Ask the user before merging to `main` and before pushing.
