import { describe, expect, it } from "vitest";
import {
  CHAIR_DEPTH,
  addQuickTables,
  allocateTableNumbers,
  chairPlacements,
  createObject,
  createTable,
  createZone,
  deleteItems,
  docStats,
  duplicateItems,
  emptyDoc,
  hasBlockingIssues,
  moveItems,
  resizeItem,
  rotateItems,
  tableBody,
  tableRect,
  toggleLock,
  validateDoc,
  zoneForTable,
  DEFAULT_TABLE,
  type FloorPlanDoc,
  type QuickLayoutOptions,
} from "./model";

const quick = (overrides: Partial<QuickLayoutOptions> = {}): QuickLayoutOptions => ({
  ...DEFAULT_TABLE,
  count: 10,
  prefix: "T",
  start: 1,
  direction: "ltr-ttb",
  ...overrides,
});

function docWith(partial: Partial<FloorPlanDoc>): FloorPlanDoc {
  return { ...emptyDoc(), ...partial };
}

describe("tableRect", () => {
  it("wraps the body in a ring of chairs", () => {
    const body = tableBody("square", "medium");
    const rect = tableRect({ shape: "square", size: "medium", rotation: 0, x: 2, y: 3 });
    expect(rect).toEqual({ x: 2, y: 3, w: body.w + CHAIR_DEPTH * 2, h: body.h + CHAIR_DEPTH * 2 });
  });

  it("swaps width and height on a quarter turn", () => {
    const flat = tableRect({ shape: "long", size: "medium", rotation: 0, x: 0, y: 0 });
    const turned = tableRect({ shape: "long", size: "medium", rotation: 90, x: 0, y: 0 });
    expect(turned.w).toBe(flat.h);
    expect(turned.h).toBe(flat.w);
  });
});

describe("chairPlacements", () => {
  it("always draws exactly as many chairs as seats", () => {
    for (const shape of ["square", "round", "rectangle", "long"] as const) {
      for (const seats of [1, 2, 4, 5, 8, 12]) {
        expect(chairPlacements(shape, seats)).toHaveLength(seats);
      }
    }
  });

  it("puts one chair on each side of a four-seat square", () => {
    const sides = chairPlacements("square", 4).map((p) => (p.layout === "side" ? p.side : "radial"));
    expect(sides.sort()).toEqual(["bottom", "left", "right", "top"]);
  });

  it("never seats anyone at the ends of a long table", () => {
    const sides = chairPlacements("long", 10).map((p) => (p.layout === "side" ? p.side : "radial"));
    expect(sides.every((side) => side === "top" || side === "bottom")).toBe(true);
  });
});

describe("allocateTableNumbers", () => {
  it("skips numbers the plan already uses, case-insensitively", () => {
    expect(allocateTableNumbers(["T1", "t3"], "T", 1, 3)).toEqual(["T2", "T4", "T5"]);
  });

  it("honours the start number and an empty prefix", () => {
    expect(allocateTableNumbers([], "", 20, 2)).toEqual(["20", "21"]);
  });
});

