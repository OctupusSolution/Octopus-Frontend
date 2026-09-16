import { describe, expect, it } from "vitest";
import { createObject, createTable, createZone, emptyDoc, type FloorPlanDoc } from "./model";
import {
  EMPTY_RECORD,
  FLOOR_PLAN_STORAGE_VERSION,
  parseLiveOverrides,
  parseRecord,
  serializeRecord,
  type FloorPlanRecord,
} from "./storage";

function sampleDoc(): FloorPlanDoc {
  return {
    ...emptyDoc("Ground Floor"),
    tables: [createTable("T1", 1, 1, { seats: 6, area: "vip" })],
    objects: [createObject("wall", 0, 20)],
    zones: [createZone("Terrace", "green", { x: 0, y: 0, w: 10, h: 10 })],
  };
}

describe("parseRecord", () => {
  it("round-trips a draft and a published plan", () => {
    const record: FloorPlanRecord = {
      draft: { doc: sampleDoc(), method: "quick", step: 2, savedAt: 1, savedBy: "Omar", fromPublished: true },
      published: { doc: sampleDoc(), publishedAt: 2, publishedBy: "Omar" },
    };
    expect(parseRecord(serializeRecord(record))).toEqual(record);
  });

  it("starts empty for nothing, garbage, or another version", () => {
    expect(parseRecord(null)).toEqual(EMPTY_RECORD);
    expect(parseRecord("{nope")).toEqual(EMPTY_RECORD);
    expect(parseRecord(JSON.stringify({ version: FLOOR_PLAN_STORAGE_VERSION + 1, draft: null, published: null }))).toEqual(EMPTY_RECORD);
  });

  it("keeps the published plan when only the draft is corrupt", () => {
    const raw = JSON.stringify({
      version: FLOOR_PLAN_STORAGE_VERSION,
      draft: { doc: { tables: null }, method: "quick", savedAt: 1 },
      published: { doc: sampleDoc(), publishedAt: 2, publishedBy: "Omar" },
    });
    const record = parseRecord(raw);
    expect(record.draft).toBeNull();
    expect(record.published?.doc.tables).toHaveLength(1);
  });

  it("drops a malformed item but keeps the rest of the plan", () => {
    const doc = sampleDoc();
    const raw = JSON.stringify({
      version: FLOOR_PLAN_STORAGE_VERSION,
      draft: null,
      published: { doc: { ...doc, tables: [...doc.tables, { kind: "table", id: "bad", shape: "hexagon" }] }, publishedAt: 2 },
    });
    expect(parseRecord(raw).published?.doc.tables.map((t) => t.number)).toEqual(["T1"]);
  });

  it("fills settings a table saved before they existed", () => {
    const { reservable: _r, walkIn: _w, visible: _v, ...legacy } = createTable("T9", 0, 0);
    const raw = JSON.stringify({
      version: FLOOR_PLAN_STORAGE_VERSION,
      draft: null,
      published: { doc: { ...emptyDoc(), tables: [legacy] }, publishedAt: 1 },
    });
    expect(parseRecord(raw).published?.doc.tables[0]).toMatchObject({ reservable: true, walkIn: true, visible: true });
  });
});

describe("parseLiveOverrides", () => {
  it("keeps valid overrides and skips the rest", () => {
    const raw = JSON.stringify({
      a: { status: "cleaning", since: 5, guests: 2 },
      b: { status: "partying", since: 5 },
      c: "nope",
    });
    expect(parseLiveOverrides(raw)).toEqual({
      a: { status: "cleaning", since: 5, guests: 2, guestName: "", orderId: "", server: "", note: "" },
    });
  });
});
