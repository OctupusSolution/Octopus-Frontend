# Table Place Codes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the localStorage-backed Table QR page (`/reservations/floor-plan/qr`) with the backend's place codes, and add the lifecycle actions, activity timeline, attention list and print history the backend supports.

**Architecture:** A typed client in `packages/api-client` (one function per route). A pure mapping module in the page folder (`place-codes-model.ts`, unit-tested) turns DTOs into the page's view shapes. A React hook (`use-place-codes.ts`) loads floors and rows, runs mutations and refetches. The existing components switch from `useTableQr()` to that hook; new modals sit beside them in the same folder and style.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind, vitest (merchant app), npm workspaces + turbo.

**Spec:** `docs/superpowers/specs/2026-10-15-table-place-codes-design.md`. Backend contract: `octopus-backend` `main` → `specs/011-table-qr-codes/contracts/http-endpoints.md` and `src/Modules/Menu/Octopus.Modules.Menu.Contracts/Dtos/PlaceCodes/*.cs` (read with `git -C ../octopus-backend show main:<path>`).

## Global Constraints

- Branch: `feature/table-place-codes`; merged to `main` at the end. Commit messages carry **no** Claude/Co-Authored-By lines.
- **Never modify** `octopus-backend*` repos or their Docker stack.
- Every user-visible string goes through `t()` with keys in **both** `packages/i18n/src/locales/en/index.ts` and `packages/i18n/src/locales/ar/index.ts`, under `floorPlan.qr.*`.
- Style: reuse `qr/theme.ts` and `../../_shared/theme` classes; every surface has its `[[data-theme=dark]_&]` variant like its neighbours.
- Admin base path: `/v1/businesses/{businessId}/menu/place-codes`. Business id = `useAuth().activeBusinessId`.
- Scan statistics (scans, first/last scan) are removed from the UI. The menu Theme-step QR (`pages/menu/build/theme/qr-panel.tsx`) is not touched.
- Code state never goes to `localStorage`. Only per-browser print-layout prefs (paper, margins, perPage, background, qrStyle, tentSize, logo) may, under key `octo.qrPrintPrefs.{businessId}`, wrapped in try/catch.
- Request ids (`batchId`, `operationId`) come from `crypto.randomUUID()`, made **once per user action** and reused if that same action is retried.
- Addresses (`address`) are shown only when the server sends them; never built client-side.

## Review Focus

