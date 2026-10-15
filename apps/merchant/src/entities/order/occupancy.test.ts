import { describe, expect, it } from "vitest";
import { ApiError } from "@octopus/api-client";
import { isOccupancyOpen, occupancyProblemOf } from "./occupancy";

const err = (status: number, errorCode: string, detail?: string) => new ApiError(status, { status, errorCode, detail });

describe("occupancyProblemOf", () => {
  it("names the orders to answer before a session can close, from the problem's orderCodes", () => {
    const e = new ApiError(409, {
      status: 409,
      errorCode: "order.occupancy.has-unaccepted-orders",
      detail: "Accept or decline the waiting orders before closing.",
      orderCodes: ["O-000101", "O-000102"],
    } as never);
    expect(occupancyProblemOf(e)).toEqual({ problem: "hasUnaccepted", detail: "O-000101, O-000102" });
  });
  it("never shows the backend's English sentence as the detail", () => {
    expect(occupancyProblemOf(err(409, "order.occupancy.has-unaccepted-orders", "English text")).detail).toBeNull();
  });
  it("says another session holds the table, without an id staff cannot use", () => {
    expect(occupancyProblemOf(err(409, "order.occupancy.place-already-open", "S-9"))).toEqual({ problem: "alreadyOpen", detail: null });
  });
  it("treats a version conflict and an already-changed state as stale", () => {
    expect(occupancyProblemOf(err(409, "order.concurrency.stale")).problem).toBe("stale");
    expect(occupancyProblemOf(err(409, "order.occupancy.already-closed")).problem).toBe("stale");
    expect(occupancyProblemOf(err(409, "order.occupancy.already-open")).problem).toBe("stale");
  });
  it("tells a missing permission from everything else", () => {
    expect(occupancyProblemOf(err(403, "authorization.forbidden")).problem).toBe("forbidden");
    expect(occupancyProblemOf(err(500, "boom"))).toEqual({ problem: "generic", detail: null });
    expect(occupancyProblemOf(new Error("net")).problem).toBe("generic");
  });
});

describe("isOccupancyOpen", () => {
  it("reads the backend's status in any case", () => {
    expect(isOccupancyOpen("Open")).toBe(true);
    expect(isOccupancyOpen("open")).toBe(true);
    expect(isOccupancyOpen("Closed")).toBe(false);
  });
});
