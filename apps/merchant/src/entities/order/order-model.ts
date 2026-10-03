// Pure rules about a real Order-module order, mirrored from the backend's own
// domain (OrderStatuses.cs, LineStatusParser, FulfilmentCommands) so every
// screen — the orders list, KDS, and the POS terminal later — decides which
// action to offer the same way. No React, no fetching.
import {
  ApiError,
  type MoneyDto,
  type OrderAdminStatus,
  type OrderLineResponse,
  type OrderLineStatus,
  type OrderLineTargetStatus,
  type OrderResponse,
} from "@octopus/api-client";

export const OPEN_ORDER_STATUSES: readonly OrderAdminStatus[] = ["New", "Accepted", "Preparing", "Ready", "Served"];

/** What a kitchen works on: accepted, not yet fully ready-and-served. */
export const KITCHEN_ORDER_STATUSES: readonly OrderAdminStatus[] = ["New", "Accepted", "Preparing", "Ready"];

export function isOrderOpen(status: OrderAdminStatus): boolean {
  return OPEN_ORDER_STATUSES.includes(status);
}

/** OrderLineStatusExtensions.IsLive. */
export function isLineLive(status: OrderLineStatus): boolean {
  return status === "Pending" || status === "Preparing" || status === "Ready" || status === "Served";
}

/** OrderLineStatusExtensions.IsInWork — cancel refuses these, void takes them. */
export function isLineInWork(status: OrderLineStatus): boolean {
  return status === "Preparing" || status === "Ready" || status === "Served";
}

/** The one forward move a line can make, or null when it cannot move. */
export function nextLineStatus(status: OrderLineStatus): OrderLineTargetStatus | null {
  switch (status) {
    case "Pending":
      return "Preparing";
    case "Preparing":
      return "Ready";
    case "Ready":
      return "Served";
    default:
      return null;
  }
}

/** The bulk move that advances a whole order one stage (POST …/lines/status),
 *  or null when there is nothing to advance. Lines that cannot make it are
 *  skipped server-side, so the lowest live line decides. */
export function nextOrderStage(order: Pick<OrderResponse, "status" | "lines">): OrderLineTargetStatus | null {
  if (order.status === "New" || !isOrderOpen(order.status)) return null;
  const live = order.lines.filter((line) => isLineLive(line.status));
  if (live.some((line) => line.status === "Pending")) return "Preparing";
  if (live.some((line) => line.status === "Preparing")) return "Ready";
  if (live.some((line) => line.status === "Ready")) return "Served";
  return null;
}

/** Accept only from New (an auto-accepting source never is). */
export function canAccept(order: Pick<OrderResponse, "status">): boolean {
  return order.status === "New";
}

/** Complete needs every live line served and nothing owed. */
export function canComplete(order: Pick<OrderResponse, "status" | "balanceDue" | "excessCaptured">): boolean {
  return order.status === "Served" && order.balanceDue.amount <= 0 && order.excessCaptured.amount <= 0;
}

/** Edit/remove only while nobody has started the line and the order is open. */
export function canEditLine(order: Pick<OrderResponse, "status">, line: Pick<OrderLineResponse, "status">): boolean {
  return isOrderOpen(order.status) && line.status === "Pending";
}

/** Discounts are locked once money has been taken against the total. */
export function canDiscount(order: Pick<OrderResponse, "status" | "capturedTotal">): boolean {
  return isOrderOpen(order.status) && order.capturedTotal.amount <= 0;
}

export function formatMoney(money: MoneyDto | null | undefined): string {
  if (!money) return "—";
  return `${money.currency} ${money.amount.toFixed(2)}`;
}

export function placeLabel(order: Pick<OrderResponse, "resource">): string | null {
  return order.resource ? order.resource.displayName || order.resource.code : null;
}

// ---- Errors -------------------------------------------------------------------

/** 422 order.approval.needed — the action needs a manager PIN. */
export function isApprovalNeeded(err: unknown): boolean {
  return err instanceof ApiError && err.problem?.errorCode === "order.approval.needed";
}

/** 409 with a stale expectedVersion — the caller should re-read the order. */
export function isStaleVersion(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409 && (err.problem?.errorCode ?? "").includes("concurrency");
}

/** The most specific human text an ApiError carries: a field validation
 *  message, then the ProblemDetails detail, then its title/code. */
export function orderErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) {
    const firstField = err.problem?.errors ? Object.values(err.problem.errors).flat()[0] : undefined;
    return firstField ?? err.problem?.detail ?? err.problem?.title ?? err.problem?.errorCode ?? err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