describe("addQuickTables", () => {
  it("adds the requested count with sequential numbers", () => {
    const { doc, addedIds } = addQuickTables(emptyDoc(), quick({ count: 15 }));
    expect(addedIds).toHaveLength(15);
    expect(doc.tables.map((t) => t.number)).toEqual(Array.from({ length: 15 }, (_, i) => `T${i + 1}`));
  });

  it("applies the table settings to every new table", () => {
    const { doc } = addQuickTables(emptyDoc(), quick({ count: 3, seats: 6, area: "vip", blocked: true, walkIn: false }));
    expect(doc.tables.every((t) => t.seats === 6 && t.area === "vip" && t.blocked && !t.walkIn)).toBe(true);
  });

  it("numbers left-to-right across the first row", () => {
    const { doc } = addQuickTables(emptyDoc(), quick({ count: 4 }));
    const xs = doc.tables.map((t) => t.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    expect(new Set(doc.tables.map((t) => t.y)).size).toBe(1);
  });

  it("numbers right-to-left when asked", () => {
    const { doc } = addQuickTables(emptyDoc(), quick({ count: 4, direction: "rtl-ttb" }));
    const xs = doc.tables.map((t) => t.x);
    expect([...xs].sort((a, b) => b - a)).toEqual(xs);
  });

  it("numbers down each column when asked", () => {
    const { doc } = addQuickTables(emptyDoc(), quick({ count: 50, direction: "ttb-ltr" }));
    expect(doc.tables[0].x).toBe(doc.tables[1].x);
    expect(doc.tables[1].y).toBeGreaterThan(doc.tables[0].y);
  });

  it("never overlaps and grows the canvas to fit a big batch", () => {
    const { doc } = addQuickTables(emptyDoc(), quick({ count: 50 }));
    const issues = validateDoc(doc);
    expect(issues.overlaps).toEqual([]);
    expect(issues.outOfBounds).toEqual([]);
    expect(doc.height).toBeGreaterThan(38);
  });

  it("places a second batch below the first without reusing numbers", () => {
    const first = addQuickTables(emptyDoc(), quick({ count: 8 })).doc;
    const second = addQuickTables(first, quick({ count: 8 })).doc;
    const issues = validateDoc(second);
    expect(issues.duplicateNumbers).toEqual([]);
    expect(issues.overlaps).toEqual([]);
    expect(second.tables).toHaveLength(16);
  });
});

describe("item operations", () => {
  const table = createTable("T1", 5, 5);
  const locked = { ...createTable("T2", 20, 5), locked: true };

  it("moves unlocked items and leaves locked ones in place", () => {
    const doc = moveItems(docWith({ tables: [table, locked] }), [table.id, locked.id], 2, 1);
    expect(doc.tables[0]).toMatchObject({ x: 7, y: 6 });
    expect(doc.tables[1]).toMatchObject({ x: 20, y: 5 });
  });

  it("keeps a moved item on the canvas", () => {
    const doc = moveItems(docWith({ tables: [table] }), [table.id], -100, 999);
    const rect = tableRect(doc.tables[0]);
    expect(rect.x).toBe(0);
    expect(rect.y + rect.h).toBeCloseTo(doc.height);
  });

  it("does not delete locked items", () => {
    const doc = deleteItems(docWith({ tables: [table, locked] }), [table.id, locked.id]);
    expect(doc.tables.map((t) => t.number)).toEqual(["T2"]);
  });

  it("gives duplicated tables fresh numbers", () => {
    const { doc, addedIds } = duplicateItems(docWith({ tables: [table, createTable("T2", 15, 5)] }), [table.id]);
    expect(addedIds).toHaveLength(1);
    expect(doc.tables.map((t) => t.number)).toEqual(["T1", "T2", "T3"]);
  });

  it("locks a mixed selection, then unlocks it", () => {
    const once = toggleLock(docWith({ tables: [table, locked] }), [table.id, locked.id]);
    expect(once.tables.every((t) => t.locked)).toBe(true);
    const twice = toggleLock(once, [table.id, locked.id]);
    expect(twice.tables.every((t) => !t.locked)).toBe(true);
  });

  it("rotates an object about its centre", () => {
    const wall = createObject("wall", 10, 10);
    const doc = rotateItems(docWith({ objects: [wall] }), [wall.id]);
    expect(doc.objects[0]).toMatchObject({ rotation: 90, w: wall.h, h: wall.w });
    expect(doc.objects[0].x + doc.objects[0].w / 2).toBeCloseTo(wall.x + wall.w / 2);
  });

  it("resizes a table to the nearest preset size", () => {
    const large = tableRect({ ...table, size: "large" });
    const doc = resizeItem(docWith({ tables: [table] }), table.id, { x: 5, y: 5, w: large.w + 0.2, h: large.h });
    expect(doc.tables[0].size).toBe("large");
  });
});

describe("validateDoc", () => {
  it("flags an empty plan as blocking", () => {
    expect(hasBlockingIssues(validateDoc(emptyDoc()))).toBe(true);
  });

  it("reports duplicate numbers once each", () => {
    const issues = validateDoc(docWith({ tables: [createTable("T1", 0, 0), createTable("t1", 10, 0), createTable("T2", 20, 0)] }));
    expect(issues.duplicateNumbers).toEqual(["T1"]);
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("reports overlapping tables without blocking a publish", () => {
    const a = createTable("T1", 5, 5);
    const b = createTable("T2", 6, 6);
    const issues = validateDoc(docWith({ tables: [a, b] }));
    expect(issues.overlaps).toEqual([[a.id, b.id]]);
    expect(hasBlockingIssues(issues)).toBe(false);
  });

  it("notices when nothing can be booked", () => {
    const issues = validateDoc(docWith({ tables: [{ ...createTable("T1", 0, 0), blocked: true }] }));
    expect(issues.noReservable).toBe(true);
  });
});

describe("docStats", () => {
  it("counts seats, blocked tables, categories and wall length", () => {
    const doc = docWith({
      tables: [createTable("T1", 0, 0, { seats: 4 }), createTable("T2", 10, 0, { seats: 6, blocked: true, area: "vip" })],
      objects: [createObject("wall", 0, 20, { w: 8, h: 0.3 }), createObject("room", 20, 20, { w: 4, h: 2 })],
      zones: [createZone("Terrace", "green", { x: 0, y: 0, w: 10, h: 10 })],
    });
    const stats = docStats(doc);
    expect(stats).toMatchObject({ tables: 2, seats: 10, blocked: 1, zones: 1, objects: 4 });
    // indoor, vip, nonSmoking, blocked
    expect(stats.categories).toBe(4);
    expect(stats.wallsMeters).toBeCloseTo((8 + 12) * 0.375);
  });
});

describe("zoneForTable", () => {
  it("finds the zone holding the table's centre", () => {
    const zone = createZone("Terrace", "green", { x: 0, y: 0, w: 12, h: 12 });
    const inside = createTable("T1", 2, 2);
    const outside = createTable("T2", 20, 20);
    const doc = docWith({ zones: [zone], tables: [inside, outside] });
    expect(zoneForTable(doc, inside)?.name).toBe("Terrace");
    expect(zoneForTable(doc, outside)).toBeUndefined();
  });
});
