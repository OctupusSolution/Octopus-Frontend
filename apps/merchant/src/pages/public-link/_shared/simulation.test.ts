import { describe, expect, it } from "vitest";
import { SIM_STEPS, resultsFor } from "./simulation";

describe("simulation", () => {
  it("rehearses the seven journey steps the frame lists", () => {
    expect(SIM_STEPS.map((s) => s.id)).toEqual([
      "landing", "browseMenu", "reservation", "waitlist", "order", "checkout", "confirmation",
    ]);
  });

  it("reports only the steps that actually ran", () => {
    expect(resultsFor(0)).toEqual([]);
    expect(resultsFor(3)).toHaveLength(3);
    expect(resultsFor(SIM_STEPS.length)).toHaveLength(SIM_STEPS.length);
  });

  it("marks a completed step successful and carries its timing", () => {
    const [first] = resultsFor(1);
    expect(first).toMatchObject({ stepId: "landing", status: "success" });
    expect(first.seconds).toBe(SIM_STEPS[0].seconds);
  });

  it("clamps a count past the end rather than inventing steps", () => {
    expect(resultsFor(99)).toHaveLength(SIM_STEPS.length);
  });
});