1. **A table on the drawn plan has no matching row** (plan published after the code list was read, or ids differ) → table shows as `notGenerated`, never crashes; join falls back from `resourceId` to `number`. Test in Task 2.
2. **Stale revision (409 `menu.place-code.stale`) on disable/regenerate/relink/revoke** → toast "changed by someone else", list refetched, modal shows fresh state. Test of the error-key mapping in Task 2; behaviour in Task 6.
3. **Double click on Generate / Print** → one `batchId` per review screen, button disabled while in flight; a repeat answers `replayed: true` and is treated as success. Test in Task 2 (`planGenerate` keeps ids stable is the hook's job — covered by Task 5 step "disable while pending").
4. **`menu:place-codes` not purchased (403 `entitlements.feature-not-enabled`)** → full-page empty state, not a toast loop. Test of `classifyLoadError` in Task 2.
5. **Selection > 500 tables or a print run > 500 codes** → client splits nothing silently; it blocks with the translated `selection-too-large` message before sending. Test of `chunkGuard` in Task 2.

---

### Task 1: API client — place-code contracts and functions

**Files:**
- Create: `packages/api-client/src/contracts/place-codes.ts`
- Create: `packages/api-client/src/lib/place-codes-client.ts`
- Modify: `packages/api-client/src/index.ts` (append two export lines)

**Interfaces:**
- Produces (exact names used by later tasks): types `PlaceCodeStatus`, `PlaceCodeCounts`, `PlaceCodeLastPrint`, `PlaceCodeFloor`, `PlaceCodeFloorsResponse`, `PlaceCodeRow`, `PlaceCodeCandidate`, `PlaceCodeAttention`, `PlaceCodeListResponse`, `PlaceCodeDetail`, `GeneratedPlaceCode`, `KeptPlaceCode`, `GeneratePlaceCodesResponse`, `PlaceCodeLifecycle`, `BulkPlaceCodeLifecycleResponse`, `PlaceCodeActivityKind`, `PlaceCodeActivityEntry`, `PlaceCodeHistoryStatus`, `PlaceCodeActivityResponse`, `RebuildPlaceCodeHistoryResponse`, `PlaceCodeDesign`, `PlaceCodePrintRun`, `PlaceCodeSelection`, `GeneratePlaceCodesRequest`, `PlaceCodeDesignRequest`; functions `listPlaceCodeFloors`, `listPlaceCodes`, `getPlaceCode`, `listPlaceCodeActivity`, `generatePlaceCodes`, `disablePlaceCodes`, `enablePlaceCodes`, `regeneratePlaceCode`, `relinkPlaceCode`, `revokePlaceCode`, `rebuildPlaceCodeHistory`, `getPlaceCodeSymbol`, `getPlaceCodeDesign`, `updatePlaceCodeDesign`, `recordPlaceCodePrintRun`, `listPlaceCodePrintRuns`, `getPlaceCodeBundle`.

- [ ] **Step 1: Write the contracts file**

```ts
// packages/api-client/src/contracts/place-codes.ts
// Table place codes (Menu module, US-020). 1:1 with
// Octopus.Modules.Menu.Contracts/Dtos/PlaceCodes/*.cs, camelCased.
// Dates are ISO strings. `address` is sent only to print/manage holders.

export type PlaceCodeStatus = "active" | "notGenerated" | "needsReprint" | "disabled";

export interface PlaceCodeCounts {
  places: number; active: number; notGenerated: number; needsReprint: number;
  disabled: number; neverPrinted: number; blocked: number; suspended: number;
}
export interface PlaceCodeLastPrint { printedAtUtc: string; printedBy: string | null; itemCount: number }
export interface PlaceCodeFloor { floorId: string; name: string; version: number; counts: PlaceCodeCounts }
export interface PlaceCodeFloorsResponse { floors: PlaceCodeFloor[]; suspended: number; lastPrint: PlaceCodeLastPrint | null }

export interface PlaceCodeRow {
  floorId: string; resourceId: string; number: string; name: string | null;
  zoneId: string | null; zone: string | null; capacity: number;
  status: PlaceCodeStatus; neverPrinted: boolean; blocked: boolean;
  codeId: string | null; version: number | null; revision: number | null;
  generatedAtUtc: string | null; hiddenFromCustomers: boolean;
}
export interface PlaceCodeCandidate { floorId: string; resourceId: string; number: string; name: string | null }
export interface PlaceCodeAttention {
  codeId: string; floorId: string; resourceId: string;
  lastKnownNumber: string | null; lastKnownName: string | null;
  version: number; revision: number; candidate: PlaceCodeCandidate | null;
}
export interface PlaceCodeListResponse {
  items: PlaceCodeRow[]; page: number; pageSize: number; totalCount: number;
  counts: PlaceCodeCounts; attention: PlaceCodeAttention[]; lastPrint: PlaceCodeLastPrint | null;
}
export interface PlaceCodeDetail {
  codeId: string; floorId: string; resourceId: string; status: PlaceCodeStatus | "revoked" | "suspended";
  number: string | null; name: string | null; zone: string | null; floorName: string | null;
  neverPrinted: boolean; blocked: boolean; version: number; revision: number;
  generatedAtUtc: string; generatedBy: string | null;
  lastPrintedAtUtc: string | null; lastPrintedBy: string | null; printedCount: number;
  address: string | null; candidate: PlaceCodeCandidate | null;
}
export interface GeneratedPlaceCode {
  codeId: string; floorId: string; resourceId: string; number: string; name: string | null;
  zone: string | null; version: number; address: string; replacesCodeId: string | null;
}
export interface KeptPlaceCode { codeId: string; floorId: string; resourceId: string; number: string; name: string | null; version: number }
export interface GeneratePlaceCodesResponse {
  batchId: string; replayed: boolean; created: GeneratedPlaceCode[]; replaced: GeneratedPlaceCode[]; kept: KeptPlaceCode[];
}
export interface PlaceCodeLifecycle {
  codeId: string; status: string; version: number; revision: number; floorId: string; resourceId: string; replayed: boolean;
}
export interface BulkPlaceCodeLifecycleResponse {
  operationId: string; applied: number; unchanged: number; replayed: number; codes: PlaceCodeLifecycle[];
}
export type PlaceCodeActivityKind = "Generated" | "Disabled" | "Enabled" | "Relinked" | "Revoked" | "Printed" | "Exported";
export interface PlaceCodeActivityEntry {
  kind: PlaceCodeActivityKind; generation: number; revision: number | null; occurredAtUtc: string;
  actor: string | null; placeNumber: string | null; placeName: string | null; reconstructed: boolean;
}
export interface PlaceCodeHistoryStatus {
  complete: boolean; expected: number; recorded: number; missing: { generation: number; revision: number }[];
}
export interface PlaceCodeActivityResponse { entries: PlaceCodeActivityEntry[]; history: PlaceCodeHistoryStatus }
export interface RebuildPlaceCodeHistoryResponse { inserted: boolean; revision: number; history: PlaceCodeHistoryStatus }
export interface PlaceCodeDesign {
  templateKey: string; logoAssetId: string | null; primaryColour: string | null; message: string | null;
  showLabel: boolean; labelStyle: string; sizeKey: string; version: number;
  updatedAtUtc: string | null; updatedBy: string | null;
}
export interface PlaceCodePrintRun {
  runId: string; printedAtUtc: string; printedBy: string | null; itemCount: number; designVersion: number; format: "svg" | "png";
}

export type PlaceCodeSelection =
  | { mode: "one"; resourceId: string }
  | { mode: "zone"; zoneId: string }
  | { mode: "range"; from: string; to: string }
  | { mode: "all" };
export interface GeneratePlaceCodesRequest {
  batchId: string; floorId: string; selection: PlaceCodeSelection;
  existing: "keep" | "regenerate"; confirmReplaceCount?: number;
}
export interface PlaceCodeDesignRequest {
  expectedVersion: number; templateKey: string; logoAssetId: string | null; primaryColour: string | null;
  message: string | null; showLabel: boolean; labelStyle: string; sizeKey: string;
}
```

> If the backend JSON for `status`/`kind`/`format` differs in casing at runtime (check one real response in the Network tab during Task 3's manual check), fix the union here and in Task 2's mapper — nothing else depends on the literal casing.

- [ ] **Step 2: Write the client**

```ts
// packages/api-client/src/lib/place-codes-client.ts
// Table place codes — AdminApi, /v1/businesses/{businessId}/menu/place-codes.
// Lifecycle commands replay on `operationId` (generate on `batchId`); the
// Idempotency-Key header is not read by these routes.
import type { ListEnvelope } from "../contracts/menu-admin";
import type {
  BulkPlaceCodeLifecycleResponse, GeneratePlaceCodesRequest, GeneratePlaceCodesResponse,
  PlaceCodeActivityResponse, PlaceCodeDesign, PlaceCodeDesignRequest, PlaceCodeDetail,
  PlaceCodeFloorsResponse, PlaceCodeLifecycle, PlaceCodeListResponse, PlaceCodePrintRun,
  PlaceCodeSelection, PlaceCodeStatus, RebuildPlaceCodeHistoryResponse,
} from "../contracts/place-codes";
import { apiDownload, apiRequest, type ApiDownload } from "./http";

const base = (businessId: string) => `/v1/businesses/${businessId}/menu/place-codes`;

export function listPlaceCodeFloors(businessId: string): Promise<PlaceCodeFloorsResponse> {
  return apiRequest(`${base(businessId)}/floors`);
}

export function listPlaceCodes(
  businessId: string,
  filter: { floorId: string; zoneId?: string; status?: PlaceCodeStatus; neverPrinted?: boolean; search?: string; page?: number; size?: number }
): Promise<PlaceCodeListResponse> {
  return apiRequest(base(businessId), {
    query: {
      floorId: filter.floorId, zoneId: filter.zoneId, status: filter.status,
      neverPrinted: filter.neverPrinted?.toString(), search: filter.search,
      page: filter.page?.toString(), size: filter.size?.toString(),
    },
  });
}

export function getPlaceCode(businessId: string, codeId: string): Promise<PlaceCodeDetail> {
  return apiRequest(`${base(businessId)}/${codeId}`);
}

export function listPlaceCodeActivity(businessId: string, codeId: string): Promise<PlaceCodeActivityResponse> {
  return apiRequest(`${base(businessId)}/${codeId}/activity`);
}

export function generatePlaceCodes(businessId: string, request: GeneratePlaceCodesRequest): Promise<GeneratePlaceCodesResponse> {
  return apiRequest(`${base(businessId)}/generate`, { method: "POST", body: request });
}

type BulkTarget =
  | { codes: { codeId: string; expectedRevision?: number }[] }
  | { floorId: string; selection: PlaceCodeSelection };

export function disablePlaceCodes(businessId: string, operationId: string, target: BulkTarget): Promise<BulkPlaceCodeLifecycleResponse> {
  return apiRequest(`${base(businessId)}/disable`, { method: "POST", body: { businessId, operationId, ...target } });
}

export function enablePlaceCodes(businessId: string, operationId: string, target: BulkTarget): Promise<BulkPlaceCodeLifecycleResponse> {
  return apiRequest(`${base(businessId)}/enable`, { method: "POST", body: { businessId, operationId, ...target } });
}

export function regeneratePlaceCode(
  businessId: string, codeId: string, operationId: string, expectedRevision?: number
): Promise<GeneratePlaceCodesResponse["created"][number]> {
  return apiRequest(`${base(businessId)}/${codeId}/regenerate`, { method: "POST", body: { businessId, codeId, operationId, expectedRevision } });
}

export function relinkPlaceCode(
  businessId: string, codeId: string, operationId: string, resourceId: string, expectedRevision?: number
): Promise<PlaceCodeLifecycle> {
  return apiRequest(`${base(businessId)}/${codeId}/relink`, { method: "POST", body: { businessId, codeId, operationId, expectedRevision, resourceId } });
}

export function revokePlaceCode(businessId: string, codeId: string, operationId: string, expectedRevision?: number): Promise<PlaceCodeLifecycle> {
  return apiRequest(`${base(businessId)}/${codeId}/revoke`, { method: "POST", body: { businessId, codeId, operationId, expectedRevision } });
}

export function rebuildPlaceCodeHistory(businessId: string, codeId: string): Promise<RebuildPlaceCodeHistoryResponse> {
  return apiRequest(`${base(businessId)}/${codeId}/activity/rebuild`, { method: "POST", body: { businessId, codeId } });
}

/** Raw SVG/PNG bytes with the bearer token (an <img src> would 403). `size`
 *  is pixels per module, 4–40. Rate limited 30/min per user. */
export function getPlaceCodeSymbol(businessId: string, codeId: string, format: "svg" | "png", size = 10): Promise<ApiDownload> {
  return apiDownload(`${base(businessId)}/${codeId}/symbol`, { query: { format, size: String(size) } });
}

export function getPlaceCodeDesign(businessId: string): Promise<PlaceCodeDesign> {
  return apiRequest(`${base(businessId)}/design`);
}

export function updatePlaceCodeDesign(businessId: string, request: PlaceCodeDesignRequest): Promise<PlaceCodeDesign> {
  return apiRequest(`${base(businessId)}/design`, { method: "PUT", body: { businessId, ...request } });
}

/** Must be called BEFORE fetching any symbol or bundle for printing. */
export function recordPlaceCodePrintRun(
  businessId: string, request: { codeIds: string[]; format: "svg" | "png"; purpose?: "print" | "export" }
): Promise<PlaceCodePrintRun> {
  return apiRequest(`${base(businessId)}/print-runs`, { method: "POST", body: { businessId, ...request } });
}

export function listPlaceCodePrintRuns(businessId: string, page = 1): Promise<ListEnvelope<PlaceCodePrintRun>> {
  return apiRequest(`${base(businessId)}/print-runs`, { query: { page: String(page) } });
}

export function getPlaceCodeBundle(businessId: string, runId: string, size = 10): Promise<ApiDownload> {
  return apiDownload(`${base(businessId)}/print-runs/${runId}/bundle`, { query: { size: String(size) } });
}
```

> If `GET /print-runs` turns out to return a bare array or `{ items }` instead of `ListEnvelope` (check the endpoint's `.Produces<…>` in `PlaceCodeEndpoints.cs` lines 217–245 on backend `main`), change the return type here and the one consumer in Task 9.

- [ ] **Step 3: Export from the package**

Append to `packages/api-client/src/index.ts`:

```ts
export * from "./contracts/place-codes";
export * from "./lib/place-codes-client";
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b apps/merchant/tsconfig.json --noEmit` (if `-b` refuses `--noEmit`, run `npx tsc -p apps/merchant/tsconfig.json --noEmit`)
Expected: no errors in `packages/api-client/**` (pre-existing errors elsewhere: note them, don't fix).

- [ ] **Step 5: Commit**

```bash
git add packages/api-client/src/contracts/place-codes.ts packages/api-client/src/lib/place-codes-client.ts packages/api-client/src/index.ts
git commit -m "feat(api-client): place-code contracts and client"
```

---

### Task 2: Pure mapping module with unit tests

**Files:**
- Create: `apps/merchant/src/pages/reservations/floor-plan/qr/place-codes-model.ts`
- Test: `apps/merchant/src/pages/reservations/floor-plan/qr/place-codes-model.test.ts`

**Interfaces:**
- Consumes: Task 1 types; `QrStatus` from `./qr-store` (`"active" | "reprint" | "notGenerated" | "disabled"`); `FloorPlanDoc`, `FloorTable` from `@/entities/floor-plan`; `QrDesign` from `./print`.
- Produces:
  - `toQrStatus(s: PlaceCodeStatus): QrStatus`
  - `joinRows(tables: readonly FloorTable[], rows: readonly PlaceCodeRow[]): Map<string, PlaceCodeRow>` — key = `FloorTable.id`
  - `planGenerate(input: { selectedIds: ReadonlySet<string>; tables: readonly FloorTable[]; rows: ReadonlyMap<string, PlaceCodeRow>; doc: FloorPlanDoc }): PlaceCodeSelection[]`
  - `designToServer(d: QrDesign, version: number): PlaceCodeDesignRequest` and `designFromServer(s: PlaceCodeDesign, local: QrDesign): QrDesign`
  - `errorKey(e: unknown): string` — i18n key
  - `classifyLoadError(e: unknown): "notEnabled" | "forbidden" | "notPublished" | "failed"`
  - `MAX_BATCH = 500`, `chunkGuard(n: number): boolean` (true = allowed)

- [ ] **Step 1: Write the failing tests**

```ts
// place-codes-model.test.ts
import { describe, expect, it } from "vitest";
import { ApiError, type PlaceCodeRow } from "@octopus/api-client";
import { emptyDoc, createTable, type FloorTable } from "@/entities/floor-plan";
import { DEFAULT_DESIGN } from "./print";
import {
  chunkGuard, classifyLoadError, designFromServer, designToServer, errorKey,
  joinRows, planGenerate, toQrStatus,
} from "./place-codes-model";

const row = (over: Partial<PlaceCodeRow>): PlaceCodeRow => ({
  floorId: "f1", resourceId: "r1", number: "1", name: null, zoneId: null, zone: null, capacity: 4,
  status: "active", neverPrinted: false, blocked: false, codeId: "c1", version: 1, revision: 1,
  generatedAtUtc: "2026-10-15T10:00:00Z", hiddenFromCustomers: false, ...over,
});
const table = (id: string, number: string, zoneId?: string): FloorTable =>
  ({ ...createTable({ x: 0, y: 0 }), id, number, ...(zoneId ? { zoneId } : {}) }) as FloorTable;
const problem = (status: number, errorCode: string) => new ApiError(status, { status, errorCode });

describe("toQrStatus", () => {
  it("maps needsReprint to the page's reprint and keeps the rest", () => {
    expect(toQrStatus("needsReprint")).toBe("reprint");
    expect(toQrStatus("active")).toBe("active");
    expect(toQrStatus("notGenerated")).toBe("notGenerated");
    expect(toQrStatus("disabled")).toBe("disabled");
  });
});

describe("joinRows", () => {
  it("joins by resourceId first", () => {
    const m = joinRows([table("r1", "1")], [row({ resourceId: "r1", number: "99" })]);
    expect(m.get("r1")?.number).toBe("99");
  });
  it("falls back to the table number when ids differ", () => {
    const m = joinRows([table("local-7", "7")], [row({ resourceId: "srv-7", number: "7" })]);
    expect(m.get("local-7")?.resourceId).toBe("srv-7");
  });
  it("leaves an unmatched table out instead of throwing", () => {
    const m = joinRows([table("x", "42")], [row({})]);
    expect(m.has("x")).toBe(false);
  });
});

describe("planGenerate", () => {
  const doc = { ...emptyDoc("Main"), zones: [{ id: "z1" } as never] };
  const tables = [table("a", "1", "z1"), table("b", "2", "z1"), table("c", "3")];
  const rows = new Map(tables.map((t) => [t.id, row({ resourceId: `srv-${t.id}`, number: t.number, zoneId: (t as { zoneId?: string }).zoneId ?? null })]));
  it("sends all when every visible table is chosen", () => {
    expect(planGenerate({ selectedIds: new Set(["a", "b", "c"]), tables, rows, doc })).toEqual([{ mode: "all" }]);
  });
  it("sends one zone when the choice is exactly that zone", () => {
    expect(planGenerate({ selectedIds: new Set(["a", "b"]), tables, rows, doc })).toEqual([{ mode: "zone", zoneId: "z1" }]);
  });
  it("sends one per table, with the server resource id, otherwise", () => {
    expect(planGenerate({ selectedIds: new Set(["a", "c"]), tables, rows, doc })).toEqual([
      { mode: "one", resourceId: "srv-a" },
      { mode: "one", resourceId: "srv-c" },
    ]);
  });
});

describe("design mapping", () => {
  it("round-trips the server fields and keeps local print prefs", () => {
    const local = { ...DEFAULT_DESIGN, paper: "A5" as const, perPage: 8 };
    const req = designToServer({ ...local, template: "sticker", qrSize: "large", numberStyle: "badge", showNumber: false, message: "Hi", showMessage: true, primary: "#112233" }, 4);
    expect(req).toEqual({ expectedVersion: 4, templateKey: "sticker", sizeKey: "large", labelStyle: "badge", showLabel: false, message: "Hi", primaryColour: "#112233", logoAssetId: null });
    const back = designFromServer({ ...req, version: 5, updatedAtUtc: null, updatedBy: null }, local);
    expect(back.template).toBe("sticker");
    expect(back.paper).toBe("A5");
    expect(back.perPage).toBe(8);
    expect(back.showMessage).toBe(true);
  });
  it("sends a null message when the message is switched off", () => {
    expect(designToServer({ ...DEFAULT_DESIGN, showMessage: false, message: "x" }, 1).message).toBeNull();
  });
  it("falls back to the local value for an unknown server key", () => {
    const back = designFromServer({ templateKey: "weird", sizeKey: "huge", labelStyle: "?", showLabel: true, message: null, primaryColour: null, logoAssetId: null, version: 1, updatedAtUtc: null, updatedBy: null }, DEFAULT_DESIGN);
    expect(back.template).toBe(DEFAULT_DESIGN.template);
    expect(back.qrSize).toBe(DEFAULT_DESIGN.qrSize);
    expect(back.primary).toBe(DEFAULT_DESIGN.primary);
  });
});

describe("errors", () => {
  it("maps known place-code codes to keys and unknown ones to the generic key", () => {
    expect(errorKey(problem(409, "menu.place-code.stale"))).toBe("floorPlan.qr.error.stale");
    expect(errorKey(problem(409, "menu.place-code.relink-target-taken"))).toBe("floorPlan.qr.error.relinkTargetTaken");
    expect(errorKey(problem(429, "rate.limited"))).toBe("floorPlan.qr.error.rateLimited");
    expect(errorKey(problem(500, "boom"))).toBe("floorPlan.qr.error.generic");
    expect(errorKey(new Error("net"))).toBe("floorPlan.qr.error.generic");
  });
  it("classifies load failures", () => {
    expect(classifyLoadError(problem(403, "entitlements.feature-not-enabled"))).toBe("notEnabled");
    expect(classifyLoadError(problem(403, "authorization.forbidden"))).toBe("forbidden");
    expect(classifyLoadError(problem(422, "menu.place-code.floor-not-published"))).toBe("notPublished");
    expect(classifyLoadError(new Error("x"))).toBe("failed");
  });
  it("guards the 500 limit", () => {
    expect(chunkGuard(500)).toBe(true);
    expect(chunkGuard(501)).toBe(false);
  });
});
```

> Check `createTable` / `emptyDoc` signatures in `apps/merchant/src/entities/floor-plan/model.ts` before running; adjust only the two helper lines at the top of the test if they differ. Check how `FloorTable` stores its zone (field name may be `zoneId` or derived via `zoneForTable(doc, table)` — `generate.tsx` imports `zoneForTable`). If zone is derived, `planGenerate` must use `zoneForTable(doc, t)?.id`, and the test should build `doc.zones` with a real rect containing the tables instead of a `zoneId` field.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/reservations/floor-plan/qr/place-codes-model.test.ts` (from `apps/merchant`)
Expected: FAIL — cannot resolve `./place-codes-model`.

- [ ] **Step 3: Implement**

```ts
// place-codes-model.ts
// Pure translation between the place-code DTOs and the Table QR page's own
// view shapes. No React, no fetch — unit-tested.
import {
  ApiError, type PlaceCodeDesign, type PlaceCodeDesignRequest, type PlaceCodeRow,
  type PlaceCodeSelection, type PlaceCodeStatus,
} from "@octopus/api-client";
import { zoneForTable, type FloorPlanDoc, type FloorTable } from "@/entities/floor-plan";
import type { QrDesign } from "./print";
import type { QrStatus } from "./qr-store";

export const MAX_BATCH = 500;
export const chunkGuard = (n: number): boolean => n <= MAX_BATCH;

export function toQrStatus(s: PlaceCodeStatus): QrStatus {
  return s === "needsReprint" ? "reprint" : s;
}

/** Plan table id → its row. Published tables carry the server spot id, which
 *  is the place's resourceId; the number is the fallback for a plan read
 *  before a re-pull swapped in server ids. */
export function joinRows(tables: readonly FloorTable[], rows: readonly PlaceCodeRow[]): Map<string, PlaceCodeRow> {
  const byResource = new Map(rows.map((r) => [r.resourceId, r]));
  const byNumber = new Map(rows.map((r) => [r.number, r]));
  const out = new Map<string, PlaceCodeRow>();
  for (const t of tables) {
    const hit = byResource.get(t.id) ?? byNumber.get(t.number);
    if (hit) out.set(t.id, hit);
  }
  return out;
}

export function planGenerate(input: {
  selectedIds: ReadonlySet<string>;
  tables: readonly FloorTable[];
  rows: ReadonlyMap<string, PlaceCodeRow>;
  doc: FloorPlanDoc;
}): PlaceCodeSelection[] {
  const { selectedIds, tables, rows, doc } = input;
  const chosen = tables.filter((t) => selectedIds.has(t.id));
  if (chosen.length === 0) return [];
  if (chosen.length === tables.length) return [{ mode: "all" }];
  const zoneOf = (t: FloorTable) => zoneForTable(doc, t)?.id ?? null;
  const zone = zoneOf(chosen[0]);
  if (zone && chosen.every((t) => zoneOf(t) === zone) && tables.filter((t) => zoneOf(t) === zone).length === chosen.length) {
    return [{ mode: "zone", zoneId: rows.get(chosen[0].id)?.zoneId ?? zone }];
  }
  return chosen.flatMap((t) => {
    const r = rows.get(t.id);
    return r ? [{ mode: "one" as const, resourceId: r.resourceId }] : [];
  });
}

const TEMPLATES: readonly QrDesign["template"][] = ["tent", "sticker", "square", "custom"];
const SIZES: readonly QrDesign["qrSize"][] = ["small", "medium", "large"];
const LABELS: readonly QrDesign["numberStyle"][] = ["circle", "plain", "badge"];
const pick = <T extends string>(list: readonly T[], v: string, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

export function designToServer(d: QrDesign, version: number): PlaceCodeDesignRequest {
  return {
    expectedVersion: version,
    templateKey: d.template,
    sizeKey: d.qrSize,
    labelStyle: d.numberStyle,
    showLabel: d.showNumber,
    message: d.showMessage && d.message.trim() ? d.message.trim().slice(0, 60) : null,
    primaryColour: d.primary,
    logoAssetId: null,
  };
}

export function designFromServer(s: PlaceCodeDesign, local: QrDesign): QrDesign {
  return {
    ...local,
    template: pick(TEMPLATES, s.templateKey, local.template),
    qrSize: pick(SIZES, s.sizeKey, local.qrSize),
    numberStyle: pick(LABELS, s.labelStyle, local.numberStyle),
    showNumber: s.showLabel,
    showMessage: !!s.message,
    message: s.message ?? "",
    primary: s.primaryColour ?? local.primary,
  };
}

const ERROR_KEYS: Record<string, string> = {
  "menu.place-code.not-found": "notFound",
  "menu.place-code.revoked": "revoked",
  "menu.place-code.stale": "stale",
  "menu.place-code.place-not-on-floor": "placeNotOnFloor",
  "menu.place-code.place-already-coded": "placeAlreadyCoded",
  "menu.place-code.relink-target-taken": "relinkTargetTaken",
  "menu.place-code.floor-not-published": "floorNotPublished",
  "menu.place-code.selection-too-large": "selectionTooLarge",
  "menu.place-code.confirm-count-mismatch": "confirmCountMismatch",
  "menu.place-code.design-stale": "designStale",
  "menu.place-code.selection-invalid": "selectionInvalid",
  "menu.place-code.selection-empty": "selectionEmpty",
  "authorization.forbidden": "forbidden",
  "rate.limited": "rateLimited",
};

const codeOf = (e: unknown): string | undefined => (e instanceof ApiError ? e.problem?.errorCode : undefined);

export function errorKey(e: unknown): string {
  const k = ERROR_KEYS[codeOf(e) ?? ""];
  return `floorPlan.qr.error.${k ?? "generic"}`;
}

export function classifyLoadError(e: unknown): "notEnabled" | "forbidden" | "notPublished" | "failed" {
  const c = codeOf(e);
  if (c === "entitlements.feature-not-enabled") return "notEnabled";
  if (c === "authorization.forbidden") return "forbidden";
  if (c === "menu.place-code.floor-not-published") return "notPublished";
  return "failed";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/reservations/floor-plan/qr/place-codes-model.test.ts`
Expected: all PASS.

- [ ] **Step 5: Add the i18n keys used above** (en + ar), in both locale files next to the other `floorPlan.qr.*` keys:

| key | en | ar |
|---|---|---|
| `floorPlan.qr.error.notFound` | This code no longer exists. | هذا الكود لم يعد موجودًا. |
| `floorPlan.qr.error.revoked` | This code was revoked. | تم إلغاء هذا الكود. |
| `floorPlan.qr.error.stale` | Someone else changed this code — showing the latest. | قام شخص آخر بتعديل هذا الكود — تم عرض أحدث نسخة. |
| `floorPlan.qr.error.placeNotOnFloor` | That table is not on the published floor. | هذه الطاولة غير موجودة في المخطط المنشور. |
| `floorPlan.qr.error.placeAlreadyCoded` | That table already has a code. | هذه الطاولة لديها كود بالفعل. |
| `floorPlan.qr.error.relinkTargetTaken` | Table {number} already has its own code. | الطاولة {number} لديها كود خاص بها بالفعل. |
| `floorPlan.qr.error.floorNotPublished` | Publish the floor plan first. | انشر مخطط الصالة أولًا. |
| `floorPlan.qr.error.selectionTooLarge` | Up to 500 tables at a time. | حتى 500 طاولة في المرة الواحدة. |
| `floorPlan.qr.error.confirmCountMismatch` | The tables changed — please confirm again. | تغيّرت الطاولات — يرجى التأكيد مرة أخرى. |
| `floorPlan.qr.error.designStale` | The design was changed elsewhere — reloaded. | تم تعديل التصميم من مكان آخر — تمت إعادة التحميل. |
| `floorPlan.qr.error.selectionInvalid` | That selection is not valid. | هذا الاختيار غير صالح. |
| `floorPlan.qr.error.selectionEmpty` | No tables match that selection. | لا توجد طاولات مطابقة لهذا الاختيار. |
| `floorPlan.qr.error.forbidden` | You don't have permission to do that. | ليس لديك صلاحية للقيام بذلك. |
| `floorPlan.qr.error.rateLimited` | Too many requests — try again in a minute. | طلبات كثيرة — حاول مرة أخرى بعد دقيقة. |
| `floorPlan.qr.error.generic` | Something went wrong. Please try again. | حدث خطأ ما. يرجى المحاولة مرة أخرى. |

- [ ] **Step 6: Commit**

```bash
git add apps/merchant/src/pages/reservations/floor-plan/qr/place-codes-model.ts apps/merchant/src/pages/reservations/floor-plan/qr/place-codes-model.test.ts packages/i18n/src/locales/en/index.ts packages/i18n/src/locales/ar/index.ts
git commit -m "feat(merchant): place-code view mapping, with tests"
```

> `packages/i18n` locale files may already have **uncommitted** edits from other work on this tree. Before `git add` on them, run `git diff --stat packages/i18n` — if lines other than yours appear, use `git add -p` and stage only the `floorPlan.qr.*` hunks you added.

---

### Task 3: `usePlaceCodes` hook and the overview on real data

**Files:**
- Create: `apps/merchant/src/pages/reservations/floor-plan/qr/use-place-codes.ts`
- Modify: `apps/merchant/src/pages/reservations/floor-plan/qr/qr-store.ts` (remove localStorage store, `useTableQr`, `newCode`, `qrValue`, `qrSvgMarkup`; keep `QrStatus`, `QR_STATUSES`, `downloadFile`; add `downloadBlob`)
- Modify: `apps/merchant/src/pages/reservations/floor-plan/qr/index.tsx`
- Modify: `apps/merchant/src/pages/reservations/floor-plan/qr/qr-plan.tsx` (hidden marker)

**Interfaces:**
- Consumes: Task 1 functions; Task 2 `joinRows`, `toQrStatus`, `classifyLoadError`, `errorKey`.
- Produces:

```ts
export interface PlaceCodesState {
  phase: "loading" | "ready" | "notEnabled" | "forbidden" | "notPublished" | "failed";
  floorId: string | null;
  rows: Map<string, PlaceCodeRow>;            // key = FloorTable.id
  counts: PlaceCodeCounts | null;
  attention: PlaceCodeAttention[];
  lastPrint: PlaceCodeLastPrint | null;
  statusOf: (t: FloorTable) => QrStatus;
  refresh: () => Promise<void>;
  /** Runs a mutation; on ApiError it toasts errorKey(e), refreshes on stale/not-found, and rethrows. */
  run: <T>(fn: (businessId: string) => Promise<T>) => Promise<T>;
  businessId: string;
}
export function usePlaceCodes(doc: FloorPlanDoc, notify: (text: string, tone?: "success" | "error" | "info") => void): PlaceCodesState;
```

- [ ] **Step 1: Write the hook**

```ts
// use-place-codes.ts
// The Table QR page's server state: the business's place-code floor that
// matches the drawn plan, its rows joined to plan tables, counts, attention
// and last print. Every mutation goes through `run`, which refetches after.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError, listPlaceCodeFloors, listPlaceCodes,
  type PlaceCodeAttention, type PlaceCodeCounts, type PlaceCodeLastPrint, type PlaceCodeRow,
} from "@octopus/api-client";
import type { FloorPlanDoc, FloorTable } from "@/entities/floor-plan";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { classifyLoadError, errorKey, joinRows, toQrStatus } from "./place-codes-model";
import type { QrStatus } from "./qr-store";

// (PlaceCodesState interface exactly as in this task's Interfaces block)

export function usePlaceCodes(doc: FloorPlanDoc, notify: (text: string, tone?: "success" | "error" | "info") => void): PlaceCodesState {
  const { activeBusinessId } = useAuth();
  const { t } = useI18n();
  const businessId = activeBusinessId ?? "";
  const tables = useMemo(() => doc.tables.filter((tb) => tb.visible), [doc.tables]);
  const [phase, setPhase] = useState<PlaceCodesState["phase"]>("loading");
  const [floorId, setFloorId] = useState<string | null>(null);
  const [list, setList] = useState<{ items: PlaceCodeRow[]; counts: PlaceCodeCounts; attention: PlaceCodeAttention[]; lastPrint: PlaceCodeLastPrint | null } | null>(null);
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    const mine = ++seq.current;
    try {
      const { floors } = await listPlaceCodeFloors(businessId);
      if (floors.length === 0) { if (mine === seq.current) setPhase("notPublished"); return; }
      // The floor whose rows overlap the drawn plan most; one floor is the usual case.
      let best = floors[0].floorId;
      let res = await listPlaceCodes(businessId, { floorId: best, size: 500 });
      if (floors.length > 1) {
        let bestHits = joinRows(tables, res.items).size;
        for (const f of floors.slice(1)) {
          const r = await listPlaceCodes(businessId, { floorId: f.floorId, size: 500 });
          const hits = joinRows(tables, r.items).size;
          if (hits > bestHits) { best = f.floorId; res = r; bestHits = hits; }
        }
      }
      if (mine !== seq.current) return;
      setFloorId(best);
      setList({ items: res.items, counts: res.counts, attention: res.attention, lastPrint: res.lastPrint });
      setPhase("ready");
    } catch (e) {
      if (mine === seq.current) setPhase(classifyLoadError(e));
    }
  }, [businessId, tables]);

  useEffect(() => { void refresh(); }, [refresh]);

  const rows = useMemo(() => joinRows(tables, list?.items ?? []), [tables, list]);
  const statusOf = useCallback((tb: FloorTable): QrStatus => {
    const r = rows.get(tb.id);
    return r ? toQrStatus(r.status) : "notGenerated";
  }, [rows]);

  const run = useCallback(async <T,>(fn: (businessId: string) => Promise<T>): Promise<T> => {
    try {
      const out = await fn(businessId);
      await refresh();
      return out;
    } catch (e) {
      notify(t(errorKey(e)), "error");
      const code = e instanceof ApiError ? e.problem?.errorCode : undefined;
      if (code === "menu.place-code.stale" || code === "menu.place-code.not-found" || code === "menu.place-code.confirm-count-mismatch") await refresh();
      throw e;
    }
  }, [businessId, refresh, notify, t]);

  return {
    phase, floorId, rows, counts: list?.counts ?? null, attention: list?.attention ?? [],
    lastPrint: list?.lastPrint ?? null, statusOf, refresh, run, businessId,
  };
}
```

- [ ] **Step 2: Shrink `qr-store.ts`**

Replace the whole file with:

```ts
// Table QR view types and small browser helpers. Codes themselves live on
// the server (use-place-codes.ts); nothing here is persisted.
export type QrStatus = "active" | "reprint" | "notGenerated" | "disabled";
export const QR_STATUSES: readonly QrStatus[] = ["active", "reprint", "notGenerated", "disabled"];

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadFile(name: string, content: string, mime = "image/svg+xml") {
  downloadBlob(name, new Blob([content], { type: mime }));
}
```

Then run `npx tsc -p apps/merchant/tsconfig.json --noEmit` — the errors it lists in `index.tsx`, `generate.tsx`, `table-qr-modal.tsx`, `print.ts` are the call sites Tasks 3–6 rewrite. Leave `generate.tsx`/`table-qr-modal.tsx`/`print.ts` compile errors for their own tasks **only if** you are executing tasks in one sitting; otherwise add a temporary `// @ts-expect-error place codes: Task N` on each failing import line and remove it in that task.

- [ ] **Step 3: Rewire `index.tsx` overview**

In `TableQrCodes`:
- replace `const qr = useTableQr();` with `const pc = usePlaceCodes(doc, notify);`
- `tableStatus` → `pc.statusOf`
- `counts` → computed from `tables` + `pc.statusOf` (same reduce as today, keeps zone-agnostic totals matching the drawn plan)
- `lastPrinted` → `pc.lastPrint ? Date.parse(pc.lastPrint.printedAtUtc) : null`
- `printable` → `tables.filter((tb) => { const s = pc.statusOf(tb); return s === "active" || s === "reprint"; })`
- before the `mode === "generate"` branch, render the non-ready phases:

```tsx
if (pc.phase !== "ready") {
  return (
    <PageShell>
      <div className="grid min-h-[50vh] place-items-center">
        <div className="flex max-w-[420px] flex-col items-center gap-3 text-center">
          <h1 className={clsx("text-[20px] font-semibold", TEXT_PRIMARY)}>{t(`floorPlan.qr.phase.${pc.phase}.title`)}</h1>
          <p className={clsx("text-[14px]", TEXT_SECONDARY)}>{t(`floorPlan.qr.phase.${pc.phase}.body`)}</p>
          {pc.phase === "failed" && (
            <button type="button" onClick={() => void pc.refresh()} className={BTN_PRIMARY}>{t("floorPlan.qr.retry")}</button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
```

- pass `pc` instead of `qr` to `GenerateFlow` (prop renamed `pc: PlaceCodesState`) and pass `row={open ? pc.rows.get(open.id) : undefined}` instead of `qr=` to `TableQrModal` (both components are rewritten in Tasks 5–6; in this task just change the props and the modal's `qr`→`row` reads to keep it compiling: status from `toQrStatus(row.status)`, id `row.codeId`, generatedAt `row.generatedAtUtc`).
- `print`/`download` handlers: temporarily `notify(t("floorPlan.qr.error.generic"), "info")` placeholders are **not allowed** — instead wire them in Task 4 and leave the buttons as they are calling `print(list)` / `download(list)` whose bodies Task 4 replaces. In this task make their bodies `void list;` and disable the two buttons (`disabled`) so nothing half-works between commits.

i18n keys (en / ar):

| key | en | ar |
|---|---|---|
| `floorPlan.qr.phase.loading.title` | Loading QR codes… | جارٍ تحميل أكواد QR… |
| `floorPlan.qr.phase.loading.body` | One moment. | لحظة من فضلك. |
| `floorPlan.qr.phase.notEnabled.title` | Table QR codes are not enabled | أكواد QR للطاولات غير مفعّلة |
| `floorPlan.qr.phase.notEnabled.body` | Add the Table QR Codes add-on to your plan to generate a code for every table. | أضف إضافة أكواد QR للطاولات إلى باقتك لإنشاء كود لكل طاولة. |
| `floorPlan.qr.phase.forbidden.title` | No access | لا توجد صلاحية |
| `floorPlan.qr.phase.forbidden.body` | Ask the owner for permission to view table QR codes. | اطلب من المالك صلاحية عرض أكواد QR للطاولات. |
| `floorPlan.qr.phase.notPublished.title` | Publish your floor plan first | انشر مخطط الصالة أولًا |
| `floorPlan.qr.phase.notPublished.body` | Codes are made for the tables on your published floor. | يتم إنشاء الأكواد لطاولات مخطط الصالة المنشور. |
| `floorPlan.qr.phase.failed.title` | Couldn't load QR codes | تعذّر تحميل أكواد QR |
| `floorPlan.qr.phase.failed.body` | Check your connection and try again. | تحقق من الاتصال وحاول مرة أخرى. |
| `floorPlan.qr.retry` | Retry | إعادة المحاولة |
| `floorPlan.qr.hiddenFromCustomers` | Hidden from customers | مخفية عن العملاء |

- [ ] **Step 4: Hidden marker on the plan**

In `qr-plan.tsx`, add an optional prop `hiddenIds?: ReadonlySet<string>`; for a table whose id is in it, render a small eye-off badge (lucide `EyeOff`, size 12) at the table's top-end corner with `title={t("floorPlan.qr.hiddenFromCustomers")}`. In `index.tsx` pass `hiddenIds={new Set([...pc.rows].filter(([, r]) => r.hiddenFromCustomers).map(([id]) => id))}` (memoised).

- [ ] **Step 5: Type-check and run tests**

Run: `npx tsc -p apps/merchant/tsconfig.json --noEmit` and `npx vitest run src/pages/reservations/floor-plan` (from `apps/merchant`)
Expected: no new type errors; tests PASS.

- [ ] **Step 6: Manual check** — start the merchant app (`npm run dev -w @octopus/merchant`) against the local backend; open `/reservations/floor-plan/qr`; confirm the counts match `GET /place-codes` in the Network tab; confirm one raw response's `status` casing matches Task 1's union. A business without the add-on shows the "not enabled" screen.

- [ ] **Step 7: Commit**

```bash
git add apps/merchant/src/pages/reservations/floor-plan/qr packages/i18n/src/locales
git commit -m "feat(merchant): Table QR overview reads place codes from the server"
```

(Stage i18n hunks selectively as in Task 2 Step 6.)

---

### Task 4: Printing and downloading through print runs

**Files:**
- Modify: `apps/merchant/src/pages/reservations/floor-plan/qr/print.ts`
- Create: `apps/merchant/src/pages/reservations/floor-plan/qr/print-codes.ts`
- Modify: `apps/merchant/src/pages/reservations/floor-plan/qr/index.tsx` (print/download handlers, re-enable buttons)

**Interfaces:**
- Consumes: `recordPlaceCodePrintRun`, `getPlaceCodeSymbol`, `getPlaceCodeBundle` (Task 1); `PlaceCodesState` (Task 3); `chunkGuard` (Task 2); `downloadBlob` (Task 3).
- Produces:
  - `printTents(doc, items: { table: FloorTable; svg: string }[], design, t)` — signature change: `svg` markup instead of `code`.
  - `printCodes(pc: PlaceCodesState, doc: FloorPlanDoc, tables: FloorTable[], design: QrDesign, t: (k: string) => string, notify): Promise<void>`
  - `exportCodes(pc: PlaceCodesState, tables: FloorTable[], t, notify): Promise<void>`

- [ ] **Step 1: `print.ts`** — change the `printTents` item type to `{ table: FloorTable; svg: string }` and replace `${qrSvgMarkup(code, qrPx)}` with `${svg}`; remove the `qrSvgMarkup` import. The `.qr svg{width;height}` CSS already sizes the server SVG.

Also open the window **before** any await (popup blockers): split into `openPrintWindow(): Window | null` and `writeTents(win, doc, items, design, t)`. `printTents` becomes `writeTents(openPrintWindow(), …)` for callers that already have the SVGs.

- [ ] **Step 2: `print-codes.ts`**

```ts
// Printing and exporting place codes. The backend requires the print run to
// be recorded before any symbol or bundle is fetched.
import { getPlaceCodeBundle, getPlaceCodeSymbol, recordPlaceCodePrintRun } from "@octopus/api-client";
import type { FloorPlanDoc, FloorTable } from "@/entities/floor-plan";
import { chunkGuard } from "./place-codes-model";
import { openPrintWindow, writeTents, type QrDesign } from "./print";
import { downloadBlob } from "./qr-store";
import type { PlaceCodesState } from "./use-place-codes";

type Notify = (text: string, tone?: "success" | "error" | "info") => void;

function codeIds(pc: PlaceCodesState, tables: FloorTable[]): { table: FloorTable; codeId: string }[] {
  return tables.flatMap((table) => {
    const id = pc.rows.get(table.id)?.codeId;
    return id ? [{ table, codeId: id }] : [];
  });
}

export async function printCodes(pc: PlaceCodesState, doc: FloorPlanDoc, tables: FloorTable[], design: QrDesign, t: (k: string) => string, notify: Notify) {
  const items = codeIds(pc, tables);
  if (items.length === 0) return;
  if (!chunkGuard(items.length)) return notify(t("floorPlan.qr.error.selectionTooLarge"), "error");
  const win = openPrintWindow();
  if (!win) return notify(t("floorPlan.qr.popupBlocked"), "error");
  try {
    await pc.run((b) => recordPlaceCodePrintRun(b, { codeIds: items.map((i) => i.codeId), format: "svg", purpose: "print" }));
    const svgs = await Promise.all(items.map(async (i) => (await getPlaceCodeSymbol(pc.businessId, i.codeId, "svg")).blob.text()));
    writeTents(win, doc, items.map((i, n) => ({ table: i.table, svg: svgs[n] })), design, t);
  } catch {
    win.close();
  }
}

export async function exportCodes(pc: PlaceCodesState, tables: FloorTable[], t: (k: string) => string, notify: Notify) {
  const ids = codeIds(pc, tables).map((i) => i.codeId);
  if (ids.length === 0) return;
  if (!chunkGuard(ids.length)) return notify(t("floorPlan.qr.error.selectionTooLarge"), "error");
  try {
    const run = await pc.run((b) => recordPlaceCodePrintRun(b, { codeIds: ids, format: "svg", purpose: "export" }));
    const { blob, fileName } = await getPlaceCodeBundle(pc.businessId, run.runId);
    downloadBlob(fileName ?? `table-qr-codes-${run.runId.slice(0, 8)}.zip`, blob);
  } catch {
    // run() already toasted.
  }
}
```

> `getPlaceCodeSymbol` is rate-limited at 30/min per user. If `items.length > 25`, fetch the bundle instead and read SVGs out of the ZIP — **not** in this plan; instead, for >25 codes `printCodes` falls back to `exportCodes` and toasts `floorPlan.qr.printManyHint` ("More than 25 codes: downloaded as a ZIP to print from your computer"). Add that branch right after the `chunkGuard` check:
> ```ts
> if (items.length > 25) { win.close(); notify(t("floorPlan.qr.printManyHint"), "info"); return exportCodes(pc, tables, t, notify); }
> ```
> (open the window only after this check, i.e. move `openPrintWindow()` below it.)

- [ ] **Step 3: `index.tsx`** — `print(list)` → `void printCodes(pc, doc, list, design, t, notify)` where `design` comes from Task 5's `usePrintDesign` (until Task 5 lands, use `DEFAULT_DESIGN`); `download(list)` → `void exportCodes(pc, list, t, notify)`. Re-enable both buttons (`disabled={printable.length === 0 || busy}`) with a local `busy` state set around the awaited call.

i18n:

| key | en | ar |
|---|---|---|
| `floorPlan.qr.popupBlocked` | Allow pop-ups to print. | اسمح بالنوافذ المنبثقة للطباعة. |
| `floorPlan.qr.printManyHint` | More than 25 codes: downloaded as a ZIP to print from your computer. | أكثر من 25 كودًا: تم تنزيلها كملف ZIP للطباعة من جهازك. |

- [ ] **Step 4: Type-check, test, manual** — `npx tsc …` clean; print 2 tables (window shows real codes; Network shows `POST print-runs` **before** `GET …/symbol`); Download all → a ZIP.

- [ ] **Step 5: Commit** `feat(merchant): print and export table codes through print runs`

---

### Task 5: Generate flow and the server design

**Files:**
- Create: `apps/merchant/src/pages/reservations/floor-plan/qr/use-print-design.ts`
- Modify: `apps/merchant/src/pages/reservations/floor-plan/qr/generate.tsx`
- Modify: `apps/merchant/src/pages/reservations/floor-plan/qr/index.tsx` (use `usePrintDesign` for print)

**Interfaces:**
- Consumes: `getPlaceCodeDesign`, `updatePlaceCodeDesign`, `generatePlaceCodes` (Task 1); `designFromServer`, `designToServer`, `planGenerate`, `chunkGuard` (Task 2); `PlaceCodesState` (Task 3); `printCodes` (Task 4).
- Produces: `usePrintDesign(businessId: string): { design: QrDesign; setDesign: (d: QrDesign) => void; save: () => Promise<void>; dirty: boolean }`.

- [ ] **Step 1: `use-print-design.ts`**

```ts
// The printed card's design: the server keeps template, size, label style,
// message and colour (shared by the business); paper, margins, per-page,
// background, QR style, tent size and logo stay in this browser.
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getPlaceCodeDesign, updatePlaceCodeDesign } from "@octopus/api-client";
import { designFromServer, designToServer } from "./place-codes-model";
import { DEFAULT_DESIGN, type QrDesign } from "./print";

const prefsKey = (b: string) => `octo.qrPrintPrefs.${b}`;
function readPrefs(b: string): QrDesign {
  try { const raw = localStorage.getItem(prefsKey(b)); return raw ? { ...DEFAULT_DESIGN, ...(JSON.parse(raw) as Partial<QrDesign>) } : DEFAULT_DESIGN; }
  catch { return DEFAULT_DESIGN; }
}
function writePrefs(b: string, d: QrDesign) {
  const { paper, margins, perPage, background, qrStyle, tentSize, logo } = d;
  try { localStorage.setItem(prefsKey(b), JSON.stringify({ paper, margins, perPage, background, qrStyle, tentSize, logo })); } catch { /* private window */ }
}

export function usePrintDesign(businessId: string) {
  const [design, setLocal] = useState<QrDesign>(() => readPrefs(businessId));
  const version = useRef<number | null>(null);
  const saved = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const s = await getPlaceCodeDesign(businessId);
      version.current = s.version;
      setLocal((d) => { const next = designFromServer(s, d); saved.current = JSON.stringify(designToServer(next, 0)); return next; });
    } catch { /* keep local defaults; read errors surface on the page load */ }
  }, [businessId]);
  useEffect(() => { if (businessId) void load(); }, [businessId, load]);

  const setDesign = useCallback((d: QrDesign) => { setLocal(d); writePrefs(businessId, d); }, [businessId]);
  const dirty = JSON.stringify(designToServer(design, 0)) !== saved.current;

  /** Saves the server half if it changed. On design-stale reloads and rethrows. */
  const save = useCallback(async () => {
    if (!dirty || version.current === null) return;
    try {
      const s = await updatePlaceCodeDesign(businessId, designToServer(design, version.current));
      version.current = s.version;
      saved.current = JSON.stringify(designToServer(design, 0));
    } catch (e) {
      if (e instanceof ApiError && e.problem?.errorCode === "menu.place-code.design-stale") await load();
      throw e;
    }
  }, [businessId, design, dirty, load]);

  return { design, setDesign, save, dirty };
}
```

- [ ] **Step 2: `generate.tsx` — props and state**

- Props: `{ doc; pc: PlaceCodesState; printDesign: ReturnType<typeof usePrintDesign>; preselect: string[]; onExit }`. Remove the `qr` prop and the local `useState<QrDesign>`; use `printDesign.design`/`printDesign.setDesign` everywhere `design`/`setDesign` were.
- `preview(table)` → `step > 1 && selected.has(table.id) ? "active" : pc.statusOf(table)`.
- New state: `const [replaceExisting, setReplaceExisting] = useState(false); const [pending, setPending] = useState(false); const batchIds = useRef<string[]>([]);` and reset `batchIds.current = []` whenever `selected` or `replaceExisting` changes (`useEffect`).
- On the Review step, add a `Switch` row "Replace existing codes" (`floorPlan.qr.replaceExisting`) with hint `floorPlan.qr.replaceExistingHint` ("Printed stickers on these tables will stop working"); shown only when `already > 0` where `already = chosen.filter((tb) => pc.statusOf(tb) !== "notGenerated").length`.

- [ ] **Step 3: `finish()`**

```ts
async function finish() {
  if (pending) return;
  const selections = planGenerate({ selectedIds: selected, tables, rows: pc.rows, doc });
  if (!chunkGuard(chosen.length)) return notify(t("floorPlan.qr.error.selectionTooLarge"), "error");
  if (!pc.floorId || selections.length === 0) return;
  setPending(true);
  try {
    await printDesign.save().catch(() => undefined); // a stale design reloads; generation still proceeds
    const already = chosen.filter((tb) => pc.statusOf(tb) !== "notGenerated").length;
    for (let i = 0; i < selections.length; i++) {
      batchIds.current[i] ??= crypto.randomUUID();
      const sel = selections[i];
      const replaceCount = replaceExisting
        ? sel.mode === "one" ? (pc.statusOf(chosen.find((tb) => pc.rows.get(tb.id)?.resourceId === sel.resourceId)!) !== "notGenerated" ? 1 : 0) : already
        : undefined;
      await pc.run((b) => generatePlaceCodes(b, {
        batchId: batchIds.current[i], floorId: pc.floorId!, selection: sel,
        existing: replaceExisting ? "regenerate" : "keep",
        ...(replaceCount ? { confirmReplaceCount: replaceCount } : {}),
      }));
      setProgress({ done: i + 1, total: selections.length });
    }
    onExit(t("floorPlan.qr.generatedDone").replace("{n}", String(chosen.length)));
  } catch {
    setFailedAt(progress.done); // run() toasted; the Retry button calls finish() again, reusing batchIds
  } finally {
    setPending(false);
  }
}
```

Add `const [progress, setProgress] = useState({ done: 0, total: 0 }); const [failedAt, setFailedAt] = useState<number | null>(null);` and, in the review step's bottom bar, when `pending && progress.total > 1` render `t("floorPlan.qr.generatingProgress")` with `{done}`/`{total}`; when `failedAt !== null` render `t("floorPlan.qr.generateStopped")` with `{n}` = `failedAt` and the primary button label becomes `t("floorPlan.qr.retry")`. Replays of finished batches answer `replayed: true` and cost nothing, so Retry simply re-runs the loop.

- The step-3 primary button: label `t("floorPlan.qr.generateCodes")` (was "Print all"); `disabled={chosen.length === 0 || pending}`. After success the overview opens and the user prints from there (Task 4) — the flow no longer prints by itself, because the codes only exist once the server answers.
- `notify` comes from a new prop `notify` passed from `index.tsx`.

- [ ] **Step 4: `ReviewStep` single-table panel** — remove `qr` usage: status from `pc.statusOf(single)`, id `pc.rows.get(single.id)?.codeId ?? "—"`, last printed: drop the row (list rows don't carry it; the modal shows it). Replace the client `QrCode value={qrValue(…)}` preview with `<ServerSymbol pc={pc} codeId={…} size={120} />` (Step 5), or the text `floorPlan.qr.noCode` when there is no code yet. Its three buttons become: **Print this** → `printCodes(pc, doc, [single], design, t, notify)` (disabled without a code), **Download** → `exportCodes(pc, [single], t, notify)`; remove the inline Regenerate button (it lives in the modal, Task 6).

`TentCard` previews: keep the drawn card but pass `codeId` instead of `code` and render `ServerSymbol` when a code exists, a dashed placeholder square otherwise.

- [ ] **Step 5: `ServerSymbol`** — add to `parts.tsx`:

```tsx
/** A place code's symbol from the server (bearer-authenticated fetch → blob URL). */
export function ServerSymbol({ pc, codeId, size, dimmed }: { pc: PlaceCodesState; codeId: string; size: number; dimmed?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; let made: string | null = null;
    getPlaceCodeSymbol(pc.businessId, codeId, "svg").then(({ blob }) => {
      if (!alive) return; made = URL.createObjectURL(blob); setUrl(made);
    }).catch(() => alive && setUrl(null));
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [pc.businessId, codeId]);
  return url
    ? <img src={url} width={size} height={size} alt="" className={clsx(dimmed && "opacity-40")} />
    : <span className="block animate-pulse rounded-[8px] bg-[#e2e8f0] [[data-theme=dark]_&]:bg-[var(--octo-border-card)]" style={{ width: size, height: size }} />;
}
```

> Rate limit: the review grid shows up to 16 cards per page; with ≤ 30 symbol fetches/min that is fine for one page. Cache blobs by `codeId+version` in a module-level `Map<string, string>` inside `parts.tsx` so paging back does not refetch — key `${codeId}:${version}` (pass `version` as an extra prop from the row).

- [ ] **Step 6: `index.tsx`** — `const printDesign = usePrintDesign(pc.businessId);` pass to `GenerateFlow` and use `printDesign.design` in `printCodes`.

i18n:

| key | en | ar |
|---|---|---|
| `floorPlan.qr.replaceExisting` | Replace existing codes | استبدال الأكواد الحالية |
| `floorPlan.qr.replaceExistingHint` | Printed stickers on these tables will stop working. | الملصقات المطبوعة على هذه الطاولات ستتوقف عن العمل. |
| `floorPlan.qr.generateCodes` | Generate codes | إنشاء الأكواد |
| `floorPlan.qr.generatingProgress` | Generating {done} of {total}… | جارٍ الإنشاء {done} من {total}… |
| `floorPlan.qr.generateStopped` | Stopped after {n} tables. The rest were not generated. | توقف بعد {n} طاولات. لم يتم إنشاء الباقي. |

- [ ] **Step 7: Type-check, tests, manual** — generate: all tables (one `all` request), a zone (one `zone`), two hand-picked tables (two `one` requests, progress shown); repeat Generate after a network failure (devtools offline mid-loop) → Retry finishes with `replayed` answers; change design → `PUT design` sent once; open in a second browser → same template/colour.

- [ ] **Step 8: Commit** `feat(merchant): generate table codes and save the print design on the server`

---

### Task 6: Table modal — details and lifecycle actions

**Files:**
- Modify: `apps/merchant/src/pages/reservations/floor-plan/qr/table-qr-modal.tsx`
- Create: `apps/merchant/src/pages/reservations/floor-plan/qr/confirm-dialog.tsx`
- Modify: `apps/merchant/src/pages/reservations/floor-plan/qr/index.tsx`

**Interfaces:**
- Consumes: `getPlaceCode`, `disablePlaceCodes`, `enablePlaceCodes`, `regeneratePlaceCode`, `revokePlaceCode` (Task 1); `PlaceCodesState` (Task 3); `printCodes`, `exportCodes` (Task 4); `ServerSymbol` (Task 5).
- Produces: `TableQrModal({ doc, table, pc, design, notify, onClose, onGenerate, onRelink })` and `ConfirmDialog({ open, title, body, confirmLabel, tone: "danger" | "warning", onConfirm, onCancel, pending })`. `onRelink(codeId: string)` is used by Task 8.

- [ ] **Step 1: `confirm-dialog.tsx`** — a `Modal` (from `@ui/primitives`, `max-w-[420px] !rounded-[24px]`) with `h2` title, `p` body, and two buttons: `BTN_MODAL_OUTLINE` cancel and `BTN_MODAL_DANGER`/`BTN_MODAL_WARNING` confirm (`disabled={pending}`). No browser `confirm()`.

- [ ] **Step 2: modal data** — inside `TableQrModal`:

```ts
const row = table ? pc.rows.get(table.id) : undefined;
const [detail, setDetail] = useState<PlaceCodeDetail | null>(null);
const [tab, setTab] = useState<"details" | "activity">("details");
const [ask, setAsk] = useState<null | "regenerate" | "revoke">(null);
const [pending, setPending] = useState(false);
const opId = useRef<string | null>(null);   // one id per confirmed action; cleared on success or on dialog close
useEffect(() => {
  setDetail(null); setTab("details");
  if (row?.codeId) getPlaceCode(pc.businessId, row.codeId).then(setDetail).catch(() => setDetail(null));
}, [pc.businessId, row?.codeId, row?.revision]);
const status = row ? toQrStatus(row.status) : "notGenerated";
```

- [ ] **Step 3: details box** — replace the two boxes with one `DetailBox title={t("floorPlan.qr.details")}` holding: Status, Code version (`detail.version`), Generated (`formatDate(Date.parse(detail.generatedAtUtc))` + ` · {generatedBy}`), Printed count, Last printed (+ by), and when `detail.neverPrinted` a small amber chip `floorPlan.qr.neverPrinted`. Delete the Performance box and its scan rows. When `detail.address` is set, add a row with the address truncated (`dir="ltr"`) and a copy button (`navigator.clipboard.writeText`, toast `floorPlan.qr.copied`). The "Test" link uses `detail.address` (hidden when null).

The symbol: `row?.codeId ? <ServerSymbol pc={pc} codeId={row.codeId} size={160} dimmed={status === "disabled"} /> : noCode text`.

- [ ] **Step 4: actions**

```ts
async function act(kind: "disable" | "enable" | "regenerate" | "revoke") {
  if (!row?.codeId || pending) return;
  opId.current ??= crypto.randomUUID();
  const id = opId.current, code = row.codeId, rev = row.revision ?? undefined;
  setPending(true);
  try {
    if (kind === "disable") await pc.run((b) => disablePlaceCodes(b, id, { codes: [{ codeId: code, expectedRevision: rev }] }));
    if (kind === "enable") await pc.run((b) => enablePlaceCodes(b, id, { codes: [{ codeId: code, expectedRevision: rev }] }));
    if (kind === "regenerate") await pc.run((b) => regeneratePlaceCode(b, code, id, rev));
    if (kind === "revoke") await pc.run((b) => revokePlaceCode(b, code, id, rev));
    opId.current = null; setAsk(null);
    notify(t(`floorPlan.qr.done.${kind}`).replace("{number}", table!.number), kind === "revoke" || kind === "disable" ? "info" : "success");
    if (kind === "revoke") onClose();
  } catch { /* run() toasted and refreshed */ } finally { setPending(false); }
}
```

Buttons (same grid as today): Print this (`printCodes`, disabled unless active/reprint), Download (`exportCodes`), Disable/Enable (`act`, danger style), Regenerate (opens `ask="regenerate"`, warning), and a new full-width text-danger link **Revoke code** (opens `ask="revoke"`), plus **Move to another table** (`onRelink(row.codeId)`, outline). No code → only the primary Generate button (`onGenerate`). Closing a confirm dialog clears `opId.current`.

Confirm dialogs:
- regenerate: title `floorPlan.qr.confirm.regenerate.title`, body `…regenerate.body`, confirm `floorPlan.qr.regenerate`, tone warning → `act("regenerate")`.
- revoke: title `…revoke.title`, body `…revoke.body`, confirm `floorPlan.qr.revoke`, tone danger → `act("revoke")`.

- [ ] **Step 5: `index.tsx`** — pass the new props; remove the old `onToggleDisabled`/`onRegenerate`/`onPrint`/`onDownload` handlers. Keep `onGenerate={() => open && startGenerate([open.id])}`; `onRelink` is a no-op until Task 8 (`() => undefined`) — **Task 8 replaces it in the same file**; to avoid shipping a dead button between commits, render the "Move to another table" button only when `onRelink` is provided, and pass it from Task 8 onward.

i18n:

| key | en | ar |
|---|---|---|
| `floorPlan.qr.field.version` | Code version: | إصدار الكود: |
| `floorPlan.qr.field.address` | Link: | الرابط: |
| `floorPlan.qr.neverPrinted` | Never printed | لم يُطبع أبدًا |
| `floorPlan.qr.copied` | Copied | تم النسخ |
| `floorPlan.qr.revoke` | Revoke code | إلغاء الكود |
| `floorPlan.qr.moveToTable` | Move to another table | نقل إلى طاولة أخرى |
| `floorPlan.qr.done.disable` | Table {number}'s code is disabled | تم تعطيل كود الطاولة {number} |
| `floorPlan.qr.done.enable` | Table {number}'s code is active again | كود الطاولة {number} مفعّل مرة أخرى |
| `floorPlan.qr.done.regenerate` | Table {number} has a new code — reprint it | الطاولة {number} لديها كود جديد — أعد طباعته |
| `floorPlan.qr.done.revoke` | Table {number}'s code is revoked | تم إلغاء كود الطاولة {number} |
| `floorPlan.qr.confirm.regenerate.title` | Replace this code? | استبدال هذا الكود؟ |
| `floorPlan.qr.confirm.regenerate.body` | The sticker on the table stops working until you print the new one. | سيتوقف الملصق الموجود على الطاولة عن العمل حتى تطبع الكود الجديد. |
| `floorPlan.qr.confirm.revoke.title` | Revoke this code for good? | إلغاء هذا الكود نهائيًا؟ |
| `floorPlan.qr.confirm.revoke.body` | It can't be turned back on. The table can get a new code later. | لا يمكن إعادة تفعيله. يمكن إنشاء كود جديد للطاولة لاحقًا. |

Delete the now-unused keys `floorPlan.qr.performance`, `floorPlan.qr.field.totalScan`, `floorPlan.qr.field.firstScan`, `floorPlan.qr.field.lastScan`, `floorPlan.qr.disabledDone`, `floorPlan.qr.enabledDone`, `floorPlan.qr.regeneratedDone` from both locales **only after** `grep -rn "<key>" apps packages` shows no other user.

- [ ] **Step 6: Type-check, tests, manual** — disable → plan shows disabled; enable; regenerate (confirm) → status `reprint`/new version; revoke → table back to not generated; open the same table in two tabs, disable in one, regenerate in the other → "changed by someone else" toast and fresh state.

- [ ] **Step 7: Commit** `feat(merchant): table code details, disable, replace and revoke`

---

### Task 7: Activity tab with history rebuild

**Files:**
- Create: `apps/merchant/src/pages/reservations/floor-plan/qr/activity-list.tsx`
- Modify: `apps/merchant/src/pages/reservations/floor-plan/qr/table-qr-modal.tsx` (tabs)

**Interfaces:**
- Consumes: `listPlaceCodeActivity`, `rebuildPlaceCodeHistory` (Task 1); `PlaceCodesState`; `formatDate` from `./parts`.
- Produces: `ActivityList({ pc, codeId }: { pc: PlaceCodesState; codeId: string })`.

- [ ] **Step 1: Tabs in the modal** — under the title, two pill buttons `floorPlan.qr.tab.details` / `floorPlan.qr.tab.activity` (shown only when a code exists), styled like the page's other segmented controls (`BORDER_200`, active = `bg-[#0d6efd] text-white`). `tab === "activity"` renders `<ActivityList pc={pc} codeId={row.codeId} />` in place of the details box; the action buttons stay below in both tabs.

- [ ] **Step 2: `activity-list.tsx`**

```tsx
// One code lineage's timeline, newest first on screen (the server sends oldest first).
export function ActivityList({ pc, codeId }: { pc: PlaceCodesState; codeId: string }) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<PlaceCodeActivityResponse | null>(null);
  const [error, setError] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const load = useCallback(() => {
    setError(false);
    listPlaceCodeActivity(pc.businessId, codeId).then(setData).catch(() => setError(true));
  }, [pc.businessId, codeId]);
  useEffect(load, [load]);

  if (error) return <p className={clsx("text-[14px]", TEXT_SECONDARY)}>{t("floorPlan.qr.error.generic")} <button type="button" className="underline" onClick={load}>{t("floorPlan.qr.retry")}</button></p>;
  if (!data) return <div className="h-24 animate-pulse rounded-[12px] bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-border-card)]" />;
  const entries = [...data.entries].reverse();
  const missing = data.history.expected - data.history.recorded;
  return (
    <div className="flex flex-col gap-3">
      {!data.history.complete && (
        <div className="flex items-center justify-between gap-3 rounded-[12px] bg-[#fff7ed] px-3 py-2 text-[13px] text-[#9a3412] [[data-theme=dark]_&]:bg-[#9a3412]/20 [[data-theme=dark]_&]:text-[#fdba74]">
          <span>{t("floorPlan.qr.activity.missing").replace("{n}", String(missing))}</span>
          <button type="button" disabled={rebuilding} className="font-semibold underline disabled:opacity-50"
            onClick={async () => { setRebuilding(true); try { await pc.run((b) => rebuildPlaceCodeHistory(b, codeId)); load(); } catch { /* toasted */ } finally { setRebuilding(false); } }}>
            {t("floorPlan.qr.activity.rebuild")}
          </button>
        </div>
      )}
      <ol className="flex flex-col">
        {entries.map((e, i) => (
          <li key={`${e.generation}-${e.revision}-${e.kind}-${i}`} className={clsx("flex items-start gap-3 border-b py-2 last:border-b-0", BORDER_200)}>
            <span className={clsx("mt-1 h-2 w-2 shrink-0 rounded-full", DOT[e.kind])} />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className={clsx("text-[14px] font-medium", TEXT_PRIMARY)}>
                {t(`floorPlan.qr.activity.kind.${e.kind}`).replace("{number}", e.placeNumber ?? "—")}
                {e.reconstructed && <span className={clsx("ms-2 text-[11px]", TEXT_SECONDARY)}>{t("floorPlan.qr.activity.reconstructed")}</span>}
              </span>
              <span className={clsx("text-[12px]", TEXT_SECONDARY)}>{formatDate(Date.parse(e.occurredAtUtc), locale, true)}{e.actor ? ` · ${e.actor}` : ""}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
const DOT: Record<PlaceCodeActivityKind, string> = {
  Generated: "bg-[#22c55e]", Enabled: "bg-[#22c55e]", Disabled: "bg-[#64748b]", Relinked: "bg-[#0d6efd]",
  Revoked: "bg-[#ef4444]", Printed: "bg-[#f59e0b]", Exported: "bg-[#f59e0b]",
};
```

(imports: `useCallback, useEffect, useState` from react; `clsx`; `listPlaceCodeActivity, rebuildPlaceCodeHistory, type PlaceCodeActivityKind, type PlaceCodeActivityResponse` from `@octopus/api-client`; `useI18n`; `BORDER_200, TEXT_PRIMARY, TEXT_SECONDARY` from `../../_shared/theme`; `formatDate` from `./parts`; `PlaceCodesState` type from `./use-place-codes`.)

i18n:

| key | en | ar |
|---|---|---|
| `floorPlan.qr.tab.details` | Details | التفاصيل |
| `floorPlan.qr.tab.activity` | Activity | النشاط |
| `floorPlan.qr.activity.missing` | {n} entries are missing from this history. | {n} إدخالات مفقودة من هذا السجل. |
| `floorPlan.qr.activity.rebuild` | Rebuild | إعادة البناء |
| `floorPlan.qr.activity.reconstructed` | (rebuilt) | (أعيد بناؤه) |
| `floorPlan.qr.activity.kind.Generated` | Generated for table {number} | تم الإنشاء للطاولة {number} |
| `floorPlan.qr.activity.kind.Disabled` | Disabled | تم التعطيل |
| `floorPlan.qr.activity.kind.Enabled` | Enabled | تم التفعيل |
| `floorPlan.qr.activity.kind.Relinked` | Moved to table {number} | تم النقل إلى الطاولة {number} |
| `floorPlan.qr.activity.kind.Revoked` | Revoked | تم الإلغاء |
| `floorPlan.qr.activity.kind.Printed` | Printed | تمت الطباعة |
| `floorPlan.qr.activity.kind.Exported` | Downloaded | تم التنزيل |

- [ ] **Step 3: Type-check, manual** — a code that was generated, printed and disabled shows three entries, newest first; AR shows RTL with the dot on the right.

- [ ] **Step 4: Commit** `feat(merchant): table code activity timeline`

---

### Task 8: Attention list and re-link

**Files:**
- Create: `apps/merchant/src/pages/reservations/floor-plan/qr/relink-modal.tsx`
- Create: `apps/merchant/src/pages/reservations/floor-plan/qr/attention-panel.tsx`
- Modify: `apps/merchant/src/pages/reservations/floor-plan/qr/index.tsx`

**Interfaces:**
- Consumes: `relinkPlaceCode`, `revokePlaceCode` (Task 1); `PlaceCodesState`; `QrPlan` (existing, props `doc, statusOf, dimmedIds, selectedIds, onTable, className`); `ConfirmDialog` (Task 6).
- Produces: `RelinkModal({ doc, pc, codeId, onClose, notify })`, `AttentionPanel({ pc, onRelink, notify })`.

- [ ] **Step 1: `relink-modal.tsx`** — `Modal` (`max-w-[900px]`), title `floorPlan.qr.relink.title`, hint `floorPlan.qr.relink.hint`, a `QrPlan` (height 420px) where clicking a table selects it (`selectedIds`); tables that already have an active/reprint/disabled code are drawn with their status and **can** be picked (server decides; 409 `relink-target-taken` toasts via `run`). Confirm button `floorPlan.qr.relink.confirm` (`{number}` of the picked table), disabled until picked or while pending. On confirm:

```ts
const target = pc.rows.get(picked.id);
const resourceId = target?.resourceId ?? picked.id;
opId.current ??= crypto.randomUUID();
await pc.run((b) => relinkPlaceCode(b, codeId, opId.current!, resourceId));
notify(t("floorPlan.qr.relink.done").replace("{number}", picked.number));
onClose();
```

`expectedRevision` comes from the attention entry or the row (`revision`) — pass it as a prop `revision?: number` and forward it.

- [ ] **Step 2: `attention-panel.tsx`** — render nothing when `pc.attention.length === 0`. Otherwise an amber card above the plan: heading `floorPlan.qr.attention.title` with `{n}`, body `floorPlan.qr.attention.body`, and one row per entry: "Table {lastKnownNumber ?? '—'}" + buttons:
  - when `candidate`: primary small **Move to table {candidate.number}** → `relinkPlaceCode(b, codeId, uuid, candidate.resourceId, revision)` via `pc.run`, toast `relink.done`.
  - **Choose table** → `onRelink(codeId, revision)`.
  - **Revoke** → `ConfirmDialog` (revoke texts from Task 6) → `revokePlaceCode` via `pc.run`.

Each row keeps its own `opId` ref map `Record<codeId, string>` cleared on success.

- [ ] **Step 3: `index.tsx`** — state `const [relink, setRelink] = useState<{ codeId: string; revision?: number } | null>(null)`; render `<AttentionPanel pc={pc} onRelink={(codeId, revision) => setRelink({ codeId, revision })} notify={notify} />` above the zone/legend row; render `RelinkModal` when `relink` is set; pass `onRelink={(codeId) => { setOpenId(null); setRelink({ codeId, revision: open ? pc.rows.get(open.id)?.revision ?? undefined : undefined }); }}` to `TableQrModal` (this activates its "Move to another table" button from Task 6).

i18n:

| key | en | ar |
|---|---|---|
| `floorPlan.qr.relink.title` | Move code to another table | نقل الكود إلى طاولة أخرى |
| `floorPlan.qr.relink.hint` | Pick the table the printed sticker is on now. | اختر الطاولة الموجود عليها الملصق المطبوع الآن. |
| `floorPlan.qr.relink.confirm` | Move to table {number} | نقل إلى الطاولة {number} |
| `floorPlan.qr.relink.done` | The code now opens table {number} | الكود يفتح الآن الطاولة {number} |
| `floorPlan.qr.attention.title` | {n} codes need attention | {n} أكواد تحتاج إلى انتباه |
| `floorPlan.qr.attention.body` | Their tables are no longer on the floor. Move each code to a table, or revoke it. | طاولاتها لم تعد موجودة في المخطط. انقل كل كود إلى طاولة أو قم بإلغائه. |
| `floorPlan.qr.attention.chooseTable` | Choose table | اختيار طاولة |
| `floorPlan.qr.attention.moveTo` | Move to table {number} | نقل إلى الطاولة {number} |

- [ ] **Step 4: Type-check, manual** — in the floor builder remove a coded table and publish; the QR page shows it under Attention; "Choose table" → pick a table without a code → it becomes active; try a table that has a code → "Table N already has its own code" toast.

- [ ] **Step 5: Commit** `feat(merchant): attention list and re-linking table codes`

---

### Task 9: Print history

**Files:**
- Create: `apps/merchant/src/pages/reservations/floor-plan/qr/print-history-modal.tsx`
- Modify: `apps/merchant/src/pages/reservations/floor-plan/qr/index.tsx`

**Interfaces:**
- Consumes: `listPlaceCodePrintRuns`, `getPlaceCodeBundle` (Task 1); `PlaceCodesState`; `downloadBlob` (Task 3); `formatDate`.
- Produces: `PrintHistoryModal({ pc, open, onClose })`.

- [ ] **Step 1: modal** — `Modal max-w-[640px]`, title `floorPlan.qr.history.title`. Loads `listPlaceCodePrintRuns(pc.businessId, page)` on open/page change; table columns When (`formatDate(…, locale, true)`), By (`printedBy ?? "—"`), Codes (`itemCount`), Format (uppercase); each row a **Download** button → `getPlaceCodeBundle(pc.businessId, runId)` → `downloadBlob(fileName ?? \`print-run-${runId.slice(0, 8)}.zip\`, blob)`, errors via `notify(t(errorKey(e)), "error")`. Pager ‹ › using `metadata.totalCount / metadata.pageSize` (if `metadata` is null, show only ‹ › disabled when `data.length < 25`). Empty: `floorPlan.qr.history.empty`.

- [ ] **Step 2: `index.tsx`** — a third outline button next to Download all: `floorPlan.qr.history.open` with `ShellIcon name="fp-qr-timer-alt.svg"`; also make the "Last printed" stat card clickable to open it.

i18n:

| key | en | ar |
|---|---|---|
| `floorPlan.qr.history.open` | Print history | سجل الطباعة |
| `floorPlan.qr.history.title` | Print history | سجل الطباعة |
| `floorPlan.qr.history.when` | When | التاريخ |
| `floorPlan.qr.history.by` | By | بواسطة |
| `floorPlan.qr.history.count` | Codes | الأكواد |
| `floorPlan.qr.history.format` | Format | الصيغة |
| `floorPlan.qr.history.empty` | Nothing printed yet. | لم تتم طباعة أي شيء بعد. |
| `floorPlan.qr.download` | (exists) | (exists) |

- [ ] **Step 3: Type-check, manual** — after Task 4's print and export, both runs appear; Download gives a ZIP with `manifest.json`.

- [ ] **Step 4: Commit** `feat(merchant): table code print history`

---

### Task 10: Final verification and merge

- [ ] **Step 1:** `grep -rn "useTableQr\|qrSvgMarkup\|qrValue\|octo.tableQr" apps/merchant/src` → no results.
- [ ] **Step 2:** `npx tsc -p apps/merchant/tsconfig.json --noEmit`, `npm run lint -w @octopus/merchant`, `npm test -w @octopus/merchant` — compare against the baseline taken before Task 1 (`git stash` is **not** allowed: the tree has the user's uncommitted work); report any new error.
- [ ] **Step 3:** Full manual pass in EN and AR, light and dark: overview, generate (all / zone / picked), print, export, modal details, disable/enable, regenerate, revoke, activity + rebuild, attention + relink, print history, design shared across two browsers, add-on-disabled business.
- [ ] **Step 4:** Ask the user before merging. Then: `git switch main && git merge --no-ff feature/table-place-codes` (the user's uncommitted files travel with the working tree; if git refuses because a file overlaps, stop and ask). Push only if the user asks.
