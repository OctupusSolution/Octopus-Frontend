// Reading the backend's answers about a table session (place occupancy, US-020).
import { ApiError } from "@octopus/api-client";

export type OccupancyProblem = "hasUnaccepted" | "alreadyOpen" | "stale" | "forbidden" | "generic";

/** The status is the backend enum's name ("Open" / "Closed"). */
export const isOccupancyOpen = (status: string): boolean => status.toLowerCase() === "open";

export function occupancyProblemOf(e: unknown): { problem: OccupancyProblem; detail: string | null } {
  if (!(e instanceof ApiError)) return { problem: "generic", detail: null };
  const code = e.problem?.errorCode;
  const detail = e.problem?.detail ?? null;
  if (code === "order.occupancy.has-unaccepted-orders") return { problem: "hasUnaccepted", detail };
  if (code === "order.occupancy.place-already-open") return { problem: "alreadyOpen", detail };
  // Someone else moved the session first: the card reloads and shows where it stands.
  if (code === "order.concurrency.stale" || code === "order.occupancy.already-closed" || code === "order.occupancy.already-open") {
    return { problem: "stale", detail: null };
  }
  if (e.status === 403) return { problem: "forbidden", detail: null };
  return { problem: "generic", detail: null };
}
