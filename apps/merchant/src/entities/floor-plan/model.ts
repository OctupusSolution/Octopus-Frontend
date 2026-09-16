// The floor plan document and every pure operation on it.
//
// Coordinates are grid units, not pixels: the canvas draws one unit as a grid
// square and the rulers count them. A unit is 37.5cm, which is what makes the
// designed 48 x 38 canvas read as the "18.00m x 14.25m" room the stats bar
// reports. Every position is the top-left corner of the item's bounding box,
// tables included — a table's box is its body plus the ring of chairs around
// it, so two tables whose boxes do not overlap never have chairs colliding.
//
// Nothing here touches React or storage. The builder, the preview and the live
// view all read and write the same `FloorPlanDoc` through these functions.

export const DEFAULT_CANVAS_WIDTH = 54;
export const DEFAULT_CANVAS_HEIGHT = 48;
export const METERS_PER_UNIT = 0.375;
export const CHAIR_DEPTH = 0.9;
export const MAX_SEATS = 20;
export const MAX_QUICK_TABLES = 200;

export type TableShape = "round" | "square" | "rectangle" | "long" | "tabliya" | "majlisL" | "tent";
export type TableSize = "small" | "medium" | "large";
export type TableArea = "indoor" | "outdoor" | "vip" | "regular";
export type SmokingPolicy = "smoking" | "nonSmoking";
export type Rotation = 0 | 90 | 180 | 270;

export const TABLE_SHAPES: readonly TableShape[] = ["square", "round", "rectangle", "long", "tabliya", "majlisL", "tent"];

/** Saudi floor seating: guests sit on cushions, so these are drawn with
 *  cushions instead of chairs — but they still book and seat like any table. */
export const FLOOR_SEATING_SHAPES: ReadonlySet<TableShape> = new Set(["tabliya", "majlisL", "tent"]);
export const TABLE_SIZES: readonly TableSize[] = ["small", "medium", "large"];
export const TABLE_AREAS: readonly TableArea[] = ["indoor", "outdoor", "vip", "regular"];

export interface FloorTable {
  id: string;
  kind: "table";
  number: string;
  shape: TableShape;
  size: TableSize;
  seats: number;
  x: number;
  y: number;
  rotation: Rotation;
  area: TableArea;
  smoking: SmokingPolicy;
  note: string;
  reservable: boolean;
  walkIn: boolean;
  largePartyOnly: boolean;
  blocked: boolean;
  joinable: boolean;
  /** "Show on Floor Plan": a hidden table still exists for POS and
   *  reservations but is left off the live floor. */
  visible: boolean;
  locked: boolean;
}

export type ObjectType =
  | "chair" | "armchair" | "sofa" | "majlisFloor"
  | "wall" | "halfWall" | "door" | "doubleDoor"
  | "plantSmall" | "plantLarge" | "planterBox" | "tree"
  | "bar" | "counter" | "hostStand" | "station"
  | "text" | "room";

export interface FloorObject {
  id: string;
  kind: "object";
  type: ObjectType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: Rotation;
  label: string;
  locked: boolean;
}

export type ZoneColor = "blue" | "violet" | "amber" | "green" | "slate";
export const ZONE_COLORS: readonly ZoneColor[] = ["blue", "violet", "amber", "green", "slate"];

export interface FloorZone {
  id: string;
  kind: "zone";
  name: string;
  color: ZoneColor;
  x: number;
  y: number;
  w: number;
  h: number;
  locked: boolean;
}

export interface FloorBackground {
  dataUrl: string;
  mime: string;
  fileName: string;
  opacity: number;
}

export interface FloorPlanDoc {
  name: string;
  width: number;
  height: number;
  zones: FloorZone[];
  tables: FloorTable[];
  objects: FloorObject[];
  background: FloorBackground | null;
}

export type FloorItem = FloorTable | FloorObject | FloorZone;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function emptyDoc(name = "Main Floor"): FloorPlanDoc {
  return {
    name,
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
    zones: [],
    tables: [],
    objects: [],
    background: null,
  };
}

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------------------------------------------- geometry */

