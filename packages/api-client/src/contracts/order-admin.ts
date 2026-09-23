// Mirrors the Order module's AdminApi contracts (US-018).
//
// VERIFIED 2026-09-23 against the backend source, field by field:
//   src/Modules/Order/Octopus.Modules.Order.Contracts/Dtos/**      (DTOs)
//   src/Modules/Order/Octopus.Modules.Order.Api/**/*Endpoints.cs    (routes, bodies, status codes)
//   src/Modules/Order/Octopus.Modules.Order.Application/**          (commands bound whole from the body)
// JSON is camelCase; Guid → string, DateTimeOffset/DateOnly → ISO string,
// decimal → number. Enums travel as their PascalCase names (responses) and
// are parsed case-insensitively (requests).
//
// Names carry an `Order` prefix wherever the backend's own name is generic
// (CustomerDto, ResourceRefDto, DiscountDto…) because the package barrel
// re-exports every contract file with `export *` and a clash there is a
// compile error.

// MoneyDto and ListEnvelope come from menu-admin.ts — imported for use here,
// not re-exported (the barrel already exports them).
import type { MoneyDto } from "./menu-admin";

// ---- Enums ------------------------------------------------------------------

export type OrderLineStatus = "Pending" | "Preparing" | "Ready" | "Served" | "Cancelled" | "Voided" | "Wasted";

/** The only statuses POST …/lines/status and …/lines/{lineId}/status accept
 *  (LineStatusParser.Targets) — a line only ever moves forward. */
export type OrderLineTargetStatus = "Preparing" | "Ready" | "Served";

export type OrderAdminStatus =
  | "New"
  | "Accepted"
  | "Preparing"
  | "Ready"
  | "Served"
  | "Completed"
  | "Cancelled"
  | "Voided";

export type OrderPaymentState = "Unpaid" | "PartiallyPaid" | "Paid" | "Overpaid" | "PartiallyRefunded" | "Refunded";

/** RefundTrigger names (RefundResponse.trigger). */
export type RefundReason = "Manual" | "OrderVoid" | "LineVoid" | "CancelExcess" | "WastageExcess";

/** ApplyDiscountRequest.kind — the validator accepts exactly these two
 *  (case-insensitive): "The kind must be Amount or Percent." */
export type OrderDiscountKind = "Amount" | "Percent";

/** GET /orders `sort` keys (OrderSort). Anything else answers 422
 *  order.list.sort-invalid. */
export type OrderListSort = "Placed" | "Amount" | "Code" | "Status";

// ---- Shared -------------------------------------------------------------------

/** Backend `ExpectedVersionRequest` — the whole body of accept, complete, remove line,
 *  and both discount-remove routes. */
export interface OrderExpectedVersionRequest {
  expectedVersion: number;
}

/** Embedded on Void/Cancel/Wastage/Discount/Refund requests when step-up PIN
 *  approval applies. Omit (null) when the caller's permission already covers
 *  the action. A 422 with errorCode `order.approval.needed` means it is
 *  required. */
export interface ApprovalDto {
  approverAccountId: string;
  pin: string;
}

// ---- Orders: embedded DTOs ------------------------------------------------------

/** Backend `CustomerDto`. Always present on an order (every field may be null). */
export interface OrderCustomerDto {
  name: string | null;
  phone: string | null;
  email: string | null;
  externalRef: string | null;
}

/** Backend `ResourceRefDto` — a place on the live floor. `containerId` is the
 *  floor plan id and `resourceId` the spot id (FloorPlanResourceDirectory). */
export interface OrderResourceRefDto {
  sourceKey: string;
  containerId: string;
  resourceId: string;
  code: string;
  displayName: string;
  groupId: string | null;
  groupName: string | null;
}

/** Backend `VisitRefDto` — an opaque link to a reservation / waiting entry. */
export interface OrderVisitRefDto {
  sourceKey: string;
  code: string;
}

