import { describe, expect, it } from "vitest";
import { isScheduleValid, validateSchedule } from "./schedule-validation";
import { WEEKDAYS, type MenuSchedule } from "./menu";

function schedule(patch: Partial<MenuSchedule> = {}): MenuSchedule {
  return {
    type: "lunch",
    start: "12:00",
    end: "16:00",
    days: [...WEEKDAYS],
    timezone: "Asia/Riyadh",
    branchIds: ["jeddah"],
    fallbackMenuId: null,
    allowPreorderOutsideSchedule: false,
    ...patch,
  };
}

describe("validateSchedule", () => {
  it("accepts a same-day window with days and a branch", () => {
    expect(validateSchedule(schedule(), "a")).toEqual({});
    expect(isScheduleValid(schedule(), "a")).toBe(true);
  });

  it("accepts the all-day window", () => {
    expect(validateSchedule(schedule({ type: "all-day", start: "00:00", end: "23:59" }), "a")).toEqual({});
  });

  it("refuses an end before the start", () => {
    expect(validateSchedule(schedule({ start: "18:00", end: "02:00" }), "a")).toEqual({ end: "end-not-after-start" });
  });

  it("refuses an end equal to the start", () => {
    expect(validateSchedule(schedule({ start: "12:00", end: "12:00" }), "a").end).toBe("end-not-after-start");
  });

  it("asks for a time that was cleared", () => {
    expect(validateSchedule(schedule({ start: "", end: "" }), "a")).toEqual({
      start: "time-required",
      end: "time-required",
    });
  });

  it("does not compare against a missing start", () => {
    expect(validateSchedule(schedule({ start: "" }), "a")).toEqual({ start: "time-required" });
  });

  it("requires at least one day", () => {
    expect(validateSchedule(schedule({ days: [] }), "a")).toEqual({ days: "no-days" });
  });

  it("requires at least one branch", () => {
    expect(validateSchedule(schedule({ branchIds: [] }), "a")).toEqual({ branchIds: "no-branches" });
  });

  it("refuses the menu as its own fallback", () => {
    expect(validateSchedule(schedule({ fallbackMenuId: "a" }), "a")).toEqual({ fallbackMenuId: "fallback-self" });
    expect(validateSchedule(schedule({ fallbackMenuId: "b" }), "a")).toEqual({});
  });

  it("reports every problem at once", () => {
    const errors = validateSchedule(schedule({ end: "11:00", days: [], branchIds: [] }), "a");
    expect(Object.keys(errors).sort()).toEqual(["branchIds", "days", "end"]);
    expect(isScheduleValid(schedule({ days: [] }), "a")).toBe(false);
  });
});
