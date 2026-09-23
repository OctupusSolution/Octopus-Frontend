// Bridge between the merchant's FloorPlanDoc and the FloorPlan API.
//
// The builder keeps editing one local document. This module pushes it to the
// business's active plan — a "spot" per table, a server zone per drawn zone,
// a scene element per wall/door/decor — and reads it back. What the API cannot
// hold — a zone's drawn rectangle, the background image — stays in the local
// record; see `pullRecord`.
//
// The local model has table details the API models differently, so they ride
// on catalog codes the business is given once (`ensureCatalogs`): extra shape
// codes (square, tabliya, majlisL, tent) and `size-*` attributes. Area and
// smoking use the attributes the API already ships (indoor, outdoor, vip,
// smoking, non-smoking).
//
// A push sends the smallest set of calls that gets the server to the doc:
// moved-only tables go in one geometry batch, tables that only changed zone
// in one bulk update per zone, a copied table is a server-side duplicate, and
// the scene is patched element by element once a baseline is known.
import {
  ApiError,
  bulkUpdateSpots,
  clearSpotStatus,
  createFloorPlan,
  createSpot,
  createZone as createServerZone,
  deleteSpot,
  deleteZone as deleteServerZone,
  duplicateSpot,
  generateSpotGrid,
  getFloorPlan,
  getFloorPlanSettings,
  getFloorPlanValidationReport,
  getLayoutScene,
  getLiveBoard,
  getPublishedFloorPlan,
  listFloorPlans,
  listSpots,
  listZones,
  previewSpotGrid,
  publishFloorPlan,
  reorderZones,
  saveFloorPlanBuilderProgress,
  saveLayoutScene,
  setFloorPlanCanvas,
  setSpotAvailability,
  setSpotCombining,
  setSpotLock,
  setSpotStatus,
  updateFloorPlanCatalog,
  updateFloorPlanDetails,
  updateSceneElements,
  updateSpot,
  updateSpotGeometryBatch,
  updateZone as updateServerZone,
  type FloorPlanBuilderStep,
  type FloorPlanResponse,
  type LayoutSceneResponse,
  type LiveSpotResponse,
  type PublishedSpotDto,
  type SceneElementDto,
  type SpotGeometryChange,
  type SpotGeometryDto,
  type SpotGridRequest,
  type SpotResponse,
  type ZoneResponse,
} from "@octopus/api-client";
import {
  METERS_PER_UNIT,
  OBJECT_PRESETS,
  TABLE_SHAPES,
  WALL_TYPES,
  boundsOf,
  createTable,
  emptyDoc,
  tableBody,
  tableRect,
  zoneForTable,
  CHAIR_DEPTH,
  type FloorObject,
  type FloorPlanDoc,
  type FloorTable,
  type FloorZone,
  type ObjectType,
  type Rotation,
  type TableArea,
  type TableShape,
  type TableSize,
  type ZoneColor,
} from "./model";
import type { FloorPlanRecord, QuickStep } from "./storage";
import type { LiveStatus, LiveTableState } from "./live-status";

const OBJECT_TYPES = Object.keys(OBJECT_PRESETS) as ObjectType[];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isServerId = (id: string) => UUID.test(id);
const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const m = (units: number) => Math.round(units * METERS_PER_UNIT * 100) / 100;
const units = (meters: number) => Math.round((meters / METERS_PER_UNIT) * 100) / 100;

/** One lazily-created Map per business. */
function mapPer<K, V>() {
  const all = new Map<string, Map<K, V>>();
  const get = (businessId: string) => {
    let map = all.get(businessId);
    if (!map) all.set(businessId, (map = new Map()));
    return map;
  };
  return { get, clear: (businessId: string) => all.delete(businessId) };
}

/** local table id -> server spot id, per business, for this session. */
const spotIds = mapPer<string, string>();
/** local object id -> scene element id. */
const objectIds = mapPer<string, string>();
/** local zone id -> server zone id. */
const zoneIds = mapPer<string, string>();
/** Spots a grid just created that the doc may not carry yet — never deleted
 *  by a push until the doc has seen them once. */
const freshSpots = mapPer<string, true>();
/** planId -> element id -> the JSON last sent/read, so the next push can
 *  patch only what changed. */
const sceneBase = new Map<string, Map<string, string>>();
/** Plans whose scene refuses PATCH (the business lacks the Builder feature). */
const noScenePatch = new Set<string>();

// ---- active plan ------------------------------------------------------------
//
// A business can hold several plans (duplicates, archived ones). The builder
// and the live floor work on one of them: the one the merchant picked in the
// plan list, else the published one, else the first.

const activeKey = (businessId: string) => `octopus.floorPlan.activePlan.${businessId}`;

export function activePlanIdOf(businessId: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(activeKey(businessId));
  } catch {
    return null;
  }
}