/** Backend `CatalogRefDto`. */
export interface OrderLineCatalogRefDto {
  catalogId: string;
  publicationId: string;
  publicationVersion: number;
  entryId: string;
}

/** Backend `LineOptionSelectionDto`. */
export interface OrderLineOptionDto {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  effectKind: string;
  effectAmount: MoneyDto | null;
}

/** Backend `DiscountDto` — on an order or on a line. */
export interface OrderDiscountDto {
  kind: string;
  value: number;
  amount: MoneyDto;
  reasonCode: string;
  note: string | null;
  appliedByAccountId: string;
  approvedByAccountId: string | null;
  appliedAtUtc: string;
}

/** Backend `TerminationDto` — why an order or a line was called off. */
export interface OrderTerminationDto {
  kind: string;
  reasonCode: string;
  note: string | null;
  byAccountId: string | null;
  approvedByAccountId: string | null;
  atUtc: string;
}

/** Backend `OrderTotalsDto`. */
export interface OrderTotalsResponse {
  linesSubtotal: MoneyDto;
  orderDiscountAmount: MoneyDto;
  discountedSubtotal: MoneyDto;
  serviceChargeAmount: MoneyDto;
  netTotal: MoneyDto;
  taxTotal: MoneyDto;
  grandTotal: MoneyDto;
}

export interface OrderCapacityWarningDto {
  capacity: number;
  attendeeCount: number;
}

export interface OrderLineResponse {
  id: string;
  position: number;
  catalog: OrderLineCatalogRefDto;
  displayName: string;
  sku: string | null;
  basePrice: MoneyDto;
  unitPrice: MoneyDto;
  options: OrderLineOptionDto[];
  quantity: number;
  wastedQuantity: number;
  chargeableQuantity: number;
  note: string | null;
  status: OrderLineStatus;
  preparingAtUtc: string | null;
  readyAtUtc: string | null;
  servedAtUtc: string | null;
  discount: OrderDiscountDto | null;
  termination: OrderTerminationDto | null;
  lineGross: MoneyDto;
  lineDiscountAmount: MoneyDto;
  orderDiscountShare: MoneyDto;
  lineNetOfDiscounts: MoneyDto;
  lineTotal: MoneyDto;
}

export interface OrderResponse {
  id: string;
  businessId: string;
  branchId: string | null;
  code: string;
  sourceCode: string;
  fulfilmentCode: string;
  resource: OrderResourceRefDto | null;
  visit: OrderVisitRefDto | null;
  attendeeCount: number | null;
  customer: OrderCustomerDto;
  deliveryAddress: string | null;
  customerNote: string | null;
  internalNote: string | null;
  tags: string[];
  placedByAccountId: string | null;
  placedAtUtc: string;
  acceptedAtUtc: string | null;
  completedAtUtc: string | null;
  currency: string;
  taxRatePercent: number;
  taxInclusive: boolean;
  serviceChargePercent: number;
  lines: OrderLineResponse[];
  discount: OrderDiscountDto | null;
  totals: OrderTotalsResponse;
  status: OrderAdminStatus;
  paymentState: OrderPaymentState;
  termination: OrderTerminationDto | null;
  capturedTotal: MoneyDto;
  gratuityTotal: MoneyDto;
  refundedTotal: MoneyDto;
  pendingRefundTotal: MoneyDto;
  balanceDue: MoneyDto;
  excessCaptured: MoneyDto;
  version: number;
  createdAtUtc: string;
  capacityWarning: OrderCapacityWarningDto | null;
}

/** One row of GET /orders (ListEnvelope). No lines — only a count. */
export interface OrderSummaryResponse {
  id: string;
  code: string;
  sourceCode: string;
  fulfilmentCode: string;
  resource: OrderResourceRefDto | null;
  customer: OrderCustomerDto;
  attendeeCount: number | null;
  lineCount: number;
  status: OrderAdminStatus;
  paymentState: OrderPaymentState;
  grandTotal: MoneyDto;
  balanceDue: MoneyDto;
  placedAtUtc: string;
  version: number;
}

