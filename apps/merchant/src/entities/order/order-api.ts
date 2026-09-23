// Reads real orders from the backend's Order module (US-018) — see
// packages/api-client/src/lib/order-admin-client.ts and
// E:\Octupus\octopus-backend\docs\06-Modules\Order.md.
//
// CRITICAL: this module lives on an unmerged backend branch
// (mustafadiaa-order-management-us018), is not verified against a live
// PostgreSQL by its own author yet, and is staff-side only (no customer
// self-ordering). A business without the `order:core` feature gets a plain
// 403 here — that is expected, not a bug, until the module ships. Every
// call in this file therefore fails soft: a rejected fetch resolves to an
// empty list rather than throwing, so the orders-list page's other sources
// (customer live orders, the seed rows) keep working regardless.
import {
  ApiError,
  cancelOrder,
  getOrder,
  getOrderDaySummary,
  issueRefund,
  listOrderPayments,
  recordTender,
  recordWastage,
  voidOrder,
  type ApprovalDto,
  type OrderDaySummaryResponse,
  type OrderResponse,
  type PaymentResponse,
} from "@octopus/api-client";

// The list itself is polled by shared/api/live-orders.ts (useRealOrders).

export async function fetchRealOrdersSummary(businessId: string): Promise<OrderDaySummaryResponse | null> {
  try {
    return await getOrderDaySummary(businessId);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return null;
    return null;
  }
}

// ---- Reason code mapping ----------------------------------------------------
// The backend validates reasonCode against a per-business whitelist read
// from GET /orders/settings (cancelReasonCodes/voidReasonCodes/
// wastageReasonCodes) — confirmed 2026-09-21 when "wrongOrder" 422'd
// "not a reason this business has configured". This page's own reason
// dropdowns were designed against no particular backend, so their option
// values don't line up with the seeded codes
// (customer-request/duplicate/unavailable/mistake/other for cancel; //
// customer-refused/wrong-item/quality/mistake/other for void;
// spoiled/dropped/overproduction/preparation-error/expired/other for
// wastage). This is a stand-in mapping, not a confirmed design decision —
// see BACKEND_GAPS.md 6b for the note asking whether the dropdowns
// themselves should change instead.
const CANCEL_REASON_CODES: Record<string, string> = {
  wrongOrder: "mistake",
  customerRequest: "customer-request",
  outOfStock: "unavailable",
  other: "other",
};

const VOID_REASON_CODES: Record<string, string> = {
  wrongInput: "wrong-item",
  duplicate: "mistake",
  testOrder: "mistake",
  other: "other",
};

const WASTAGE_REASON_CODES: Record<string, string> = {
  overcooked: "preparation-error",
  dropped: "dropped",
  expired: "expired",
  other: "other",
};

export function toCancelReasonCode(uiValue: string): string {
  return CANCEL_REASON_CODES[uiValue] ?? "other";
}

export function toVoidReasonCode(uiValue: string): string {
  return VOID_REASON_CODES[uiValue] ?? "other";
}

export function toWastageReasonCode(uiValue: string): string {
  return WASTAGE_REASON_CODES[uiValue] ?? "other";
}

// ---- Real actions (Cancel / Void / Wastage) --------------------------------
// Confirmed against the live branch on 2026-09-21. Refund is deliberately
// NOT wired here yet: it needs a paymentId, which means fetching
// GET /{id}/payments first, and this order-list page has no such fetch or
// payment-matching UI yet — see BACKEND_GAPS.md 6b.

export type OrderActionResult =
  | { ok: true; order: OrderResponse }
  /** `approvalNeeded: true` means the PIN itself was fine but the caller's
   *  permission doesn't cover this action without one at all (422
   *  order.approval.needed) — surfaced separately so the UI can tell "wrong
   *  PIN" from "you're not allowed to approve this" if it ever needs to. */
  | { ok: false; message: string; approvalNeeded?: boolean };

function actionErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.problem?.detail ?? err.problem?.errorCode ?? err.message;
  return "orders.error.actionFailed";
}

export async function cancelRealOrder(
  businessId: string,
  orderId: string,
  version: number,
  reasonCode: string,
  approval: ApprovalDto
): Promise<OrderActionResult> {
  try {
    const outcome = await cancelOrder(businessId, orderId, { reasonCode, note: null, approval, expectedVersion: version });
    return { ok: true, order: outcome.order };
  } catch (err) {
    const approvalNeeded = err instanceof ApiError && err.problem?.errorCode === "order.approval.needed";
    return { ok: false, message: actionErrorMessage(err), approvalNeeded };
  }
}

