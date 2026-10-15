// Reading the backend's answers about a table session (place occupancy, US-020).
import { ApiError } from "@octopus/api-client";

export type OccupancyProblem = "hasUnaccepted" | "alreadyOpen" | "stale" | "forbidden" | "generic";

/** The status is the backend enum's name ("Open" / "Closed"). */
export const isOccupancyOpen = (status: string): boolean => status.toLowerCase() === "open";

export function occupancyProblemOf(e: unknown): { problem: OccupancyProblem; detail: string | null } {
  if (!(e instanceof ApiError)) return { problem: "generic", detail: null };
  const code = e.problem?.errorCode;
  if (code === "order.occupancy.has-unaccepted-orders") {
    // The codes travel as a ProblemDetails extension; `detail` is the backend's English sentence.
    const codes = (e.problem as { orderCodes?: unknown } | null)?.orderCodes;
    const list = Array.isArray(codes) ? codes.filter((c): c is string => typeof c === "string") : [];
    return { problem: "hasUnaccepted", detail: list.length ? list.join(", ") : null };
  }
  if (code === "order.occupancy.place-already-open") return { problem: "alreadyOpen", detail: null };
  // Someone else moved the session first: the card reloads and shows where it stands.
  if (code === "order.concurrency.stale" || code === "order.occupancy.already-closed" || code === "order.occupancy.already-open") {
    return { problem: "stale", detail: null };
  }
  if (e.status === 403) return { problem: "forbidden", detail: null };
  return { problem: "generic", detail: null };
}
