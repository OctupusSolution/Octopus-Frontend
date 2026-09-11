import { describe, expect, it } from "vitest";
import { summarize } from "./ai-import";
import { DETECTION_STEPS, PROCESSING_MS, detectionProgress, dishArt, mockDetection } from "./ai-import-mock";

const result = mockDetection("menu.pdf");

describe("mockDetection", () => {
  it("gives every item a stable, unique id", () => {
    const ids = result.sections.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("ai-s1-i1");
  });

  it("draws a dish as an SVG data URL", () => {
    expect(dishArt(0, 0)).toMatch(/^data:image\/svg\+xml,/);
    expect(dishArt(0, 1)).not.toBe(dishArt(0, 0));
  });
});

describe("detectionProgress", () => {
  it("starts from nothing", () => {
    const p = detectionProgress(0, result);
    expect(p.percent).toBe(0);
    expect(p.steps).toEqual(["active", "pending", "pending", "pending", "pending", "pending"]);
    expect(p.summary).toMatchObject({ sections: 0, items: 0, high: 0, needReview: 0 });
    expect(p.revealed.size).toBe(0);
    expect(p.done).toBe(false);
  });

  it("ends exactly on the finished summary", () => {
    const p = detectionProgress(PROCESSING_MS, result);
    expect(p.percent).toBe(100);
    expect(p.steps.every((s) => s === "done")).toBe(true);
    expect(p.summary).toEqual(summarize(result));
    expect(p.revealed.size).toBe(64);
    expect(p.done).toBe(true);
    // Past the end is still the end.
    expect(detectionProgress(PROCESSING_MS * 3, result)).toMatchObject({ percent: 100, done: true });
  });

  it("finds sections before items, and never goes backwards", () => {
    const early = detectionProgress(PROCESSING_MS * (1.5 / DETECTION_STEPS.length), result);
    expect(early.summary.sections).toBeGreaterThan(0);
    expect(early.summary.items).toBe(0);

    let last = detectionProgress(0, result);
    for (let ms = 100; ms <= PROCESSING_MS; ms += 100) {
      const p = detectionProgress(ms, result);
      expect(p.percent).toBeGreaterThanOrEqual(last.percent);
      expect(p.summary.items).toBeGreaterThanOrEqual(last.summary.items);
      expect(p.steps.filter((s) => s === "done").length).toBeGreaterThanOrEqual(
        last.steps.filter((s) => s === "done").length
      );
      last = p;
    }
  });

  it("marks 72% as four steps done and the fifth active, as the frame shows", () => {
    const p = detectionProgress(PROCESSING_MS * 0.72, result);
    expect(p.percent).toBe(72);
    expect(p.steps).toEqual(["done", "done", "done", "done", "active", "pending"]);
  });
});