function rememberActive(businessId: string, planId: string | null) {
  try {
    if (typeof window === "undefined") return;
    if (planId) window.localStorage.setItem(activeKey(businessId), planId);
    else window.localStorage.removeItem(activeKey(businessId));
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

/** Points the builder and live floor at another plan. The caller re-pulls. */
export function setActivePlan(businessId: string, planId: string | null): void {
  rememberActive(businessId, planId);
  spotIds.clear(businessId);
  objectIds.clear(businessId);
  zoneIds.clear(businessId);
  freshSpots.clear(businessId);
}

async function currentPlan(businessId: string): Promise<FloorPlanResponse | null> {
  const list = await listFloorPlans(businessId, { includeArchived: false, pageSize: 50 });
  const wanted = activePlanIdOf(businessId);
  const pick = list.data.find((p) => p.id === wanted) ?? list.data.find((p) => p.badge === "Published") ?? list.data[0];
  if (pick && pick.id !== wanted) rememberActive(businessId, pick.id);
  return pick ? getFloorPlan(businessId, pick.id) : null;
}

// The API lower-cases catalog codes, so the local camelCase shape is spelled
// in kebab-case on the wire.
const SHAPE_TO_CODE: Record<string, string> = { majlisL: "majlis-l" };
const CODE_TO_SHAPE: Record<string, string> = { "majlis-l": "majlisL" };
const shapeCode = (shape: string) => SHAPE_TO_CODE[shape] ?? shape;
const EXTRA_SHAPES = ["square", "tabliya", "majlis-l", "tent"];
const SIZE_ATTRS = ["size-small", "size-medium", "size-large"];
const ensured = new Set<string>();
const zoneKinds = new Map<string, string>();

/** Adds the codes the local model needs to the business's catalogs, once. */
async function ensureCatalogs(businessId: string): Promise<void> {
  if (ensured.has(businessId)) return;
  const s = await getFloorPlanSettings(businessId);
  const have = (list: { code: string }[], code: string) => list.some((e) => e.code.toLowerCase() === code.toLowerCase());
  const missingShapes = EXTRA_SHAPES.filter((c) => !have(s.shapes, c));
  if (missingShapes.length) {
    await updateFloorPlanCatalog(businessId, "shapes", {
      entries: [...s.shapes, ...missingShapes.map((code) => ({ code, label: code, isEnabled: true }))],
      expectedVersion: null,
    });
  }
  const missingAttrs = SIZE_ATTRS.filter((c) => !have(s.attributes, c));
  if (missingAttrs.length) {
    await updateFloorPlanCatalog(businessId, "attributes", {
      entries: [...s.attributes, ...missingAttrs.map((code) => ({ code, label: code, isEnabled: true }))],
      expectedVersion: null,
    });
  }
  zoneKinds.set(businessId, s.zoneKinds.find((k) => k.isEnabled)?.code ?? "main");
  ensured.add(businessId);
}

// ---- table <-> spot ---------------------------------------------------------

const AREA_ATTRS: TableArea[] = ["indoor", "outdoor", "vip"];

function attributesOf(t: FloorTable): string[] {
  const attrs = [`size-${t.size}`, t.smoking === "smoking" ? "smoking" : "non-smoking"];
  if ((AREA_ATTRS as string[]).includes(t.area)) attrs.push(t.area);
  return attrs;
}

function geometryOf(t: FloorTable): SpotGeometryDto {
  const body = tableBody(t.shape, t.size);
  return {
    x: m(t.x),
    y: m(t.y),
    width: m(body.w + CHAIR_DEPTH * 2),
    height: m(body.h + CHAIR_DEPTH * 2),
    rotationDegrees: t.rotation,
  };
}

function specOf(t: FloorTable) {
  return {
    code: t.number,
    displayName: null,
    kindCode: "standard",
    shapeCode: shapeCode(t.shape),
    geometry: geometryOf(t),
    capacity: t.seats,
    minPartySize: 1,
    maxPartySize: t.seats,
    attributeCodes: attributesOf(t),
    acceptance: {
      acceptsAdvance: t.reservable,
      acceptsWalkIn: t.walkIn,
      walkInOnly: t.walkIn && !t.reservable,
      largePartyOnly: t.largePartyOnly,
      customerVisible: t.visible,
    },
    internalNote: t.note || null,
  };
}

type Spec = ReturnType<typeof specOf>;

function specFromSpot(s: SpotResponse): Spec {
  return {
    code: s.code,
    displayName: null,
    kindCode: s.kindCode,
    shapeCode: s.shapeCode,
    geometry: s.geometry,
    capacity: s.capacity,
    minPartySize: s.minPartySize,
    maxPartySize: s.maxPartySize,
    attributeCodes: [...s.attributeCodes],
    acceptance: s.acceptance,
    internalNote: s.internalNote,
  };
}

/** Everything but where the table stands, spelled the same way for both sides. */
function restKey(spec: Spec, withCode: boolean): string {
  const { geometry: _geometry, code, displayName: _name, ...rest } = spec;
  return JSON.stringify(withCode ? { code, ...rest } : rest);
}

function sameGeometry(a: SpotGeometryDto, b: SpotGeometryDto): boolean {
  const near = (x: number, y: number) => Math.abs(x - y) < 0.006;
  return near(a.x, b.x) && near(a.y, b.y) && near(a.width, b.width) && near(a.height, b.height) && near(a.rotationDegrees, b.rotationDegrees);
}

function tableFromSpot(s: SpotResponse | PublishedSpotDto, extra: { note?: string; blocked?: boolean; locked?: boolean }): FloorTable {
  const attrs = "attributeCodes" in s ? s.attributeCodes : s.attributes;
  const localShape = CODE_TO_SHAPE[s.shapeCode] ?? s.shapeCode;
  const shape = (TABLE_SHAPES as readonly string[]).includes(localShape) ? (localShape as TableShape) : "square";
  const size = (["small", "medium", "large"] as TableSize[]).find((z) => attrs.includes(`size-${z}`)) ?? "medium";
  const area = AREA_ATTRS.find((a) => attrs.includes(a)) ?? "regular";
  const base = createTable(s.code, units(s.geometry.x), units(s.geometry.y), { shape, size, seats: s.capacity });
  return {
    ...base,
    id: s.id,
    rotation: (([0, 90, 180, 270] as number[]).includes(s.geometry.rotationDegrees) ? s.geometry.rotationDegrees : 0) as Rotation,
    area,
    smoking: attrs.includes("smoking") ? "smoking" : "nonSmoking",
    note: extra.note ?? "",
    reservable: s.acceptance.acceptsAdvance,
    walkIn: s.acceptance.acceptsWalkIn,
    largePartyOnly: s.acceptance.largePartyOnly,
    blocked: extra.blocked ?? s.availability.mode !== "Active",
    joinable: s.combining.isCombinable,
    visible: s.acceptance.customerVisible,
    locked: extra.locked ?? false,
  };
}

const draftTable = (s: SpotResponse) => tableFromSpot(s, { note: s.internalNote ?? "", blocked: s.availability.mode !== "Active", locked: s.isLocked });

// ---- zones ------------------------------------------------------------------
//
// A server zone is a named group of spots; the local zone is a rectangle drawn
// on the floor. Membership is the rectangle's: whichever zone contains a
// table's centre is the zone its spot is assigned to. The rectangle itself has
// nowhere to live on the API, so it stays local, and a zone that arrives from
// the server without one is drawn around its tables.

const ZONE_HEX: Record<ZoneColor, string> = {
  blue: "#0D6EFD",
  violet: "#6C4DFF",
  amber: "#F59E0B",
  green: "#22C55E",
  slate: "#8B8B93",
};

function zoneColorOf(hex: string | null): ZoneColor | null {
  if (!hex) return null;
  const found = (Object.keys(ZONE_HEX) as ZoneColor[]).find((c) => ZONE_HEX[c].toLowerCase() === hex.toLowerCase());
  return found ?? null;
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Syncs the doc's zones and returns the server zone each table belongs in. */
async function pushZones(businessId: string, planId: string, doc: FloorPlanDoc): Promise<Map<string, string | null>> {
  const ids = zoneIds.get(businessId);
  const server = (await listZones(businessId, planId)).slice().sort((a, b) => a.position - b.position);
  const byId = new Map(server.map((z) => [z.id, z]));
  const claimed = new Map<string, ZoneResponse | null>();
  const used = new Set<string>();
  for (const z of doc.zones) {
    const sid = ids.get(z.id) ?? (isServerId(z.id) ? z.id : null);
    const hit = sid ? byId.get(sid) : undefined;
    if (hit && !used.has(hit.id)) {
      claimed.set(z.id, hit);
      used.add(hit.id);
    }
  }
  // A zone drawn before this session (or before ids were kept) is recognised
  // by its name rather than created a second time.
  for (const z of doc.zones) {
    if (claimed.has(z.id)) continue;
    const hit = server.find((s) => !used.has(s.id) && sameName(s.name, z.name));
    claimed.set(z.id, hit ?? null);
    if (hit) used.add(hit.id);
  }
  // Deleting first frees the names and the zone limit for what replaces them.
  for (const s of server) if (!used.has(s.id)) await deleteServerZone(businessId, planId, s.id, s.version);

  const kind = zoneKinds.get(businessId) ?? "main";
  const names = new Set<string>();
  const order: string[] = [];
  for (const z of doc.zones) {
    let name = z.name.trim() || "Zone";
    for (let n = 2; names.has(name.toLowerCase()); n += 1) name = `${z.name.trim() || "Zone"} ${n}`;
    names.add(name.toLowerCase());
    const color = ZONE_HEX[z.color];
    let s = claimed.get(z.id) ?? null;
    if (!s) {
      s = await createServerZone(businessId, planId, { name, kindCode: kind, color }, key());
    } else if (s.name !== name || (s.color ?? "").toLowerCase() !== color.toLowerCase()) {
      s = await updateServerZone(businessId, planId, s.id, {
        name,
        kindCode: s.kindCode,
        color,
        attributeCodes: s.attributeCodes,
        minPartySize: s.minPartySize,
        priority: s.priority,
        expectedVersion: s.version,
      });
    }
    ids.set(z.id, s.id);
    order.push(s.id);
  }
  const now = [...server.filter((s) => used.has(s.id)).map((s) => s.id), ...order.filter((id) => !byId.has(id))];
  if (order.join() !== now.join()) await reorderZones(businessId, planId, { zoneIds: order });

  const membership = new Map<string, string | null>();
  for (const t of doc.tables) {
    const zone = zoneForTable(doc, t);
    membership.set(t.id, zone ? (ids.get(zone.id) ?? null) : null);
  }
  return membership;
}

interface ZoneLike {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

/** Server zones as local rectangles: the rectangle the merchant drew when this
 *  browser has it, otherwise one drawn around the zone's tables. */
function zonesFrom(server: readonly ZoneLike[], tables: readonly FloorTable[], zoneOfTable: ReadonlyMap<string, string | null>, local: readonly FloorZone[] | undefined): FloorZone[] {
  const pool = [...(local ?? [])];
  const out: FloorZone[] = [];
  for (const z of [...server].sort((a, b) => a.position - b.position)) {
    let i = pool.findIndex((l) => l.id === z.id);
    if (i < 0) i = pool.findIndex((l) => !isServerId(l.id) && sameName(l.name, z.name));
    const hit = i >= 0 ? pool.splice(i, 1)[0] : undefined;
    const around = boundsOf(tables.filter((t) => zoneOfTable.get(t.id) === z.id).map(tableRect));
    const rect = hit
      ? { x: hit.x, y: hit.y, w: hit.w, h: hit.h }
      : around
        ? { x: Math.max(0, around.x - 0.5), y: Math.max(0, around.y - 0.5), w: around.w + 1, h: around.h + 1 }
        : { x: 1 + out.length * 2, y: 1 + out.length * 2, w: 10, h: 8 };
    out.push({ id: z.id, kind: "zone", name: z.name, color: zoneColorOf(z.color) ?? hit?.color ?? "slate", locked: hit?.locked ?? false, ...rect });
  }
  // Zones drawn here that never reached the server yet are kept for the next
  // push; ones with a server id that the server no longer has were deleted.
  return [...out, ...pool.filter((l) => !isServerId(l.id))];
}

// ---- objects (walls, doors, decor) <-> scene --------------------------------
//
// BACKEND_GAPS 3.5: the API's own element kinds (Wall/Door/Decor/Counter/
// Text/Room) are coarser than the local `ObjectType` union, so a sub-type
// that a kind's own payload can't carry round-trips through a value chosen to
// be unambiguous on the way back (wall vs. halfWall by thickness; door vs.
// doubleDoor by width, since the local presets are 3m and 4.4m — far enough
// apart that a merchant's resize would have to be extreme to cross the 3.5m
// line this reads it back on).
const SCENE_LAYER = "default";
const SCENE_LAYERS = [{ code: SCENE_LAYER, isVisible: true, isLocked: false }];
const DOOR_TYPES: ReadonlySet<ObjectType> = new Set(["door", "doubleDoor"]);

function sceneElementOf(o: FloorObject, index: number): SceneElementDto {
  const bounds = { x: m(o.x), y: m(o.y), width: m(o.w), height: m(o.h), rotationDegrees: o.rotation };
  const base = { id: o.id, layerCode: SCENE_LAYER, bounds, zIndex: index, isLocked: o.locked };
  if (WALL_TYPES.has(o.type)) {
    return { ...base, kind: "Wall", wall: { fromX: bounds.x, fromY: bounds.y, toX: m(o.x + o.w), toY: bounds.y, thickness: o.type === "wall" ? 0.3 : 0.15 } };
  }
  if (DOOR_TYPES.has(o.type)) {
    return { ...base, kind: "Door", door: { swing: "None", clearance: bounds.width } };
  }
  if (o.type === "text") return { ...base, kind: "Text", text: { text: o.label, fontSize: 14 } };
  if (o.type === "room") return { ...base, kind: "Room", room: { label: o.label || null, color: null } };
  return { ...base, kind: "Decor", decor: { decorCode: o.type } };
}

function objectFromScene(e: SceneElementDto): FloorObject {
  const decor = e.decor?.decorCode ?? "";
  const type: ObjectType =
    e.kind === "Wall"
      ? (e.wall && e.wall.thickness <= 0.2 ? "halfWall" : "wall")
      : e.kind === "Door"
        ? (e.door && e.door.clearance >= 3.5 ? "doubleDoor" : "door")
        : e.kind === "Text"
          ? "text"
          : e.kind === "Room"
            ? "room"
            : e.kind === "Decor" && (OBJECT_TYPES as readonly string[]).includes(decor)
              ? (decor as ObjectType)
              : "counter";
  return {
    id: e.id,
    kind: "object",
    type,
    x: units(e.bounds.x),
    y: units(e.bounds.y),
    w: units(e.bounds.width),
    h: units(e.bounds.height),
    rotation: (([0, 90, 180, 270] as number[]).includes(e.bounds.rotationDegrees) ? e.bounds.rotationDegrees : 0) as Rotation,
    label: e.text?.text ?? e.room?.label ?? "",
    locked: e.isLocked,
  };
}

const rememberScene = (planId: string, elements: readonly SceneElementDto[]) =>
  sceneBase.set(planId, new Map(elements.map((e) => [e.id, JSON.stringify(e)])));

async function pushObjects(businessId: string, planId: string, objects: readonly FloorObject[]): Promise<void> {
  const ids = objectIds.get(businessId);
  // Element ids are the caller's own and the server keeps them, so a local
  // object keeps whatever id it was first saved (or read back) under.
  const elements = objects.map((o, i) => {
    const el = sceneElementOf(o, i);
    return { ...el, id: ids.get(o.id) ?? o.id };
  });
  const base = sceneBase.get(planId);
  let saved: LayoutSceneResponse | null = null;
  if (base && !noScenePatch.has(planId)) {
    const upserts = elements.filter((e) => base.get(e.id) !== JSON.stringify(e));
    const current = new Set(elements.map((e) => e.id));
    const removedElementIds = [...base.keys()].filter((id) => !current.has(id));
    if (upserts.length === 0 && removedElementIds.length === 0) return;
    try {
      saved = await updateSceneElements(businessId, planId, { upserts, removedElementIds, layers: SCENE_LAYERS, expectedVersion: null });
    } catch (err) {
      // PATCH needs the Builder feature; a business without it still has the
      // whole-scene PUT (which is what ran before PATCH existed).
      if (!(err instanceof ApiError) || ![403, 404, 405].includes(err.status)) throw err;
      noScenePatch.add(planId);
    }
  }
  if (!saved) saved = await saveLayoutScene(businessId, planId, { layers: SCENE_LAYERS, elements, expectedVersion: null });
  rememberScene(planId, elements);
  objects.forEach((o, i) => ids.set(o.id, elements[i].id));
}

async function pullObjects(businessId: string, planId: string): Promise<FloorObject[]> {
  try {
    const scene = await getLayoutScene(businessId, planId);
    rememberScene(planId, scene.elements);
    return scene.elements.map(objectFromScene);
  } catch {
    // No scene saved yet for this plan — draw nothing rather than fail the
    // whole pull over an empty canvas.
    return [];
  }
}

// ---- plan lifecycle ---------------------------------------------------------

function canvasOf(doc: FloorPlanDoc) {
  return { width: m(doc.width), height: m(doc.height), gridStep: 0.38 };
}

async function ensurePlan(businessId: string, doc: FloorPlanDoc, method: "Scratch" | "QuickGrid"): Promise<FloorPlanResponse> {
  const existing = await currentPlan(businessId);
  if (existing) return existing;
  const created = await createFloorPlan(
    businessId,
    { name: doc.name || "Main Floor", creationMethod: method, canvas: canvasOf(doc) },
    key()
  );
  rememberActive(businessId, created.id);
  return created;
}

/** Every spot of a plan; the API pages at 100. */
async function allSpots(businessId: string, planId: string): Promise<SpotResponse[]> {
  const out: SpotResponse[] = [];
  for (let page = 1; ; page += 1) {
    const res = await listSpots(businessId, planId, { page, pageSize: 100 });
    out.push(...res.data);
    if (res.data.length < 100) return out;
  }
}

/** Pushes run one after another per business: two in flight would both try to
 *  create the same missing plan or table. */
const chains = new Map<string, Promise<unknown>>();
function queued<T>(businessId: string, job: () => Promise<T>): Promise<T> {
  const run = (chains.get(businessId) ?? Promise.resolve()).then(job);
  chains.set(businessId, run.then(() => undefined, () => undefined));
  return run;
}

/** Pushes `doc`'s tables, zones, drawing and canvas to the active plan. */
export function pushDraft(businessId: string, doc: FloorPlanDoc, method: "quick" | "scratch"): Promise<FloorPlanResponse> {
  return queued(businessId, () => pushNow(businessId, doc, method));
}

async function pushNow(businessId: string, doc: FloorPlanDoc, method: "quick" | "scratch"): Promise<FloorPlanResponse> {
  await ensureCatalogs(businessId);
  let plan = await ensurePlan(businessId, doc, method === "quick" ? "QuickGrid" : "Scratch");
  const canvas = canvasOf(doc);
  if (plan.canvas.width !== canvas.width || plan.canvas.height !== canvas.height) {
    plan = await setFloorPlanCanvas(businessId, plan.id, { canvas, expectedVersion: null });
  }

  const membership = await pushZones(businessId, plan.id, doc);
  await pushSpots(businessId, plan.id, doc, membership);
  await pushObjects(businessId, plan.id, doc.objects);

  // Renamed in the builder: last, so a name clash never holds up the tables.
  const name = doc.name.trim();
  const latest = await getFloorPlan(businessId, plan.id);
  if (name && name !== latest.name) {
    return updateFloorPlanDetails(businessId, plan.id, {
      name,
      description: latest.description,
      branchId: latest.branchId,
      expectedVersion: latest.version,
    });
  }
  return latest;
}

async function pushSpots(businessId: string, planId: string, doc: FloorPlanDoc, membership: ReadonlyMap<string, string | null>): Promise<void> {
  const ids = spotIds.get(businessId);
  const fresh = freshSpots.get(businessId);
  const existing = new Map((await allSpots(businessId, planId)).map((s) => [s.id, s]));

  const mapped = new Map<string, SpotResponse>();
  for (const t of doc.tables) {
    const sid = ids.get(t.id) ?? (isServerId(t.id) ? t.id : null);
    const s = sid ? existing.get(sid) : undefined;
    if (s) {
      mapped.set(t.id, s);
      fresh.delete(s.id);
    }
  }
  const kept = new Set([...mapped.values()].map((s) => s.id));
  // Removed tables go first so their numbers are free for whatever replaces them.
  for (const [sid, s] of existing) {
    if (!kept.has(sid) && !fresh.has(sid)) await deleteSpot(businessId, planId, sid, s.version);
  }

  const geometry: SpotGeometryChange[] = [];
  const zoneMoves = new Map<string, string[]>();
  const latest = new Map<string, SpotResponse>();

  for (const t of doc.tables) {
    const spec = specOf(t);
    const zoneId = membership.get(t.id) ?? null;
    let s = mapped.get(t.id);
    if (!s) {
      // A table set up exactly like one already saved (a copy, or another of
      // the same kind) is duplicated server-side: one call, and it carries the
      // original's availability and combining along with it.
      const want = restKey(spec, false);
      const twin = [...mapped.values()].find((other) => restKey(specFromSpot(other), false) === want);
      if (twin) {
        s = await duplicateSpot(businessId, planId, twin.id, { code: spec.code, geometry: spec.geometry }, key());
      } else {
        s = await createSpot(
          businessId,
          planId,
          { code: spec.code, zoneId, kindCode: spec.kindCode, shapeCode: spec.shapeCode, geometry: spec.geometry, capacity: spec.capacity, attributeCodes: spec.attributeCodes, acceptance: spec.acceptance },
          key()
        );
      }
      ids.set(t.id, s.id);
      if (restKey(specFromSpot(s), true) !== restKey(spec, true)) {
        s = await updateSpot(businessId, planId, s.id, { ...spec, zoneId, expectedVersion: null });
      }
    } else if (restKey(specFromSpot(s), true) !== restKey(spec, true)) {
      s = await updateSpot(businessId, planId, s.id, { ...spec, zoneId, expectedVersion: null });
    } else if (!sameGeometry(s.geometry, spec.geometry)) {
      // Moved, resized or rotated only — the drag of a whole selection lands
      // as one batch instead of a PUT per table.
      geometry.push({ spotId: s.id, geometry: spec.geometry, expectedVersion: s.version });
    }
    if ((s.zoneId ?? null) !== zoneId) {
      const bucket = zoneId ?? "";
      zoneMoves.set(bucket, [...(zoneMoves.get(bucket) ?? []), s.id]);
    }
    latest.set(t.id, s);
  }

  if (geometry.length > 0) await updateSpotGeometryBatch(businessId, planId, { changes: geometry });
  for (const [zone, moved] of zoneMoves) {
    await bulkUpdateSpots(businessId, planId, zone ? { spotIds: moved, zoneId: zone } : { spotIds: moved, unzone: true }, key());
  }

  for (const t of doc.tables) {
    const server = latest.get(t.id);
    if (!server) continue;
    if (t.locked !== server.isLocked) await setSpotLock(businessId, planId, server.id, { isLocked: t.locked });
    if (t.joinable !== server.combining.isCombinable) {
      await setSpotCombining(businessId, planId, server.id, { isCombinable: t.joinable, expectedVersion: null });
    }
    if (t.blocked !== (server.availability.mode !== "Active")) {
      await setSpotAvailability(businessId, planId, server.id, {
        availability: { ...server.availability, mode: t.blocked ? "Blocked" : "Active", reasonCode: t.blocked ? "out-of-service" : null },
        expectedVersion: null,
      });
    }
  }
}

export function publishDraft(businessId: string, doc: FloorPlanDoc): Promise<void> {
  return queued(businessId, () => publishNow(businessId, doc));
}

async function publishNow(businessId: string, doc: FloorPlanDoc): Promise<void> {
  const plan = await pushNow(businessId, doc, "scratch");
  const report = await getFloorPlanValidationReport(businessId, plan.id);
  if (!report.canPublish) {
    const first = report.findings.find((f) => f.severity === "Error");
    throw new Error(first?.message ?? "The floor plan has blocking issues.");
  }
  await publishFloorPlan(businessId, plan.id, { mode: "Live", reviewToken: report.reviewToken }, key());
}

// ---- builder progress -------------------------------------------------------

const STEP_TO_API: Record<QuickStep, FloorPlanBuilderStep> = { 1: "Layout", 2: "Configure", 3: "Review" };
const STEP_FROM_API: Record<FloorPlanBuilderStep, QuickStep> = { Layout: 1, Configure: 2, Review: 3 };

/** Records where the merchant is in the builder, so another device resumes there. */
export async function saveBuilderStep(businessId: string, step: QuickStep): Promise<boolean> {
  const planId = await floorPlanIdOf(businessId);
  if (!planId) return false;
  await saveFloorPlanBuilderProgress(businessId, planId, { builderStep: STEP_TO_API[step] });
  return true;
}

// ---- quick grid -------------------------------------------------------------

export interface GridOptions {
  count: number;
  columns: number;
  spacingMeters: number;
  prefix: string;
  startNumber: number;
  shape: TableShape;
  seats: number;
}

export interface GridPlacement {
  code: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridPreview {
  spots: GridPlacement[];
  skipped: number[];
  /** Canvas the grid needs, in grid units, when it is bigger than today's. */
  grownTo: { width: number; height: number } | null;
}

function gridRequest(o: GridOptions): SpotGridRequest {
  return {
    count: o.count,
    numbering: { prefix: o.prefix.trim() || null, startNumber: o.startNumber, step: 1, direction: "LeftToRightTopToBottom" },
    grid: { columns: o.columns, spacingMeters: o.spacingMeters },
    defaults: {
      kindCode: "standard",
      shapeCode: shapeCode(o.shape),
      sizeCode: "medium",
      capacity: o.seats,
      attributeCodes: ["size-medium", "non-smoking", "indoor"],
      acceptance: { acceptsAdvance: true, acceptsWalkIn: true, walkInOnly: false, largePartyOnly: false, customerVisible: true },
    },
  };
}

/** Where the server would put a grid of tables. The preview itself writes
 *  nothing; the doc is saved first so it is made against what is on screen. */
export function previewGrid(businessId: string, doc: FloorPlanDoc, options: GridOptions): Promise<GridPreview> {
  return queued(businessId, async () => {
    const plan = await pushNow(businessId, doc, "scratch");
    const res = await previewSpotGrid(businessId, plan.id, gridRequest(options));
    return {
      spots: res.spots.map((p) => ({ code: p.code, x: units(p.geometry.x), y: units(p.geometry.y), w: units(p.geometry.width), h: units(p.geometry.height) })),
      skipped: res.skippedNumbers,
      grownTo: res.canvasGrown ? { width: Math.ceil(units(res.requiredCanvas.width)), height: Math.ceil(units(res.requiredCanvas.height)) } : null,
    };
  });
}

/** Creates the grid on the server and hands back the new tables for the doc. */
export function generateGrid(
  businessId: string,
  doc: FloorPlanDoc,
  options: GridOptions
): Promise<{ tables: FloorTable[]; grownTo: { width: number; height: number } | null }> {
  return queued(businessId, async () => {
    const plan = await pushNow(businessId, doc, "scratch");
    const res = await generateSpotGrid(businessId, plan.id, gridRequest(options), key());
    const created = new Set(res.createdSpotIds);
    const fresh = freshSpots.get(businessId);
    for (const id of created) fresh.set(id, true);
    const spots = (await allSpots(businessId, plan.id)).filter((s) => created.has(s.id));
    return {
      tables: spots.map(draftTable),
      grownTo: res.canvasGrown ? { width: Math.ceil(units(res.requiredCanvas.width)), height: Math.ceil(units(res.requiredCanvas.height)) } : null,
    };
  });
}

// ---- reading it back --------------------------------------------------------

/** Whether the working spots still match the published snapshot — the API's
 *  badge doesn't report unpublished changes, so this is how a draft on top of
 *  a live plan (a restored version, a rollback) is found. */
function sameLayout(spots: readonly SpotResponse[], published: readonly PublishedSpotDto[]): boolean {
  const f = (n: number) => n.toFixed(2);
  const sig = (s: SpotResponse | PublishedSpotDto) => {
    const attrs = ("attributeCodes" in s ? s.attributeCodes : s.attributes).map((a) => a.toLowerCase()).sort().join(",");
    const g = s.geometry;
    const a = s.acceptance;
    return [s.code, s.shapeCode, s.capacity, f(g.x), f(g.y), f(g.width), f(g.height), f(g.rotationDegrees), s.zoneId ?? "", attrs, a.acceptsAdvance, a.acceptsWalkIn, a.largePartyOnly, a.customerVisible, s.availability.mode].join("|");
  };
  if (spots.length !== published.length) return false;
  const left = spots.map(sig).sort();
  const right = published.map(sig).sort();
  return left.every((v, i) => v === right[i]);
}

/** Server truth for the active plan, layered under what only lives locally. */
export async function pullRecord(businessId: string, local: FloorPlanRecord): Promise<FloorPlanRecord | null> {
  const plan = await currentPlan(businessId);
  if (!plan) return null;
  // The background image still has nowhere on the API to live, so it stays
  // local; objects come from the scene — one shared canvas for both the draft
  // and the published snapshot, since the API keeps one scene per plan.
  const objects = await pullObjects(businessId, plan.id);
  // Zones that fail to load leave the local rectangles as they are: reading
  // them as "none" would make the next push delete every zone.
  const [spots, zones] = await Promise.all([allSpots(businessId, plan.id), listZones(businessId, plan.id).catch(() => null)]);

  let published: FloorPlanRecord["published"] = null;
  let snapSpots: PublishedSpotDto[] = [];
  if (plan.isPublished) {
    const snap = await getPublishedFloorPlan(businessId, plan.id);
    snapSpots = snap.spots;
    const tables = snap.spots.map((s) => tableFromSpot(s, {}));
    const zoneOf = new Map(snap.spots.map((s) => [s.id, s.zoneId]));
    published = {
      doc: {
        ...emptyDoc(snap.name),
        width: units(snap.canvas.width),
        height: units(snap.canvas.height),
        tables,
        objects,
        zones: zonesFrom(snap.zones, tables, zoneOf, local.published?.doc.zones),
        background: local.published?.doc.background ?? null,
      },
      publishedAt: Date.parse(snap.publishedAtUtc) || Date.now(),
      publishedBy: local.published?.publishedBy ?? "",
    };
  }

  let draft: FloorPlanRecord["draft"] = null;
  if (!plan.isPublished || !sameLayout(spots, snapSpots)) {
    const tables = spots.map(draftTable);
    const zoneOf = new Map(spots.map((s) => [s.id, s.zoneId]));
    draft = {
      doc: {
        ...emptyDoc(plan.name),
        width: units(plan.canvas.width),
        height: units(plan.canvas.height),
        tables,
        objects,
        zones: zones ? zonesFrom(zones, tables, zoneOf, local.draft?.doc.zones ?? local.published?.doc.zones) : (local.draft?.doc.zones ?? []),
        background: local.draft?.doc.background ?? null,
      },
      method: local.draft?.method ?? (plan.creationMethod === "QuickGrid" ? "quick" : "scratch"),
      step: local.draft?.step ?? STEP_FROM_API[plan.builderStep] ?? 1,
      savedAt: Date.now(),
      savedBy: local.draft?.savedBy ?? "",
      fromPublished: plan.isPublished,
    };
  }
  return { draft, published };
}

export { ApiError };

// ---- live board -------------------------------------------------------------

const LIVE_FROM_API: Record<string, LiveStatus> = {
  Available: "available",
  Reserved: "reserved",
  Occupied: "occupied",
  Cleaning: "cleaning",
  Blocked: "blocked",
  OutOfService: "blocked",
};
const LIVE_TO_API: Record<Exclude<LiveStatus, "available">, string> = {
  reserved: "Reserved",
  occupied: "Occupied",
  cleaning: "Cleaning",
  blocked: "Blocked",
};

function liveStateOf(spot: LiveSpotResponse, now: number): LiveTableState {
  const status = LIVE_FROM_API[spot.status] ?? "available";
  const since =
    status === "reserved" && spot.expiresAtUtc ? Date.parse(spot.expiresAtUtc) : now - spot.elapsedMinutes * 60_000;
  return {
    status,
    guests: spot.context?.partySize ?? 0,
    guestName: "",
    orderId: spot.context?.externalReferences?.find((r) => r.kind.toLowerCase() === "order")?.id ?? "",
    server: "",
    note: spot.reasonCode ?? "",
    since,
  };
}

/** The published plan's live board, keyed by spot id (= the table's id). Null
 *  when the business has no published plan yet. */
export async function fetchLiveStates(businessId: string): Promise<Map<string, LiveTableState> | null> {
  const plan = await currentPlan(businessId);
  if (!plan?.isPublished) return null;
  const board = await getLiveBoard(businessId, plan.id);
  const now = Date.parse(board.asOfUtc) || Date.now();
  return new Map(board.spots.map((s) => [s.spotId, liveStateOf(s, now)]));
}

export async function writeLiveState(businessId: string, spotId: string, state: LiveTableState): Promise<void> {
  const plan = await currentPlan(businessId);
  if (!plan) return;
  if (state.status === "available") {
    await clearSpotStatus(businessId, plan.id, spotId);
    return;
  }
  await setSpotStatus(businessId, plan.id, spotId, {
    status: LIVE_TO_API[state.status] as never,
    context: state.guests > 0 ? { partySize: state.guests } : null,
  });
}

export async function clearLiveState(businessId: string, spotId: string): Promise<void> {
  const plan = await currentPlan(businessId);
  if (plan) await clearSpotStatus(businessId, plan.id, spotId);
}

/** The business's active floor plan id — what other modules call the "container" a table lives in. */
export async function floorPlanIdOf(businessId: string): Promise<string | null> {
  return (await currentPlan(businessId))?.id ?? null;
}
