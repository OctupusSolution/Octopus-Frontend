// Pure translation between the place-code DTOs and the Table QR page's own
// view shapes. No React, no fetch — unit-tested.
import {
  ApiError,
  type PlaceCodeDesign,
  type PlaceCodeDesignRequest,
  type PlaceCodeRow,
  type PlaceCodeSelection,
  type PlaceCodeStatus,
} from "@octopus/api-client";
import { zoneForTable, type FloorPlanDoc, type FloorTable } from "@/entities/floor-plan";
import type { QrDesign } from "./print";
import type { QrStatus } from "./qr-store";

/** The backend's ceiling for one generate, bulk lifecycle or print run. */
export const MAX_BATCH = 500;
export const chunkGuard = (n: number): boolean => n <= MAX_BATCH;

/** The server's message limit (PlaceCodeDesign.MaxMessageLength). */
const MAX_MESSAGE = 60;

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

/** The fewest generate requests for a choice of tables: the whole floor, one
 *  whole zone, or else one request per table (the backend's `one` mode takes
 *  a single place). */
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
  const serverZone = rows.get(chosen[0].id)?.zoneId;
  if (
    zone &&
    serverZone &&
    chosen.every((t) => zoneOf(t) === zone) &&
    tables.filter((t) => zoneOf(t) === zone).length === chosen.length
  ) {
    return [{ mode: "zone", zoneId: serverZone }];
  }

  return chosen.flatMap((t) => {
    const r = rows.get(t.id);
    return r ? [{ mode: "one" as const, resourceId: r.resourceId }] : [];
  });
}

const TEMPLATES: readonly QrDesign["template"][] = ["tent", "sticker", "square", "custom"];
const SIZES: readonly QrDesign["qrSize"][] = ["small", "medium", "large"];
const LABELS: readonly QrDesign["numberStyle"][] = ["circle", "plain", "badge"];
const pick = <T extends string>(list: readonly T[], v: string, fallback: T): T =>
  list.includes(v as T) ? (v as T) : fallback;

/** The half of the design the server keeps; the rest stays in the browser. */
export function designToServer(d: QrDesign, version: number): PlaceCodeDesignRequest {
  const message = d.message.trim();
  return {
    expectedVersion: version,
    templateKey: d.template,
    sizeKey: d.qrSize,
    labelStyle: d.numberStyle,
    showLabel: d.showNumber,
    message: d.showMessage && message ? message.slice(0, MAX_MESSAGE) : null,
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

/** The i18n key of the toast for a failed place-code call. */
export function errorKey(e: unknown): string {
  return `floorPlan.qr.error.${ERROR_KEYS[codeOf(e) ?? ""] ?? "generic"}`;
}

/** What the whole page shows when its first read fails. */
export function classifyLoadError(e: unknown): "notEnabled" | "forbidden" | "notPublished" | "failed" {
  const c = codeOf(e);
  if (c === "entitlements.feature-not-enabled") return "notEnabled";
  if (c === "authorization.forbidden") return "forbidden";
  if (c === "menu.place-code.floor-not-published") return "notPublished";
  return "failed";
}
