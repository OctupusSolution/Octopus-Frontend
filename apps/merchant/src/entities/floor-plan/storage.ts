// Persistence for a business's floor plan: the published plan the live floor
// runs on, and at most one unpublished draft on top of it.
//
// Scoped per business — a merchant with two restaurants has two floors. The
// parser follows site-draft-storage: a payload from another version, or one
// whose shape is wrong, is discarded rather than patched. Draft and published
// are judged separately, though, so a corrupted draft never costs a merchant
// the plan their hosts are seating guests on.
import {
  DEFAULT_TABLE,
  TABLE_AREAS,
  TABLE_SHAPES,
  TABLE_SIZES,
  ZONE_COLORS,
  OBJECT_PRESETS,
  type FloorBackground,
  type FloorObject,
  type FloorPlanDoc,
  type FloorTable,
  type FloorZone,
  type Rotation,
} from "./model";
import { LIVE_STATUSES, type LiveOverrides } from "./live-status";
import type { Booking } from "./booking";

export const FLOOR_PLAN_STORAGE_VERSION = 1;

export type DraftMethod = "quick" | "scratch";
export type QuickStep = 1 | 2 | 3;

export interface FloorPlanDraft {
  doc: FloorPlanDoc;
  method: DraftMethod;
  /** Where the Quick Box wizard was when the draft was last saved. */
  step: QuickStep;
  savedAt: number;
  savedBy: string;
  /** True when the draft began as a copy of the live plan. */
  fromPublished: boolean;
}

export interface PublishedFloorPlan {
  doc: FloorPlanDoc;
  publishedAt: number;
  publishedBy: string;
}

export interface FloorPlanRecord {
  draft: FloorPlanDraft | null;
  published: PublishedFloorPlan | null;
}

export const EMPTY_RECORD: FloorPlanRecord = { draft: null, published: null };

export function floorPlanStorageKey(tenantId: string): string {
  return `octopus.floorPlan.${tenantId}`;
}

export function liveStateStorageKey(tenantId: string): string {
  return `octopus.floorPlan.live.${tenantId}`;
}

export function bookingsStorageKey(tenantId: string): string {
  return `octopus.floorPlan.bookings.${tenantId}`;
}