const BODY_BASE: Record<TableSize, number> = { small: 2.6, medium: 3.4, large: 4.4 };

/** The table top itself, unrotated, without chairs. */
export function tableBody(shape: TableShape, size: TableSize): { w: number; h: number } {
  const base = BODY_BASE[size];
  switch (shape) {
    case "rectangle":
      return { w: round2(base * 1.6), h: base };
    case "long":
      return { w: round2(base * 2.6), h: round2(base * 0.9) };
    case "tabliya":
      return { w: round2(base * 0.95), h: round2(base * 0.95) };
    case "tent":
      return { w: round2(base * 1.5), h: round2(base * 1.5) };
    case "majlisL":
      return { w: round2(base * 2.1), h: round2(base * 2.1) };
    default:
      return { w: base, h: base };
  }
}

export function isQuarterTurned(rotation: Rotation): boolean {
  return rotation === 90 || rotation === 270;
}

export function tableRect(table: Pick<FloorTable, "shape" | "size" | "rotation" | "x" | "y">): Rect {
  const body = tableBody(table.shape, table.size);
  const w = body.w + CHAIR_DEPTH * 2;
  const h = body.h + CHAIR_DEPTH * 2;
  return isQuarterTurned(table.rotation)
    ? { x: table.x, y: table.y, w: h, h: w }
    : { x: table.x, y: table.y, w, h };
}

export function itemRect(item: FloorItem): Rect {
  if (item.kind === "table") return tableRect(item);
  return { x: item.x, y: item.y, w: item.w, h: item.h };
}

export function rectsOverlap(a: Rect, b: Rect, tolerance = 0.05): boolean {
  return a.x + a.w - tolerance > b.x && b.x + b.w - tolerance > a.x && a.y + a.h - tolerance > b.y && b.y + b.h - tolerance > a.y;
}

