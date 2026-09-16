import { describe, expect, it } from "vitest";
import { validateDoc, zoneForTable } from "./model";
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
});
