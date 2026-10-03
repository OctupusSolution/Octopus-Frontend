import { describe, expect, it } from "vitest";
import { itemRect, rectsOverlap, TABLE_SHAPES, validateDoc, zoneForTable } from "./model";
import { sampleLayout } from "./sample-layout";

describe("sampleLayout", () => {
  const doc = sampleLayout();
  const issues = validateDoc(doc);

  it("is a plan a merchant could publish as-is", () => {
    expect(issues.duplicateNumbers).toEqual([]);
    expect(issues.overlaps).toEqual([]);
    expect(issues.outOfBounds).toEqual([]);
    expect(issues.noReservable).toBe(false);
  });

  it("puts every table inside one of its zones", () => {
    expect(doc.tables.filter((t) => !zoneForTable(doc, t)).map((t) => t.number)).toEqual([]);
  });

  it("builds fresh ids each time so two copies never collide", () => {
    const other = sampleLayout();
    expect(other.tables[0].id).not.toBe(doc.tables[0].id);
  });

  it("keeps every table clear of walls and furniture", () => {
    const clashes = doc.tables.flatMap((t) =>
      doc.objects.filter((o) => rectsOverlap(itemRect(t), itemRect(o))).map((o) => `${t.number}/${o.type}`)
    );
    expect(clashes).toEqual([]);
  });

  it("shows every table shape", () => {
    expect(new Set(doc.tables.map((t) => t.shape))).toEqual(new Set(TABLE_SHAPES));
  });

  it("fills the whole canvas with its zones", () => {
    const area = doc.zones.reduce((sum, z) => sum + z.w * z.h, 0);
    expect(area).toBe(doc.width * doc.height);
  });
});