export function rectContains(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

export function boundsOf(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function snap(value: number, step: number): number {
  if (step <= 0) return round2(value);
  return round2(Math.round(value / step) * step);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type ChairSide = "top" | "bottom" | "left" | "right";

export type ChairPlacement =
  | { layout: "side"; side: ChairSide; index: number; count: number }
  | { layout: "radial"; angle: number };

/** Where each seat's chair goes, in the table's unrotated frame. Seats are
 *  dealt out round-robin over the sides a shape actually seats people on, so
 *  the count on the canvas is always the table's real capacity. */
export function chairPlacements(shape: TableShape, seats: number): ChairPlacement[] {
  const count = clamp(Math.round(seats), 0, MAX_SEATS);
  if (shape === "round" || shape === "tabliya") {
    return Array.from({ length: count }, (_, i) => ({ layout: "radial" as const, angle: (360 / count) * i - 90 }));
  }
  const order: ChairSide[] =
    shape === "long"
      ? ["top", "bottom"]
      : shape === "majlisL"
        ? // The two arms of the L are the seating; nobody sits on the open side.
          ["top", "left"]
        : shape === "rectangle"
          ? ["top", "bottom", "top", "bottom", "left", "right"]
          : ["top", "bottom", "left", "right"];
  const perSide: Record<ChairSide, number> = { top: 0, bottom: 0, left: 0, right: 0 };
  for (let i = 0; i < count; i += 1) perSide[order[i % order.length]] += 1;
  const placements: ChairPlacement[] = [];
  for (const side of ["top", "right", "bottom", "left"] as const) {
    for (let index = 0; index < perSide[side]; index += 1) {
      placements.push({ layout: "side", side, index, count: perSide[side] });
    }
  }
  return placements;
}

export function defaultSeats(shape: TableShape, size: TableSize): number {
  const bySize: Record<TableSize, number> = { small: 2, medium: 4, large: 6 };
  if (shape === "long" || shape === "majlisL") return bySize[size] + 4;
  if (shape === "rectangle" || shape === "tabliya" || shape === "tent") return bySize[size] + 2;
  return bySize[size];
}

/* ------------------------------------------------------------ numbering */

export function formatTableNumber(prefix: string, n: number): string {
  return `${prefix.trim()}${n}`;
}

/** `count` table numbers starting at `start`, skipping any already used so
 *  adding ten tables to a plan that has T1..T8 never produces a second T3. */
export function allocateTableNumbers(used: Iterable<string>, prefix: string, start: number, count: number): string[] {
  const taken = new Set(Array.from(used, (n) => n.trim().toLowerCase()));
  const result: string[] = [];
  let n = Math.max(0, Math.floor(start));
  while (result.length < count) {
    const candidate = formatTableNumber(prefix, n);
    if (!taken.has(candidate.toLowerCase())) {
      result.push(candidate);
      taken.add(candidate.toLowerCase());
    }
    n += 1;
  }
  return result;
}

export function nextTableNumber(doc: FloorPlanDoc, prefix = "T"): string {
  return allocateTableNumbers(doc.tables.map((t) => t.number), prefix, 1, 1)[0];
}

/* --------------------------------------------------------------- tables */

export type NumberingDirection = "ltr-ttb" | "ttb-ltr" | "rtl-ttb";

export interface TableDefaults {
  shape: TableShape;
  size: TableSize;
  seats: number;
  area: TableArea;
  smoking: SmokingPolicy;
  reservable: boolean;
  walkIn: boolean;
  largePartyOnly: boolean;
  blocked: boolean;
  joinable: boolean;
  visible: boolean;
}

export const DEFAULT_TABLE: TableDefaults = {
  shape: "square",
  size: "medium",
  seats: 4,
  area: "indoor",
  smoking: "nonSmoking",
  reservable: true,
  walkIn: true,
  largePartyOnly: false,
  blocked: false,
  joinable: false,
  visible: true,
};

export function createTable(number: string, x: number, y: number, defaults: Partial<TableDefaults> = {}): FloorTable {
  const merged = { ...DEFAULT_TABLE, ...defaults };
  return {
    id: newId("tbl"),
    kind: "table",
    number,
    x,
    y,
    rotation: 0,
    note: "",
    locked: false,
    ...merged,
    seats: clamp(Math.round(merged.seats), 1, MAX_SEATS),
  };
}

export interface QuickLayoutOptions extends TableDefaults {
  count: number;
  prefix: string;
  start: number;
  direction: NumberingDirection;
}

// Quick Box tables sit shoulder to shoulder like the frame's grid of boxes.
const QUICK_GAP = 0.5;
const QUICK_MARGIN = 1;

/** Lays `count` new tables out in a grid below whatever the plan already
 *  holds, numbered in the chosen reading order, and grows the canvas when the
 *  grid does not fit. Returns the new doc and the ids it added. */
export function addQuickTables(doc: FloorPlanDoc, options: QuickLayoutOptions): { doc: FloorPlanDoc; addedIds: string[] } {
  const count = clamp(Math.floor(options.count), 0, MAX_QUICK_TABLES);
  if (count === 0) return { doc, addedIds: [] };

  const footprint = tableRect({ shape: options.shape, size: options.size, rotation: 0, x: 0, y: 0 });
  const cellW = footprint.w + QUICK_GAP;
  const cellH = footprint.h + QUICK_GAP;
  const usableWidth = Math.max(doc.width, DEFAULT_CANVAS_WIDTH) - QUICK_MARGIN * 2;
  const columns = Math.max(1, Math.floor((usableWidth + QUICK_GAP) / cellW));
  const rows = Math.ceil(count / columns);

  // Stack under the existing tables only: Quick Box shows nothing but the
  // grid of boxes, so walls, bars and plants must not push it out of view.
  const existing = boundsOf(doc.tables.map(itemRect));
  const top = existing ? snap(existing.y + existing.h + QUICK_GAP, 0.5) : QUICK_MARGIN;

  const numbers = allocateTableNumbers(doc.tables.map((t) => t.number), options.prefix, options.start, count);

  // Grid slots in the order a person would count them, so T1..Tn read the
  // way the numbering direction promises.
  const slots: { col: number; row: number }[] = [];
  if (options.direction === "ttb-ltr") {
    for (let col = 0; col < columns; col += 1) {
      for (let row = 0; row < rows; row += 1) slots.push({ col, row });
    }
  } else {
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        slots.push({ col: options.direction === "rtl-ttb" ? columns - 1 - col : col, row });
      }
    }
  }

  const { count: _count, prefix: _prefix, start: _start, direction: _direction, ...defaults } = options;
  const tables = slots
    .slice(0, count)
    .map((slot, i) => createTable(numbers[i], QUICK_MARGIN + slot.col * cellW, top + slot.row * cellH, defaults));

  const neededHeight = Math.ceil(top + rows * cellH - QUICK_GAP + QUICK_MARGIN);
  const neededWidth = Math.ceil(QUICK_MARGIN * 2 + columns * cellW - QUICK_GAP);
  return {
    doc: {
      ...doc,
      width: Math.max(doc.width, neededWidth),
      height: Math.max(doc.height, neededHeight),
      tables: [...doc.tables, ...tables],
    },
    addedIds: tables.map((t) => t.id),
  };
}

/* ---------------------------------------------------------------- items */

export function allItems(doc: FloorPlanDoc): FloorItem[] {
  return [...doc.zones, ...doc.objects, ...doc.tables];
}

export function findItem(doc: FloorPlanDoc, id: string): FloorItem | undefined {
  return doc.tables.find((t) => t.id === id) ?? doc.objects.find((o) => o.id === id) ?? doc.zones.find((z) => z.id === id);
}

function mapItems(doc: FloorPlanDoc, ids: ReadonlySet<string>, fn: (item: FloorItem) => FloorItem): FloorPlanDoc {
  return {
    ...doc,
    zones: doc.zones.map((z) => (ids.has(z.id) ? (fn(z) as FloorZone) : z)),
    objects: doc.objects.map((o) => (ids.has(o.id) ? (fn(o) as FloorObject) : o)),
    tables: doc.tables.map((t) => (ids.has(t.id) ? (fn(t) as FloorTable) : t)),
  };
}

/** Moves the unlocked items among `ids`, keeping each one fully on canvas. */
export function moveItems(doc: FloorPlanDoc, ids: readonly string[], dx: number, dy: number): FloorPlanDoc {
  if (dx === 0 && dy === 0) return doc;
  const set = new Set(ids);
  return mapItems(doc, set, (item) => {
    if (item.locked) return item;
    const rect = itemRect(item);
    return {
      ...item,
      x: round2(clamp(item.x + dx, 0, Math.max(0, doc.width - rect.w))),
      y: round2(clamp(item.y + dy, 0, Math.max(0, doc.height - rect.h))),
    };
  });
}

export function updateTable(doc: FloorPlanDoc, id: string, patch: Partial<Omit<FloorTable, "id" | "kind">>): FloorPlanDoc {
  return {
    ...doc,
    tables: doc.tables.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...patch };
      if (patch.seats !== undefined) next.seats = clamp(Math.round(patch.seats), 1, MAX_SEATS);
      return keepOnCanvas(doc, next);
    }),
  };
}

