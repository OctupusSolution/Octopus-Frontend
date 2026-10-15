import { describe, expect, it } from "vitest";
import { ApiError } from "@octopus/api-client";
import { isOccupancyOpen, occupancyProblemOf } from "./occupancy";

const err = (status: number, errorCode: string, detail?: string) => new ApiError(status, { status, errorCode, detail });

describe("occupancyProblemOf", () => {
  it("names the orders to answer before a session can close", () => {
    expect(occupancyProblemOf(err(409, "order.occupancy.has-unaccepted-orders", "#101, #102"))).toEqual({
      problem: "hasUnaccepted",
      detail: "#101, #102",
    });
  });
  it("says another session holds the table", () => {
    expect(occupancyProblemOf(err(409, "order.occupancy.place-already-open", "S-9")).problem).toBe("alreadyOpen");
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
