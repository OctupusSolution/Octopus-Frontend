// Real client for the Order module's AdminApi endpoints (US-018) —
// `/v1/businesses/{businessId}/orders/...`.
//
// VERIFIED 2026-09-23 against the backend's own *Endpoints.cs files (route,
// method, body, success status) — see contracts/order-admin.ts for the DTO
// notes. AdminApi only; PublicApi maps none of it.
//
// Idempotency-Key is REQUIRED (`.WithOctopusIdempotency()`) on exactly:
// takeOrder, addOrderLines, recordTender, createPaymentLink, sendOrderReceipt.
// Those five bind their command whole from the body, so the route ids are
// repeated in the body and must agree. No approval-gated command is
// idempotent (the fingerprint would persist the PIN); for those the
// double-submit defence is expectedVersion.
import type {
  AcceptOrderRequest,
  AddOrderLinesRequest,
  AdvanceLineStatusRequest,
  ApplyLineDiscountRequest,
  ApplyOrderDiscountRequest,
  BulkAdvanceLineStatusRequest,
  CancelOrderLinesRequest,
  CancelOrderRequest,
  CompleteOrderRequest,
  CreatePaymentLinkRequest,
  DuplicateOrderTemplateResponse,
  IssueRefundRequest,
  ListOrdersParams,
  OrderActivityEntryResponse,
  OrderDaySummaryResponse,
  OrderResponse,
  OrderSettingsResponse,
  OrderSourceResponse,
  OrderSummaryResponse,
  PaymentOutcomeResponse,
  PaymentResponse,
  ReceiptRequestResponse,
  RecordTenderRequest,
  RecordWastageRequest,
  RefundResponse,
  RemoveLineDiscountRequest,
  RemoveOrderDiscountRequest,
  RemoveOrderLineRequest,
  RetryRefundRequest,
  ReversalOutcomeResponse,
  SellableCatalogResponse,
  SellableCatalogSummaryResponse,
  SendReceiptRequest,
  TakeOrderRequest,
  TransferOrderRequest,
  UpdateOrderContactRequest,
  UpdateOrderDetailsRequest,
  UpdateOrderLineRequest,
  UpdateOrderSettingsRequest,
  UpdateOrderSourcesRequest,
  VoidOrderLinesRequest,
  VoidOrderRequest,
  WastageResponse,
} from "../contracts/order-admin";
import type { ListEnvelope } from "../contracts/menu-admin";
import { apiRequest } from "./http";

const base = (businessId: string) => `/v1/businesses/${businessId}/orders`;

/** http.ts's `query` holds one value per key; ASP.NET binds a `string[]`
 *  query parameter from a REPEATED key, so array filters are put into the
 *  path's own search string instead (buildUrl keeps it and appends `query`). */
function repeated(params: Record<string, readonly string[] | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, values] of Object.entries(params)) {
    for (const value of values ?? []) search.append(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

// ---- Settings -------------------------------------------------------------------

export function getOrderSettings(businessId: string): Promise<OrderSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings`);
}

export function updateOrderSettings(businessId: string, request: UpdateOrderSettingsRequest): Promise<OrderSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings`, { method: "PUT", body: request });
}

/** Bare array, not a ListEnvelope. */
export function listOrderSources(businessId: string): Promise<OrderSourceResponse[]> {
  return apiRequest(`${base(businessId)}/settings/sources`);
}

/** Replaces the business's channel list; returns the full list (bare array).
 *  Shares the settings version. */
export function updateOrderSources(businessId: string, request: UpdateOrderSourcesRequest): Promise<OrderSourceResponse[]> {
  return apiRequest(`${base(businessId)}/settings/sources`, { method: "PUT", body: request });
}

// ---- Sellable catalog -------------------------------------------------------------

/** Bare array. `sourceCode` defaults to "pos" server-side. */
export function listSellableCatalogs(
  businessId: string,
  params: { branchId?: string; sourceCode?: string } = {}
): Promise<SellableCatalogSummaryResponse[]> {
  return apiRequest(`${base(businessId)}/catalog`, { query: { branchId: params.branchId, sourceCode: params.sourceCode } });
}

export function getSellableCatalog(
  businessId: string,
  catalogId: string,
  params: { branchId?: string; sourceCode?: string } = {}
): Promise<SellableCatalogResponse> {
  return apiRequest(`${base(businessId)}/catalog/${catalogId}`, {
    query: { branchId: params.branchId, sourceCode: params.sourceCode },
  });
}