export function updateObject(doc: FloorPlanDoc, id: string, patch: Partial<Omit<FloorObject, "id" | "kind">>): FloorPlanDoc {
  return { ...doc, objects: doc.objects.map((o) => (o.id === id ? keepOnCanvas(doc, { ...o, ...patch }) : o)) };
}

export function updateZone(doc: FloorPlanDoc, id: string, patch: Partial<Omit<FloorZone, "id" | "kind">>): FloorPlanDoc {
  return { ...doc, zones: doc.zones.map((z) => (z.id === id ? keepOnCanvas(doc, { ...z, ...patch }) : z)) };
}

function keepOnCanvas<T extends FloorItem>(doc: FloorPlanDoc, item: T): T {
  const rect = itemRect(item);
  return {
    ...item,
    x: round2(clamp(item.x, 0, Math.max(0, doc.width - rect.w))),
    y: round2(clamp(item.y, 0, Math.max(0, doc.height - rect.h))),
  };
}

export const MIN_ITEM_SIZE = 0.25;

/** Resizes a zone or object to `rect`, clamped to the canvas. Tables have
 *  preset sizes, so a table resize picks the preset nearest the dragged box. */
export function resizeItem(doc: FloorPlanDoc, id: string, rect: Rect): FloorPlanDoc {
  const item = findItem(doc, id);
  if (!item || item.locked) return doc;
  const x = clamp(rect.x, 0, doc.width - MIN_ITEM_SIZE);
  const y = clamp(rect.y, 0, doc.height - MIN_ITEM_SIZE);
  const w = clamp(rect.w, MIN_ITEM_SIZE, doc.width - x);
  const h = clamp(rect.h, MIN_ITEM_SIZE, doc.height - y);
  if (item.kind === "table") {
    const target = Math.max(w, h);
    const size = TABLE_SIZES.reduce((best, candidate) => {
      const span = (r: Rect) => Math.max(r.w, r.h);
      const distance = (s: TableSize) => Math.abs(span(tableRect({ ...item, size: s })) - target);
      return distance(candidate) < distance(best) ? candidate : best;
    }, item.size);
    return updateTable(doc, id, { size, x, y });
  }
  const next = { x: round2(x), y: round2(y), w: round2(w), h: round2(h) };
  return item.kind === "zone" ? updateZone(doc, id, next) : updateObject(doc, id, next);
}