/** Query of GET /orders. Array filters repeat the key (`statuses=New&statuses=Ready`).
 *  With no date the list defaults to today in the business's zone; every
 *  order still open appears whatever day is chosen. */
export interface ListOrdersParams {
  /** yyyy-MM-dd. */
  date?: string;
  fromUtc?: string;
  toUtc?: string;
  statuses?: readonly OrderAdminStatus[];
  paymentStates?: readonly OrderPaymentState[];
  sourceCodes?: readonly string[];
  fulfilmentCode?: string;
  branchId?: string;
  resourceId?: string;
  minAmount?: number;
  maxAmount?: number;
  minAttendees?: number;
  maxAttendees?: number;
  paymentKind?: string;
  search?: string;
  sort?: OrderListSort;
  sortDirection?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// ---- Orders: requests -----------------------------------------------------------

/** Backend `OrderLineRequest` — one line of a take-order / add-lines call.
 *  Prices are never sent: the server prices from the published catalog. */
export interface OrderLineRequest {
  catalogId: string;
  entryId: string;
  quantity: number;
  optionIds: string[] | null;
  note: string | null;
}

/** Backend `TakeOrderCommand`, bound WHOLE from the body (idempotent —
 *  Idempotency-Key required). `businessId` repeats the route's and must
 *  agree. Resource container/id are both set or both null; visit key/code
 *  likewise. `fulfilmentCode` matches ^[a-z][a-z0-9-]{1,30}$ and must be one
 *  every line's catalog entry offers. 201 + Location. */
export interface TakeOrderRequest {
  businessId: string;
  branchId: string | null;
  sourceCode: string;
  fulfilmentCode: string;
  resourceContainerId: string | null;
  resourceId: string | null;
  visitSourceKey: string | null;
  visitCode: string | null;
  attendeeCount: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerExternalRef: string | null;
  deliveryAddress: string | null;
  customerNote: string | null;
  internalNote: string | null;
  tags: string[] | null;
  lines: OrderLineRequest[];
}

/** PATCH /{orderId} — replaces every one of these fields (tags null ⇒ none). */
export interface UpdateOrderDetailsRequest {
  attendeeCount: number | null;
  deliveryAddress: string | null;
  customerNote: string | null;
  internalNote: string | null;
  tags: string[] | null;
  expectedVersion: number;
}

/** PUT /{orderId}/contact — backend `UpdateOrderContactRequest`, flat (no
 *  nested `contact`). Replaces all four fields. */
export interface UpdateOrderContactRequest {
  name: string | null;
  phone: string | null;
  email: string | null;
  externalRef: string | null;
  expectedVersion: number;
}

/** POST /{orderId}/transfer — backend `TransferOrderResourceRequest`. Both
 *  ids null detaches the order from any place. */
export interface TransferOrderRequest {
  containerId: string | null;
  resourceId: string | null;
  expectedVersion: number;
}

/** GET /{orderId}/duplicate — `UnavailableLineDto`. */
export interface OrderUnavailableLineDto {
  entryId: string;
  displayName: string;
  reason: string;
}

/** GET /{orderId}/duplicate — backend `OrderDuplicateResponse`. Writes
 *  nothing; lines that can no longer be sold are listed separately and left
 *  out of `lines`. Prices are never carried. */
export interface DuplicateOrderTemplateResponse {
  branchId: string | null;
  sourceCode: string;
  fulfilmentCode: string;
  attendeeCount: number | null;
  customer: OrderCustomerDto;
  lines: OrderLineRequest[];
  unavailableLines: OrderUnavailableLineDto[];
}

/** GET /{orderId}/activity (ListEnvelope, newest first). `changeSummary`
 *  never carries personal data. */
export interface OrderActivityEntryResponse {
  id: string;
  subjectType: string;
  subjectId: string;
  action: string;
  actorAccountId: string | null;
  actorDisplay: string | null;
  occurredAtUtc: string;
  changeSummary: Record<string, unknown>;
}

// ---- Lines ----------------------------------------------------------------------

/** POST /{orderId}/lines — backend `AddOrderLinesCommand`, bound whole from
 *  the body (idempotent — Idempotency-Key required); both route ids repeat
 *  here. One bad line refuses the whole request. 200. */
export interface AddOrderLinesRequest {
  businessId: string;
  orderId: string;
  lines: OrderLineRequest[];
  expectedVersion: number;
}

/** PATCH /{orderId}/lines/{lineId}. `optionIds` is the FULL new selection —
 *  null means "no options", not "unchanged". */
export interface UpdateOrderLineRequest {
  quantity: number;
  optionIds: string[] | null;
  note: string | null;
  expectedVersion: number;
}

export type RemoveOrderLineRequest = OrderExpectedVersionRequest;

/** POST /{orderId}/lines/{lineId}/status — backend `AdvanceOrderLineRequest`. */
export interface AdvanceLineStatusRequest {
  status: OrderLineTargetStatus;
  expectedVersion: number;
}

/** POST /{orderId}/lines/status — backend `AdvanceOrderLinesRequest`. No line
 *  ids: every live line that legally can make the move does; the rest are
 *  skipped. Fails only when nothing could move. */
export interface BulkAdvanceLineStatusRequest {
  status: OrderLineTargetStatus;
  expectedVersion: number;
}

// ---- Lifecycle --------------------------------------------------------------------

export type AcceptOrderRequest = OrderExpectedVersionRequest;
export type CompleteOrderRequest = OrderExpectedVersionRequest;

// ---- Reversals ----------------------------------------------------------------------

export interface CancelOrderRequest {
  reasonCode: string;
  note: string | null;
  approval: ApprovalDto | null;
  expectedVersion: number;
}

/** Cancel and void of specific lines share this shape server-side. */
export interface OrderLinesReversalRequest {
  lineIds: string[];
  reasonCode: string;
  note: string | null;
  approval: ApprovalDto | null;
  expectedVersion: number;
}

export type CancelOrderLinesRequest = OrderLinesReversalRequest;

export interface VoidOrderRequest {
  reasonCode: string;
  note: string | null;
  approval: ApprovalDto | null;
  expectedVersion: number;
}

export type VoidOrderLinesRequest = OrderLinesReversalRequest;

/** What every cancel/void/wastage call returns. */
export interface ReversalOutcomeResponse {
  order: OrderResponse;
  refunds: RefundResponse[];
}

// ---- Discounts ----------------------------------------------------------------------

/** Backend `ApplyDiscountRequest` — the same body for the order and a line.
 *  `value` is a percentage (0–100) for Percent and a major-unit amount for
 *  Amount. */
export interface ApplyDiscountRequest {
  kind: OrderDiscountKind;
  value: number;
  reasonCode: string;
  note: string | null;
  approval: ApprovalDto | null;
  expectedVersion: number;
}

export type ApplyOrderDiscountRequest = ApplyDiscountRequest;
export type ApplyLineDiscountRequest = ApplyDiscountRequest;
/** Removing a discount needs no approval — body is just the version. */
export type RemoveOrderDiscountRequest = OrderExpectedVersionRequest;
export type RemoveLineDiscountRequest = OrderExpectedVersionRequest;

// ---- Wastage ----------------------------------------------------------------------

export interface RecordWastageRequest {
  lineId: string;
  quantity: number;
  cost: number | null;
  reasonCode: string;
  note: string | null;
  approval: ApprovalDto | null;
  expectedVersion: number;
}

/** GET /{orderId}/wastage — a BARE ARRAY of these, oldest first. */
export interface WastageResponse {
  id: string;
  orderLineId: string;
  quantity: number;
  saleValue: MoneyDto;
  cost: MoneyDto | null;
  reasonCode: string;
  reducesCharge: boolean;
  recordedAtUtc: string;
}

// ---- Payments -----------------------------------------------------------------------

export interface PaymentResponse {
  id: string;
  orderId: string;
  /** Response casing: "Cash" | "CardPresent" | "OnlineLink". */
  kind: string;
  /** "Pending" | "Captured" | "Failed" | "Expired" | "Cancelled". */
  state: string;
  amount: MoneyDto;
  gratuity: MoneyDto;
  reference: string | null;
  linkUrl: string | null;
  linkExpiresAtUtc: string | null;
  capturedAtUtc: string | null;
  failureCode: string | null;
  createdAtUtc: string;
}

export interface PaymentOutcomeResponse {
  payment: PaymentResponse;
  order: OrderResponse;
}

/** Backend `RecordTenderCommand`, bound whole (idempotent). */
export interface RecordTenderRequest {
  businessId: string;
  orderId: string;
  /** Request casing: "cash" | "card-present". */
  kind: string;
  amount: number;
  gratuity: number;
  reference: string | null;
  expectedVersion: number;
}

/** Backend `CreatePaymentLinkCommand`, bound whole (idempotent). `amount`
 *  null ⇒ the balance due. Needs `order:online-payments`; an unreachable
 *  provider answers 502. */
export interface CreatePaymentLinkRequest {
  businessId: string;
  orderId: string;
  amount: number | null;
  gratuity: number;
  expectedVersion: number;
}

// ---- Refunds ------------------------------------------------------------------------

export interface RefundResponse {
  id: string;
  orderId: string;
  paymentId: string;
  paymentKind: string;
  /** "Pending" | "Succeeded" | "Failed". */
  state: string;
  trigger: string;
  amount: MoneyDto;
  gratuityAmount: MoneyDto;
  reasonCode: string;
  approvedByAccountId: string | null;
  failureCode: string | null;
  retryOfRefundId: string | null;
  createdAtUtc: string;
  settledAtUtc: string | null;
}

/** Give `amount` or `lineIds`, never both. Not idempotent. 201. */
export interface IssueRefundRequest {
  paymentId: string;
  amount: number | null;
  lineIds: string[] | null;
  reasonCode: string;
  note: string | null;
  approval: ApprovalDto | null;
  expectedVersion: number;
}

/** Only the latest attempt of a failed refund is retryable. 201 with a new
 *  refund naming the failed one in `retryOfRefundId`. */
export interface RetryRefundRequest {
  approval: ApprovalDto | null;
  expectedVersion: number;
}

// ---- Receipt ------------------------------------------------------------------------

/** Backend `SendReceiptCommand`, bound whole (idempotent). `email` null ⇒ the
 *  customer's own; with neither, 422 order.receipt.recipient-required. Only
 *  for a completed or paid order (409 order.receipt.not-ready). */
export interface SendReceiptRequest {
  businessId: string;
  orderId: string;
  email: string | null;
  expectedVersion: number;
}

/** 202. */
export interface ReceiptRequestResponse {
  receiptDeliveryId: string;
  status: string;
  version: number;
}

// ---- Settings -----------------------------------------------------------------------

/** GET/PUT /settings. `version` is 0 until the business first saves. */
export interface OrderSettingsResponse {
  taxRatePercent: number;
  taxInclusive: boolean;
  serviceChargePercent: number;
  timeZoneId: string;
  requireApprovalForVoid: boolean;
  requireApprovalForCancel: boolean;
  requireApprovalForWastage: boolean;
  discountWithoutApprovalUpTo: number;
  refundWithoutApprovalUpTo: number;
  refundWindowDays: number;
  paymentLinkLifetimeHours: number;
  receiptTemplateKey: string;
  cancelReasonCodes: string[];
  voidReasonCodes: string[];
  refundReasonCodes: string[];
  wastageReasonCodes: string[];
  discountReasonCodes: string[];
  version: number;
}

/** PUT /settings — the whole document (not a patch). The first write sends
 *  expectedVersion 0. */
export interface UpdateOrderSettingsRequest {
  taxRatePercent: number;
  taxInclusive: boolean;
  serviceChargePercent: number;
  timeZoneId: string;
  requireApprovalForVoid: boolean;
  requireApprovalForCancel: boolean;
  requireApprovalForWastage: boolean;
  discountWithoutApprovalUpTo: number;
  refundWithoutApprovalUpTo: number;
  refundWindowDays: number;
  paymentLinkLifetimeHours: number;
  receiptTemplateKey: string;
  cancelReasonCodes: string[];
  voidReasonCodes: string[];
  refundReasonCodes: string[];
  wastageReasonCodes: string[];
  discountReasonCodes: string[];
  expectedVersion: number;
}

/** GET /settings/sources — a BARE ARRAY of these. */
export interface OrderSourceResponse {
  code: string;
  displayName: string;
  autoAccept: boolean;
  isEnabled: boolean;
  /** A platform channel: may only be switched off / have autoAccept changed. */
  isSeeded: boolean;
  sortOrder: number;
}

export interface UpdateOrderSourceDto {
  code: string;
  displayName: string;
  autoAccept: boolean;
  isEnabled: boolean;
  sortOrder: number;
}

/** PUT /settings/sources. Channels share the settings version. Returns the
 *  full list (bare array). */
export interface UpdateOrderSourcesRequest {
  sources: UpdateOrderSourceDto[];
  expectedVersion: number;
}

// ---- Sellable catalog ----------------------------------------------------------------

/** GET /catalog — a BARE ARRAY of these. A catalog that cannot be sold from
 *  now comes back with isSellableNow false and a reason. */
export interface SellableCatalogSummaryResponse {
  catalogId: string;
  publicationId: string;
  version: number;
  displayName: string;
  isSellableNow: boolean;
  notSellableReason: string | null;
}

export interface SellableOptionResponse {
  optionId: string;
  name: string;
  effectKind: string;
  amount: number | null;
  isDefault: boolean;
  isAvailableNow: boolean;
}

export interface SellableOptionGroupResponse {
  groupId: string;
  prompt: string;
  multiple: boolean;
  minSelected: number;
  maxSelected: number | null;
  options: SellableOptionResponse[];
}

export interface SellableEntryResponse {
  entryId: string;
  name: string;
  shortName: string | null;
  sku: string | null;
  /** Major units, the catalog's currency. */
  unitPrice: number | null;
  fulfilmentCodes: string[];
  allFulfilment: boolean;
  optionGroupIds: string[];
  isAvailableNow: boolean;
}

/** GET /catalog/{catalogId}. 404 order.catalog.not-sellable with a reason
 *  when it cannot be sold from. */
export interface SellableCatalogResponse {
  catalogId: string;
  publicationId: string;
  version: number;
  displayName: string;
  currency: string;
  minorUnits: number;
  taxStatus: string;
  taxRatePercent: number | null;
  entries: SellableEntryResponse[];
  optionGroups: SellableOptionGroupResponse[];
}

// ---- Summary --------------------------------------------------------------------------

/** Backend `DayFigureDto`. */
export interface OrderDayCounterDto {
  value: number;
  previous: number;
  changePercent: number | null;
}

export interface OrderDaySummaryResponse {
  date: string;
  timeZoneId: string;
  currency: string | null;
  totalOrders: OrderDayCounterDto;
  grossSales: OrderDayCounterDto;
  netSales: OrderDayCounterDto;
  openOrders: OrderDayCounterDto;
  completedOrders: OrderDayCounterDto;
  cancelledOrders: OrderDayCounterDto;
  voidedOrders: OrderDayCounterDto;
  averageOrderValue: OrderDayCounterDto;
}