export function serializeRecord(record: FloorPlanRecord): string {
  return JSON.stringify({ version: FLOOR_PLAN_STORAGE_VERSION, ...record });
}

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function str(value: unknown): value is string {
  return typeof value === "string";
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function rotation(value: unknown): Rotation {
  return value === 90 || value === 180 || value === 270 ? value : 0;
}

function hasBox(value: Json): boolean {
  return str(value.id) && num(value.x) && num(value.y);
}

function parseTable(value: unknown): FloorTable | null {
  if (!isRecord(value) || value.kind !== "table" || !hasBox(value) || !str(value.number)) return null;
  if (!TABLE_SHAPES.includes(value.shape as never) || !TABLE_SIZES.includes(value.size as never) || !num(value.seats)) return null;
  return {
    id: value.id as string,
    kind: "table",
    number: value.number,
    shape: value.shape as FloorTable["shape"],
    size: value.size as FloorTable["size"],
    seats: value.seats,
    x: value.x as number,
    y: value.y as number,
    rotation: rotation(value.rotation),
    area: TABLE_AREAS.includes(value.area as never) ? (value.area as FloorTable["area"]) : DEFAULT_TABLE.area,
    smoking: value.smoking === "smoking" ? "smoking" : "nonSmoking",
    note: str(value.note) ? value.note : "",
    reservable: bool(value.reservable, DEFAULT_TABLE.reservable),
    walkIn: bool(value.walkIn, DEFAULT_TABLE.walkIn),
    largePartyOnly: bool(value.largePartyOnly, DEFAULT_TABLE.largePartyOnly),
    blocked: bool(value.blocked, DEFAULT_TABLE.blocked),
    joinable: bool(value.joinable, DEFAULT_TABLE.joinable),
    visible: bool(value.visible, DEFAULT_TABLE.visible),
    locked: bool(value.locked, false),
  };
}

function parseObject(value: unknown): FloorObject | null {
  if (!isRecord(value) || value.kind !== "object" || !hasBox(value) || !num(value.w) || !num(value.h)) return null;
  if (!str(value.type) || !(value.type in OBJECT_PRESETS)) return null;
  return {
    id: value.id as string,
    kind: "object",
    type: value.type as FloorObject["type"],
    x: value.x as number,
    y: value.y as number,
    w: value.w,
    h: value.h,
    rotation: rotation(value.rotation),
    label: str(value.label) ? value.label : "",
    locked: bool(value.locked, false),
  };
}

function parseZone(value: unknown): FloorZone | null {
  if (!isRecord(value) || value.kind !== "zone" || !hasBox(value) || !num(value.w) || !num(value.h) || !str(value.name)) return null;
  return {
    id: value.id as string,
    kind: "zone",
    name: value.name,
    color: ZONE_COLORS.includes(value.color as never) ? (value.color as FloorZone["color"]) : "slate",
    x: value.x as number,
    y: value.y as number,
    w: value.w,
    h: value.h,
    locked: bool(value.locked, false),
  };
}

function parseBackground(value: unknown): FloorBackground | null {
  if (!isRecord(value) || !str(value.dataUrl) || !str(value.mime) || !str(value.fileName)) return null;
  return {
    dataUrl: value.dataUrl,
    mime: value.mime,
    fileName: value.fileName,
    opacity: num(value.opacity) ? Math.min(1, Math.max(0.05, value.opacity)) : 0.5,
  };
}

/** A doc whose collections are not arrays, or whose canvas has no size, is
 *  unusable. Individual items that fail are dropped, not the whole plan. */
export function parseDoc(value: unknown): FloorPlanDoc | null {
  if (!isRecord(value)) return null;
  if (!num(value.width) || !num(value.height) || value.width <= 0 || value.height <= 0) return null;
  if (!Array.isArray(value.tables) || !Array.isArray(value.objects) || !Array.isArray(value.zones)) return null;
  return {
    name: str(value.name) && value.name.trim() ? value.name : "Main Floor",
    width: value.width,
    height: value.height,
    tables: value.tables.map(parseTable).filter((t): t is FloorTable => t !== null),
    objects: value.objects.map(parseObject).filter((o): o is FloorObject => o !== null),
    zones: value.zones.map(parseZone).filter((z): z is FloorZone => z !== null),
    background: parseBackground(value.background),
  };
}

function parseDraft(value: unknown): FloorPlanDraft | null {
  if (!isRecord(value)) return null;
  const doc = parseDoc(value.doc);
  if (!doc || (value.method !== "quick" && value.method !== "scratch") || !num(value.savedAt)) return null;
  const step = value.step === 2 || value.step === 3 ? value.step : 1;
  return {
    doc,
    method: value.method,
    step,
    savedAt: value.savedAt,
    savedBy: str(value.savedBy) ? value.savedBy : "",
    fromPublished: bool(value.fromPublished, false),
  };
}

function parsePublished(value: unknown): PublishedFloorPlan | null {
  if (!isRecord(value)) return null;
  const doc = parseDoc(value.doc);
  if (!doc || !num(value.publishedAt)) return null;
  return { doc, publishedAt: value.publishedAt, publishedBy: str(value.publishedBy) ? value.publishedBy : "" };
}

export function parseRecord(raw: string | null): FloorPlanRecord {
  if (!raw) return EMPTY_RECORD;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== FLOOR_PLAN_STORAGE_VERSION) return EMPTY_RECORD;
    return { draft: parseDraft(parsed.draft), published: parsePublished(parsed.published) };
  } catch {
    return EMPTY_RECORD;
  }
}

export function parseBookings(raw: string | null): Booking[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (value): value is Booking =>
        isRecord(value) && str(value.id) && str(value.tableId) && num(value.at) && num(value.partySize) && str(value.guestName) && num(value.createdAt)
    );
  } catch {
    return [];
  }
}

export function parseLiveOverrides(raw: string | null): LiveOverrides {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return {};
    const result: LiveOverrides = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (!isRecord(value) || !LIVE_STATUSES.includes(value.status as never) || !num(value.since)) continue;
      result[id] = {
        status: value.status as LiveOverrides[string]["status"],
        since: value.since,
        guests: num(value.guests) ? value.guests : 0,
        guestName: str(value.guestName) ? value.guestName : "",
        orderId: str(value.orderId) ? value.orderId : "",
        server: str(value.server) ? value.server : "",
        note: str(value.note) ? value.note : "",
      };
    }
    return result;
  } catch {
    return {};
  }
}