export function deleteItems(doc: FloorPlanDoc, ids: readonly string[]): FloorPlanDoc {
  const set = new Set(ids);
  const keep = <T extends FloorItem>(item: T) => !set.has(item.id) || item.locked;
  return { ...doc, zones: doc.zones.filter(keep), objects: doc.objects.filter(keep), tables: doc.tables.filter(keep) };
}

/** Copies the items one unit down-right. Copied tables get the next free
 *  numbers with the same prefix, never a duplicate. */
export function duplicateItems(doc: FloorPlanDoc, ids: readonly string[]): { doc: FloorPlanDoc; addedIds: string[] } {
  const set = new Set(ids);
  const addedIds: string[] = [];
  let working = doc;
  const shift = <T extends FloorItem>(item: T): T => {
    const rect = itemRect(item);
    return {
      ...item,
      x: round2(clamp(item.x + 1, 0, Math.max(0, doc.width - rect.w))),
      y: round2(clamp(item.y + 1, 0, Math.max(0, doc.height - rect.h))),
    };
  };

  const zones = doc.zones.filter((z) => set.has(z.id)).map((z) => shift({ ...z, id: newId("zone"), locked: false }));
  const objects = doc.objects.filter((o) => set.has(o.id)).map((o) => shift({ ...o, id: newId("obj"), locked: false }));
  const tables: FloorTable[] = [];
  for (const table of doc.tables.filter((t) => set.has(t.id))) {
    const prefix = table.number.match(/^\D*/)?.[0] ?? "";
    const [number] = allocateTableNumbers([...working.tables, ...tables].map((t) => t.number), prefix, 1, 1);
    tables.push(shift({ ...table, id: newId("tbl"), number, locked: false }));
  }
  working = {
    ...doc,
    zones: [...doc.zones, ...zones],
    objects: [...doc.objects, ...objects],
    tables: [...doc.tables, ...tables],
  };
  addedIds.push(...zones.map((z) => z.id), ...objects.map((o) => o.id), ...tables.map((t) => t.id));
  return { doc: working, addedIds };
}

/** Locks every item if any of them is unlocked; otherwise unlocks them all —
 *  the one toggle behaves predictably on a mixed selection. */
export function toggleLock(doc: FloorPlanDoc, ids: readonly string[]): FloorPlanDoc {
  const set = new Set(ids);
  const items = allItems(doc).filter((i) => set.has(i.id));
  const lock = items.some((i) => !i.locked);
  return mapItems(doc, set, (item) => ({ ...item, locked: lock }));
}