export async function voidRealOrder(
  businessId: string,
  orderId: string,
  version: number,
  reasonCode: string,
  approval: ApprovalDto
): Promise<OrderActionResult> {
  try {
    const outcome = await voidOrder(businessId, orderId, { reasonCode, note: null, approval, expectedVersion: version });
    return { ok: true, order: outcome.order };
  } catch (err) {
    const approvalNeeded = err instanceof ApiError && err.problem?.errorCode === "order.approval.needed";
    return { ok: false, message: actionErrorMessage(err), approvalNeeded };
  }
}

/** Records wastage for each item the form collected, one call per line (the
 *  API has no bulk wastage endpoint). Version drifts between calls (each
 *  succeeding write bumps it) so each request reads the order's current
 *  version fresh rather than reusing the one passed in. */
export async function recordWastageForOrder(
  businessId: string,
  orderId: string,
  items: readonly { lineId: string; quantity: number }[],
  reasonCode: string,
  approval: ApprovalDto
): Promise<OrderActionResult> {
  try {
    let order: OrderResponse = await getOrder(businessId, orderId);
    for (const item of items) {
      const outcome = await recordWastage(businessId, orderId, {
        lineId: item.lineId,
        quantity: item.quantity,
        cost: null,
        reasonCode,
        note: null,
        approval,
        expectedVersion: order.version,
      });
      order = outcome.order;
    }
    return { ok: true, order };
  } catch (err) {
    const approvalNeeded = err instanceof ApiError && err.problem?.errorCode === "order.approval.needed";
    return { ok: false, message: actionErrorMessage(err), approvalNeeded };
  }
}

// ---- Payments / Refund ------------------------------------------------------
// Confirmed against the live branch on 2026-09-21 (record a cash tender,
// list it back, issue a partial refund against it — all three round-tripped
// successfully). recordTender/createPaymentLink are idempotent per the
// module doc, so each gets its own fresh key.

export async function fetchOrderPayments(businessId: string, orderId: string): Promise<PaymentResponse[]> {
  try {
    return await listOrderPayments(businessId, orderId);
  } catch {
    return [];
  }
}

/** Records a cash tender for the order's current balance due (or a smaller
 *  amount, e.g. a partial cash payment). No approval needed — cash/card
 *  tenders aren't step-up-gated the way reversals are. */
export async function recordCashTender(businessId: string, orderId: string, amount: number): Promise<OrderActionResult> {
  try {
    const order = await getOrder(businessId, orderId);
    const outcome = await recordTender(
      businessId,
      orderId,
      { businessId, orderId, kind: "cash", amount, gratuity: 0, reference: null, expectedVersion: order.version },
      crypto.randomUUID()
    );
    return { ok: true, order: outcome.order };
  } catch (err) {
    return { ok: false, message: actionErrorMessage(err) };
  }
}

export async function issueRealRefund(
  businessId: string,
  orderId: string,
  paymentId: string,
  amount: number | null,
  reasonCode: string,
  approval: ApprovalDto
): Promise<OrderActionResult> {
  try {
    const order = await getOrder(businessId, orderId);
    await issueRefund(businessId, orderId, {
      paymentId,
      amount,
      lineIds: null,
      reasonCode,
      note: null,
      approval,
      expectedVersion: order.version,
    });
    // issueRefund returns the RefundResponse, not the order — re-read so the
    // caller gets the order's post-refund balance/paymentState.
    const refreshed = await getOrder(businessId, orderId);
    return { ok: true, order: refreshed };
  } catch (err) {
    const approvalNeeded = err instanceof ApiError && err.problem?.errorCode === "order.approval.needed";
    return { ok: false, message: actionErrorMessage(err), approvalNeeded };
  }
}

const REFUND_REASON_CODES: Record<string, string> = {
  wrongInput: "overcharge",
  customerComplaint: "service-issue",
  qualityIssue: "quality",
  other: "other",
};

export function toRefundReasonCode(uiValue: string): string {
  return REFUND_REASON_CODES[uiValue] ?? "other";
}
