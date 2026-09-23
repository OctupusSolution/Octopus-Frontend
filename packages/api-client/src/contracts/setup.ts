// Mirrors the Onboarding + Businesses modules' AdminApi contracts exactly —
// verified against the C# record definitions, not specs/*.md. See
// E:\Octupus\octopus-backend\src\Modules\Onboarding\...\Contracts\* and
// E:\Octupus\octopus-backend\src\Modules\Businesses\...\Contracts\*.
//
// IMPORTANT — read before wiring any UI to this: the backend's catalog
// (business types, variants, modules, integration categories/providers) is a
// small, different taxonomy — and a different SHAPE (integration add-ons are
// picked per category+provider, not as flat codes) — than this app's local
// catalog (apps/merchant/src/shared/catalog/*: 12 restaurant types / 12
// verticals / 14 flat modules from the Restaurants SRS). Building the wizard
// against this contract is a design task, not a mechanical mapping — see
// FRONTEND_INTEGRATION_GAPS.md "Setup catalog mismatch" before wiring any
// step UI to these types.

export interface LocalizedText {
  ar: string;
  en: string;
}

export interface BusinessTypeResponse {
  code: string;
  name: LocalizedText;
  description: LocalizedText | null;
  iconRef: string | null;
  sortOrder: number;
}

export interface BusinessTypeListResponse {
  items: BusinessTypeResponse[];
}

export interface BusinessVariantResponse {
  code: string;
  businessTypeCode: string;
  name: LocalizedText;
  description: LocalizedText | null;
  fitHint: LocalizedText | null;
  iconRef: string | null;
  sortOrder: number;
}

export interface BusinessVariantListResponse {
  items: BusinessVariantResponse[];
}

export interface ModuleOfferingResponse {
  moduleCode: string;
  name: LocalizedText;
  description: LocalizedText | null;
  iconRef: string | null;
  /** ModuleInclusion: "Mandatory" | "Optional". */
  inclusion: string;
  /** PricingMode: "Included" (amountMinor null) | "Priced". */
  pricingMode: string;
  amountMinor: number | null;
  requiredModuleCodes: string[];
  sortOrder: number;
}

export interface IntegrationAddOnOfferingResponse {
  providerCode: string;
  name: LocalizedText;
  description: LocalizedText | null;
  iconRef: string | null;
  pricingMode: string;
  amountMinor: number | null;
  requiredModuleCode: string | null;
  sortOrder: number;
}

export interface IntegrationCategoryOfferingResponse {
  categoryCode: string;
  name: LocalizedText;
  description: LocalizedText | null;
  iconRef: string | null;
  sortOrder: number;
  addOns: IntegrationAddOnOfferingResponse[];
}

export interface VariantOfferingsResponse {
  businessVariantCode: string;
  currency: string;
  billingPeriod: string;
  priceBookVersion: number;
  planAmountMinor: number;
  modules: ModuleOfferingResponse[];
  integrationCategories: IntegrationCategoryOfferingResponse[];
}

/** One category+provider pick — e.g. { categoryCode: "delivery-apps",
 *  providerCode: "jahez" }. NOT a flat code list. */
export interface AddOnSelection {
  categoryCode: string;
  providerCode: string;
}

export interface QuotePreviewRequest {
  businessVariantCode: string;
  moduleCodes: string[];
  addOns: AddOnSelection[];
}

export interface QuoteLineResponse {
  group: string;
  kind: string;
  itemCode: string;
  categoryCode: string | null;
  amountMinor: number;
  includedModuleCodes: string[];
}

export interface QuoteResponse {
  currency: string;
  billingPeriod: string;
  priceBookVersion: number;
  lines: QuoteLineResponse[];
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  taxTreatment: string;
  taxRateBasisPoints: number;
  effectiveModuleCodes: string[];
  /** Must be echoed back as CheckoutRequest.expectedQuoteFingerprint. */
  fingerprint: string;
}

export type BusinessSetupStatus = "Draft" | "AwaitingPayment" | "Paid" | "Completed" | "Cancelled";

/** Wire values of `allowedActions` (SetupAllowedActions.cs) — the UI enables
 *  controls from these, not from `status`. */
export type SetupAction = "EditSetup" | "Checkout" | "ConfirmPayment" | "CancelCheckout" | "CancelSetup" | "OpenBusiness";

/** Wire values of `nextStep` (SetupNextStep.cs). */
export type SetupNextStep = "BusinessProfile" | "Services" | "Modules" | "Integrations" | "Payment" | "GoLive";

/** The only filter GET /v1/business-setups accepts; anything else (including
 *  none) is 422 onboarding.setup.status-filter-invalid. */