export function rotateItems(doc: FloorPlanDoc, ids: readonly string[]): FloorPlanDoc {
  const set = new Set(ids);
  return mapItems(doc, set, (item) => {
    if (item.locked || item.kind === "zone") return item;
    const rotation = (((item.rotation + 90) % 360) as Rotation);
    if (item.kind === "table") return keepOnCanvas(doc, { ...item, rotation });
    // A rotated object swaps its box, pivoting about its own centre.
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    return keepOnCanvas(doc, { ...item, rotation, w: item.h, h: item.w, x: round2(cx - item.h / 2), y: round2(cy - item.w / 2) });
  });
}

export function addItem(doc: FloorPlanDoc, item: FloorItem): FloorPlanDoc {
  if (item.kind === "table") return { ...doc, tables: [...doc.tables, keepOnCanvas(doc, item)] };
  if (item.kind === "zone") return { ...doc, zones: [...doc.zones, keepOnCanvas(doc, item)] };
  return { ...doc, objects: [...doc.objects, keepOnCanvas(doc, item)] };
}

/** Moves an item to the top or bottom of its own layer's paint order. */
export function reorderItem(doc: FloorPlanDoc, id: string, to: "front" | "back"): FloorPlanDoc {
  const move = <T extends FloorItem>(list: T[]): T[] => {
    const item = list.find((i) => i.id === id);
    if (!item) return list;
    const rest = list.filter((i) => i.id !== id);
    return to === "front" ? [...rest, item] : [item, ...rest];
  };
  return { ...doc, zones: move(doc.zones), objects: move(doc.objects), tables: move(doc.tables) };
}

/* ------------------------------------------------------------- catalogs */

export interface ObjectPreset {
  type: ObjectType;
  w: number;
  h: number;
}

export const OBJECT_PRESETS: Record<ObjectType, ObjectPreset> = {
  chair: { type: "chair", w: 1.4, h: 1.4 },
  armchair: { type: "armchair", w: 1.8, h: 1.8 },
  sofa: { type: "sofa", w: 3.6, h: 1.8 },
  // A run of floor cushions with backrests along a wall — seating furniture,
  // not a bookable table.
  majlisFloor: { type: "majlisFloor", w: 8, h: 1.8 },
  wall: { type: "wall", w: 8, h: 0.3 },
  halfWall: { type: "halfWall", w: 6, h: 0.3 },
  // Opening plus the leaf's swing, so the quarter-circle fits inside the box.
  door: { type: "door", w: 3, h: 2.6 },
  doubleDoor: { type: "doubleDoor", w: 4.4, h: 2.4 },
  plantSmall: { type: "plantSmall", w: 1.4, h: 1.4 },
  plantLarge: { type: "plantLarge", w: 2.2, h: 2.2 },
  planterBox: { type: "planterBox", w: 4.4, h: 1.4 },
  tree: { type: "tree", w: 2.8, h: 2.8 },
  bar: { type: "bar", w: 10, h: 3 },
  counter: { type: "counter", w: 5, h: 2 },
  hostStand: { type: "hostStand", w: 2.4, h: 2.4 },
  station: { type: "station", w: 3, h: 2 },
  text: { type: "text", w: 6, h: 1.6 },
  room: { type: "room", w: 12, h: 10 },
};

export const WALL_TYPES: ReadonlySet<ObjectType> = new Set(["wall", "halfWall"]);

export function createObject(type: ObjectType, x: number, y: number, overrides: Partial<FloorObject> = {}): FloorObject {
  const preset = OBJECT_PRESETS[type];
  return { id: newId("obj"), kind: "object", type, x, y, w: preset.w, h: preset.h, rotation: 0, label: "", locked: false, ...overrides };
}

export function createZone(name: string, color: ZoneColor, rect: Rect): FloorZone {
  return { id: newId("zone"), kind: "zone", name, color, locked: false, ...rect };
}

