// What the Order Details page works out from one real order and its side
// lists. Pure — no React, no fetching — so the rules can be tested alone.
import type {
  OrderActivityEntryResponse,
  OrderLineResponse,
  OrderResponse,
  PaymentResponse,
} from "@octopus/api-client";
import { humanizeCode, isLineLive } from "@/entities/order";

export type TimelineStepId = "created" | "accepted" | "preparing" | "ready" | "served" | "payment" | "completed" | "cancelled" | "voided";

export type TimelineDetail =
  | { kind: "by"; name: string }
  | { kind: "closedBy"; name: string }
  | { kind: "text"; text: string }
  | { kind: "readyCount"; done: number; total: number }
  | { kind: "servedCount"; done: number; total: number }
  | { kind: "servedAll" }
  | { kind: "reason"; reason: string };

export interface TimelineStep {
  id: TimelineStepId;
  /** Null while the order has not reached this step. */
  at: string | null;
  detail: TimelineDetail | null;
}

function latest(values: readonly (string | null)[]): string | null {
  const present = values.filter((value): value is string => value !== null);
  return present.length === 0 ? null : present.reduce((a, b) => (a > b ? a : b));
}

/** Who did `action`, as the activity log names them. The log is paged
 *  (newest 50), so an old entry can be missing — the caller then omits it. */
export function actorOf(activity: readonly OrderActivityEntryResponse[], ...actions: string[]): string | null {
  return activity.find((entry) => actions.includes(entry.action) && entry.actorDisplay)?.actorDisplay ?? null;
}

export function capturedPayments(payments: readonly PaymentResponse[]): PaymentResponse[] {
  return payments.filter((payment) => payment.state === "Captured");
}

export function latestCapture(payments: readonly PaymentResponse[]): PaymentResponse | null {
  const captured = capturedPayments(payments);
  if (captured.length === 0) return null;
  return captured.reduce((a, b) => ((a.capturedAtUtc ?? a.createdAtUtc) > (b.capturedAtUtc ?? b.createdAtUtc) ? a : b));
}

export function paymentMethodLabel(payment: PaymentResponse): string {
  return humanizeCode(payment.kind);
}

export function buildTimeline(
  order: OrderResponse,
  payments: readonly PaymentResponse[],
  activity: readonly OrderActivityEntryResponse[]
): TimelineStep[] {
  // A line that was called off never reaches the kitchen stages.
  const live = order.lines.filter((line) => isLineLive(line.status));
  const started = [...order.lines]
    .filter((line): line is OrderLineResponse & { preparingAtUtc: string } => line.preparingAtUtc !== null)
    .sort((a, b) => a.preparingAtUtc.localeCompare(b.preparingAtUtc));
  const ready = live.filter((line) => line.readyAtUtc !== null);
  const served = live.filter((line) => line.servedAtUtc !== null);
  const capture = latestCapture(payments);
  const placedBy = actorOf(activity, "order.placed");
  const closedBy = actorOf(activity, "order.completed");

  const steps: TimelineStep[] = [
    { id: "created", at: order.placedAtUtc, detail: placedBy ? { kind: "by", name: placedBy } : null },
    { id: "accepted", at: order.acceptedAtUtc, detail: null },
    { id: "preparing", at: started[0]?.preparingAtUtc ?? null, detail: started[0] ? { kind: "text", text: started[0].displayName } : null },
    {
      id: "ready",
      at: latest(order.lines.map((line) => line.readyAtUtc)),
      detail: ready.length > 0 ? { kind: "readyCount", done: ready.length, total: live.length } : null,
    },
    {
      id: "served",
      at: latest(order.lines.map((line) => line.servedAtUtc)),
      detail:
        served.length === 0
          ? null
          : served.length === live.length
            ? { kind: "servedAll" }
            : { kind: "servedCount", done: served.length, total: live.length },
    },
    {
      id: "payment",
      at: capture ? (capture.capturedAtUtc ?? capture.createdAtUtc) : null,
      detail: capture
        ? { kind: "text", text: `${paymentMethodLabel(capture)} (${capture.amount.currency} ${capture.amount.amount.toFixed(2)})` }
        : null,
    },
  ];

  if (order.termination && (order.status === "Cancelled" || order.status === "Voided")) {
    // A called-off order stops where it was: the steps it never reached are dropped.
    const reached = steps.filter((step) => step.at !== null);
    reached.push({
      id: order.status === "Cancelled" ? "cancelled" : "voided",
      at: order.termination.atUtc,
      detail: { kind: "reason", reason: humanizeCode(order.termination.reasonCode) },
    });
    return reached;
  }

  steps.push({ id: "completed", at: order.completedAtUtc, detail: closedBy ? { kind: "closedBy", name: closedBy } : null });
  return steps;
}

export type SplitType = "none" | "equal" | "custom";

export interface PaymentSplit {
  type: SplitType;
  payments: PaymentResponse[];
}

/** The API has no split-bill object; a split is read off the captured
 *  payments themselves (several of them, equal or not). */
export function paymentSplit(payments: readonly PaymentResponse[]): PaymentSplit {
  const captured = capturedPayments(payments);
  if (captured.length < 2) return { type: "none", payments: captured };
  const first = captured[0].amount.amount;
  const equal = captured.every((payment) => Math.abs(payment.amount.amount - first) < 0.005);
  return { type: equal ? "equal" : "custom", payments: captured };
}

/** The tax inside a line's total. `lineTotal` always carries its tax share,
 *  whether the menu price was tax-inclusive or not. */
export function lineTax(line: OrderLineResponse, taxRatePercent: number): number {
  if (taxRatePercent <= 0) return 0;
  return (line.lineTotal.amount * taxRatePercent) / (100 + taxRatePercent);
}

export function lineDiscount(line: OrderLineResponse): number {
  return line.lineDiscountAmount.amount + line.orderDiscountShare.amount;
}

export function activityActionLabel(action: string): string {
  return humanizeCode(action.replace(/^order\./, "").replace(/\./g, " "));
}

export function activitySummaryText(summary: Record<string, unknown> | null | undefined): string {
  return Object.entries(summary ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${humanizeCode(key)}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");
}