// ---- Orders -------------------------------------------------------------------

export function listOrders(businessId: string, params: ListOrdersParams = {}): Promise<ListEnvelope<OrderSummaryResponse>> {
  const arrays = repeated({
    statuses: params.statuses,
    paymentStates: params.paymentStates,
    sourceCodes: params.sourceCodes,
  });
  return apiRequest(`${base(businessId)}${arrays}`, {
    query: {
      date: params.date,
      fromUtc: params.fromUtc,
      toUtc: params.toUtc,
      fulfilmentCode: params.fulfilmentCode,
      branchId: params.branchId,
      resourceId: params.resourceId,
      minAmount: params.minAmount?.toString(),
      maxAmount: params.maxAmount?.toString(),
      minAttendees: params.minAttendees?.toString(),
      maxAttendees: params.maxAttendees?.toString(),
      paymentKind: params.paymentKind,
      search: params.search,
      sort: params.sort,
      sortDirection: params.sortDirection,
      page: params.page?.toString(),
      pageSize: params.pageSize?.toString(),
    },
  });
}

/** 201 + Location. Idempotency-Key required. */
export function takeOrder(businessId: string, request: TakeOrderRequest, idempotencyKey: string): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}`, { method: "POST", body: request, idempotencyKey });
}

export function getOrderDaySummary(
  businessId: string,
  params: { date?: string; branchId?: string } = {}
): Promise<OrderDaySummaryResponse> {
  return apiRequest(`${base(businessId)}/summary`, { query: { date: params.date, branchId: params.branchId } });
}

export function getOrder(businessId: string, orderId: string): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}`);
}

/** Reads what's needed to take an old order again. Writes nothing. */
export function duplicateOrderTemplate(businessId: string, orderId: string): Promise<DuplicateOrderTemplateResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/duplicate`);
}

/** Newest first. */
export function getOrderActivity(
  businessId: string,
  orderId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<OrderActivityEntryResponse>> {
  return apiRequest(`${base(businessId)}/${orderId}/activity`, {
    query: { page: params.page?.toString(), pageSize: params.pageSize?.toString() },
  });
}

export function updateOrderDetails(businessId: string, orderId: string, request: UpdateOrderDetailsRequest): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}`, { method: "PATCH", body: request });
}

export function setOrderContact(businessId: string, orderId: string, request: UpdateOrderContactRequest): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/contact`, { method: "PUT", body: request });
}

// ---- Lines --------------------------------------------------------------------

/** Idempotency-Key required; businessId/orderId repeated in the body. 200. */
export function addOrderLines(
  businessId: string,
  orderId: string,
  request: AddOrderLinesRequest,
  idempotencyKey: string
): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/lines`, { method: "POST", body: request, idempotencyKey });
}

export function updateOrderLine(
  businessId: string,
  orderId: string,
  lineId: string,
  request: UpdateOrderLineRequest
): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/lines/${lineId}`, { method: "PATCH", body: request });
}

/** Only a line nobody has started, and never the only line. */
export function removeOrderLine(
  businessId: string,
  orderId: string,
  lineId: string,
  request: RemoveOrderLineRequest
): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/lines/${lineId}/remove`, { method: "POST", body: request });
}

// ---- Lifecycle ------------------------------------------------------------------

/** Only from New; an auto-accepted order answers 409 order.order.invalid-transition. */
export function acceptOrder(businessId: string, orderId: string, request: AcceptOrderRequest): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/accept`, { method: "POST", body: request });
}

/** Refused while a balance is outstanding (order.order.balance-outstanding). Final. */
export function completeOrder(businessId: string, orderId: string, request: CompleteOrderRequest): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/complete`, { method: "POST", body: request });
}

export function bulkAdvanceLineStatus(
  businessId: string,
  orderId: string,
  request: BulkAdvanceLineStatusRequest
): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/lines/status`, { method: "POST", body: request });
}

export function advanceLineStatus(
  businessId: string,
  orderId: string,
  lineId: string,
  request: AdvanceLineStatusRequest
): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/lines/${lineId}/status`, { method: "POST", body: request });
}

export function transferOrder(businessId: string, orderId: string, request: TransferOrderRequest): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/transfer`, { method: "POST", body: request });
}

// ---- Cancel / void / wastage -----------------------------------------------------

export function cancelOrder(businessId: string, orderId: string, request: CancelOrderRequest): Promise<ReversalOutcomeResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/cancel`, { method: "POST", body: request });
}