export function nextZoneColor(doc: FloorPlanDoc): ZoneColor {
  const counts = ZONE_COLORS.map((color) => doc.zones.filter((z) => z.color === color).length);
  return ZONE_COLORS[counts.indexOf(Math.min(...counts))];
}

/* ---------------------------------------------------------------- stats */

export interface DocStats {
  tables: number;
  visibleTables: number;
  seats: number;
  zones: number;
  objects: number;
  blocked: number;
  categories: number;
  wallsMeters: number;
  widthMeters: number;
  heightMeters: number;
}

/** A table's categories as the Quick Box chips name them: its area, its
 *  smoking policy, and the two flags that are categories in their own right. */
export function tableCategories(table: FloorTable): string[] {
  const categories: string[] = [table.area, table.smoking];
  if (table.largePartyOnly) categories.push("largeParty");
  if (table.blocked) categories.push("blocked");
  return categories;
}

export function docStats(doc: FloorPlanDoc): DocStats {
  const categories = new Set(doc.tables.flatMap(tableCategories));
  const wallUnits = doc.objects.reduce((sum, o) => {
    if (WALL_TYPES.has(o.type)) return sum + Math.max(o.w, o.h);
    if (o.type === "room") return sum + (o.w + o.h) * 2;
    return sum;
  }, 0);
  return {
    tables: doc.tables.length,
    visibleTables: doc.tables.filter((t) => t.visible).length,
    seats: doc.tables.reduce((sum, t) => sum + t.seats, 0),
    zones: doc.zones.length,
    objects: doc.tables.length + doc.objects.length,
    blocked: doc.tables.filter((t) => t.blocked).length,
    categories: categories.size,
    wallsMeters: round2(wallUnits * METERS_PER_UNIT),
    widthMeters: round2(doc.width * METERS_PER_UNIT),
    heightMeters: round2(doc.height * METERS_PER_UNIT),
  };
}

/* ----------------------------------------------------------- validation */

export interface DocIssues {
  noTables: boolean;
  noReservable: boolean;
  duplicateNumbers: string[];
  emptyNumbers: string[];
  overlaps: [string, string][];
  outOfBounds: string[];
}

export function validateDoc(doc: FloorPlanDoc): DocIssues {
  const seen = new Map<string, number>();
  for (const table of doc.tables) {
    const key = table.number.trim().toLowerCase();
    if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const duplicateNumbers = doc.tables
    .filter((t, i, list) => (seen.get(t.number.trim().toLowerCase()) ?? 0) > 1 && list.findIndex((o) => o.number.trim().toLowerCase() === t.number.trim().toLowerCase()) === i)
    .map((t) => t.number.trim());

  const overlaps: [string, string][] = [];
  const rects = doc.tables.map((t) => ({ id: t.id, rect: tableRect(t) }));
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      if (rectsOverlap(rects[i].rect, rects[j].rect)) overlaps.push([rects[i].id, rects[j].id]);
    }
  }

  const canvas: Rect = { x: 0, y: 0, w: doc.width, h: doc.height };
  return {
    noTables: doc.tables.length === 0,
    noReservable: doc.tables.length > 0 && !doc.tables.some((t) => t.reservable && !t.blocked),
    duplicateNumbers,
    emptyNumbers: doc.tables.filter((t) => !t.number.trim()).map((t) => t.id),
    overlaps,
    outOfBounds: allItems(doc).filter((item) => !rectContains(canvas, itemRect(item))).map((item) => item.id),
  };
}

/** Issues that make a plan unusable live — nothing else stops a publish. */
export function hasBlockingIssues(issues: DocIssues): boolean {
  return issues.noTables || issues.duplicateNumbers.length > 0 || issues.emptyNumbers.length > 0;
}

/** Which zone a table sits in: the zone containing the table's centre. */
export function zoneForTable(doc: FloorPlanDoc, table: FloorTable): FloorZone | undefined {
  const rect = tableRect(table);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  return [...doc.zones].reverse().find((z) => cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h);
}