export const OPEN_SETUP_STATUS_FILTER = "open";

/** A problem blocking pricing or payment. Same shape for a setup's `issues`
 *  and the quote preview's `issues` problem extension. There is no message —
 *  `code` is one of e.g. "business-type-unavailable",
 *  "business-variant-unavailable", "module-unavailable", "add-on-unavailable",
 *  "add-on-requires-module", "price-missing". */
export interface SetupIssueResponse {
  code: string;
  itemCode: string | null;
  categoryCode: string | null;
  providerCode: string | null;
}

/** Top-level problem+json extension members the Onboarding errors carry
 *  (OnboardingErrors.cs): `issues` on onboarding.quote.selection-invalid /
 *  onboarding.setup.has-issues, `quote` on onboarding.quote.changed,
 *  `setupStatus` on not-editable / checkout.not-in-progress, `payment` on
 *  checkout.in-progress, `missing` on setup.incomplete, `currentVersion` on
 *  setup.version-conflict. */
export interface SetupProblemExtensions {
  issues?: SetupIssueResponse[];
  quote?: QuoteResponse;
  setupStatus?: BusinessSetupStatus;
  payment?: SetupPaymentResponse;
  missing?: string[];
  currentVersion?: number;
}

export interface SetupPaymentResponse {
  paymentAttemptId: string;
  status: string;
  presentation: string | null;
  clientParameters: Record<string, string> | null;
  redirectUrl: string | null;
  expiresAtUtc: string | null;
}

export interface SetupProvisioningResponse {
  state: string;
  businessId: string | null;
}

export interface BusinessSetupResponse {
  setupId: string;
  status: BusinessSetupStatus;
  /** Echo back as `expectedVersion` on every write. */
  version: number;
  nextStep: SetupNextStep | null;
  businessName: string | null;
  businessTypeCode: string | null;
  businessVariantCode: string | null;
  selectedModuleCodes: string[];
  effectiveModuleCodes: string[];
  selectedAddOns: AddOnSelection[];
  issues: SetupIssueResponse[];
  quote: QuoteResponse | null;
  canCheckout: boolean;
  payment: SetupPaymentResponse | null;
  provisioning: SetupProvisioningResponse | null;
  allowedActions: SetupAction[];
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface BusinessSetupSummaryResponse {
  setupId: string;
  status: BusinessSetupStatus;
  businessName: string | null;
  nextStep: SetupNextStep | null;
  updatedAtUtc: string;
}

export interface BusinessSetupListResponse {
  items: BusinessSetupSummaryResponse[];
  truncated: boolean;
}

// expectedVersion is nullable on the step-write requests (backend accepts
// omitting it on the very first write to a fresh setup) but non-nullable and
// required on checkout.
export interface UpdateBusinessTypeRequest {
  expectedVersion: number | null;
  businessTypeCode: string | null;
}

export interface UpdateBusinessNameRequest {
  expectedVersion: number | null;
  businessName: string | null;
}

export interface UpdateBusinessVariantRequest {
  expectedVersion: number | null;
  businessVariantCode: string | null;
}

export interface UpdateModulesRequest {
  expectedVersion: number | null;
  moduleCodes: string[];
}

export interface UpdateIntegrationAddOnsRequest {
  expectedVersion: number | null;
  addOns: AddOnSelection[];
}

export interface CheckoutRequest {
  expectedVersion: number;
  expectedQuoteFingerprint: string | null;
}

export type BusinessStatus = "Provisioning" | "Active";

export interface BusinessAddOnResponse {
  categoryCode: string;
  providerCode: string;
}

export interface BusinessSummaryResponse {
  businessId: string;
  name: string;
  status: BusinessStatus;
  businessTypeCode: string;
  businessVariantCode: string;
  createdAtUtc: string;
  activatedAtUtc: string | null;
}

export interface BusinessListResponse {
  items: BusinessSummaryResponse[];
  truncated: boolean;
}

/** No response here carries a tenant id — see BusinessesEndpoints.cs. The
 *  tenant-scoped `octupus_tid` claim only appears after calling
 *  POST /auth/business-session with this businessId (identity-client.ts). */
export interface BusinessResponse {
  businessId: string;
  name: string;
  status: BusinessStatus;
  businessTypeCode: string;
  businessVariantCode: string;
  moduleCodes: string[];
  addOns: BusinessAddOnResponse[];
  billingPeriod: string;
  paidPeriodStartUtc: string;
  paidPeriodEndUtc: string;
  createdAtUtc: string;
  activatedAtUtc: string | null;
}