export function cancelOrderLines(businessId: string, orderId: string, request: CancelOrderLinesRequest): Promise<ReversalOutcomeResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/lines/cancel`, { method: "POST", body: request });
}

export function voidOrder(businessId: string, orderId: string, request: VoidOrderRequest): Promise<ReversalOutcomeResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/void`, { method: "POST", body: request });
}

export function voidOrderLines(businessId: string, orderId: string, request: VoidOrderLinesRequest): Promise<ReversalOutcomeResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/lines/void`, { method: "POST", body: request });
}

/** 201. */
export function recordWastage(businessId: string, orderId: string, request: RecordWastageRequest): Promise<ReversalOutcomeResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/wastage`, { method: "POST", body: request });
}

/** Bare array, oldest first. */
export function listWastage(businessId: string, orderId: string): Promise<WastageResponse[]> {
  return apiRequest(`${base(businessId)}/${orderId}/wastage`);
}

// ---- Discounts ------------------------------------------------------------------

export function applyOrderDiscount(businessId: string, orderId: string, request: ApplyOrderDiscountRequest): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/discount`, { method: "POST", body: request });
}

/** Needs no approval. Refused once money has been taken against the total. */
export function removeOrderDiscount(businessId: string, orderId: string, request: RemoveOrderDiscountRequest): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/discount/remove`, { method: "POST", body: request });
}

export function applyLineDiscount(
  businessId: string,
  orderId: string,
  lineId: string,
  request: ApplyLineDiscountRequest
): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/lines/${lineId}/discount`, { method: "POST", body: request });
}

export function removeLineDiscount(
  businessId: string,
  orderId: string,
  lineId: string,
  request: RemoveLineDiscountRequest
): Promise<OrderResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/lines/${lineId}/discount/remove`, { method: "POST", body: request });
}

// ---- Payments -----------------------------------------------------------------

/** Bare array, oldest first. */
export function listOrderPayments(businessId: string, orderId: string): Promise<PaymentResponse[]> {
  return apiRequest(`${base(businessId)}/${orderId}/payments`);
}

/** 201. Idempotency-Key required. */
export function recordTender(businessId: string, orderId: string, request: RecordTenderRequest, idempotencyKey: string): Promise<PaymentOutcomeResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/payments/tenders`, { method: "POST", body: request, idempotencyKey });
}

/** 201. Idempotency-Key required. Needs `order:online-payments`. */
export function createPaymentLink(businessId: string, orderId: string, request: CreatePaymentLinkRequest, idempotencyKey: string): Promise<PaymentOutcomeResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/payments/links`, { method: "POST", body: request, idempotencyKey });
}

/** No body. The only way a link becomes captured (there is no webhook). */
export function refreshPaymentLink(businessId: string, orderId: string, paymentId: string): Promise<PaymentOutcomeResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/payments/${paymentId}/refresh`, { method: "POST" });
}

/** No body. A link paid meanwhile answers 409 order.payment.already-paid. */
export function cancelPaymentLink(businessId: string, orderId: string, paymentId: string): Promise<PaymentOutcomeResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/payments/${paymentId}/cancel`, { method: "POST" });
}

// ---- Refunds ------------------------------------------------------------------

/** Bare array, oldest first — failed refunds included. */
export function listOrderRefunds(businessId: string, orderId: string): Promise<RefundResponse[]> {
  return apiRequest(`${base(businessId)}/${orderId}/refunds`);
}

/** 201. Not idempotent. */
export function issueRefund(businessId: string, orderId: string, request: IssueRefundRequest): Promise<RefundResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/refunds`, { method: "POST", body: request });
}

/** 201 with a NEW refund naming the failed one. */
export function retryRefund(businessId: string, orderId: string, refundId: string, request: RetryRefundRequest): Promise<RefundResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/refunds/${refundId}/retry`, { method: "POST", body: request });
}

// ---- Receipt ------------------------------------------------------------------

/** 202. Idempotency-Key required; needs `order:receipts`. */
export function sendOrderReceipt(
  businessId: string,
  orderId: string,
  request: SendReceiptRequest,
  idempotencyKey: string
): Promise<ReceiptRequestResponse> {
  return apiRequest(`${base(businessId)}/${orderId}/receipt`, { method: "POST", body: request, idempotencyKey });
}
