// Real client for the Onboarding + Businesses modules' AdminApi endpoints.
// See E:\Octupus\octopus-backend\src\Modules\Onboarding\...\Api\Catalog\
// OnboardingCatalogEndpoints.cs, ...\Setups\BusinessSetupEndpoints.cs /
// CheckoutEndpoints.cs, and E:\Octupus\octopus-backend\src\Modules\
// Businesses\...\Api\Businesses\BusinessesEndpoints.cs.
import type {
  BusinessListResponse,
  BusinessResponse,
  BusinessSetupListResponse,
  BusinessSetupResponse,
  BusinessTypeListResponse,
  BusinessVariantListResponse,
  CheckoutRequest,
  QuotePreviewRequest,
  QuoteResponse,
  UpdateBusinessNameRequest,
  UpdateBusinessTypeRequest,
  UpdateBusinessVariantRequest,
  UpdateIntegrationAddOnsRequest,
  UpdateModulesRequest,
  VariantOfferingsResponse,
  SetupProblemExtensions,
} from "../contracts/setup";
import { OPEN_SETUP_STATUS_FILTER } from "../contracts/setup";
import { ApiError, apiRequest, type ProblemDetails } from "./http";

// ---- Onboarding catalog (read-only) ---------------------------------------

export function getBusinessTypes(): Promise<BusinessTypeListResponse> {
  return apiRequest<BusinessTypeListResponse>("/v1/onboarding/business-types");
}

export function getBusinessVariants(typeCode: string): Promise<BusinessVariantListResponse> {
  return apiRequest<BusinessVariantListResponse>(`/v1/onboarding/business-types/${typeCode}/variants`);
}

export function getVariantOfferings(variantCode: string): Promise<VariantOfferingsResponse> {
  return apiRequest<VariantOfferingsResponse>(`/v1/onboarding/variants/${variantCode}/offerings`);
}

export function quotePreview(request: QuotePreviewRequest): Promise<QuoteResponse> {
  return apiRequest<QuoteResponse>("/v1/onboarding/quote-previews", { method: "POST", body: request });
}

// ---- Business setups (the wizard's server-side draft) ---------------------

const setupBase = (setupId: string) => `/v1/business-setups/${setupId}`;

export function startBusinessSetup(): Promise<BusinessSetupResponse> {
  return apiRequest<BusinessSetupResponse>("/v1/business-setups", { method: "POST" });
}

/** The caller's unfinished (Draft / AwaitingPayment) setup — zero or one item.
 *  The backend requires `status=open` and 422s any other filter or none. */
export function listBusinessSetups(
  status: typeof OPEN_SETUP_STATUS_FILTER = OPEN_SETUP_STATUS_FILTER
): Promise<BusinessSetupListResponse> {
  return apiRequest<BusinessSetupListResponse>("/v1/business-setups", { query: { status } });
}

/** Reads the Onboarding problem+json extension members (`issues`, `quote`,
 *  `setupStatus`, ...) off an ApiError's problem body; the shared
 *  ProblemDetails type does not model per-module extensions. */
export function readSetupProblem(err: unknown): SetupProblemExtensions {
  if (!(err instanceof ApiError) || !err.problem) return {};
  return err.problem as ProblemDetails & SetupProblemExtensions;
}

export function getBusinessSetup(setupId: string): Promise<BusinessSetupResponse> {
  return apiRequest<BusinessSetupResponse>(setupBase(setupId));
}

export function setBusinessType(setupId: string, request: UpdateBusinessTypeRequest): Promise<BusinessSetupResponse> {
  return apiRequest<BusinessSetupResponse>(`${setupBase(setupId)}/business-type`, { method: "PUT", body: request });
}

export function setBusinessName(setupId: string, request: UpdateBusinessNameRequest): Promise<BusinessSetupResponse> {
  return apiRequest<BusinessSetupResponse>(`${setupBase(setupId)}/business-name`, { method: "PUT", body: request });
}

export function setBusinessVariant(setupId: string, request: UpdateBusinessVariantRequest): Promise<BusinessSetupResponse> {
  return apiRequest<BusinessSetupResponse>(`${setupBase(setupId)}/business-variant`, { method: "PUT", body: request });
}

export function setModules(setupId: string, request: UpdateModulesRequest): Promise<BusinessSetupResponse> {
  return apiRequest<BusinessSetupResponse>(`${setupBase(setupId)}/modules`, { method: "PUT", body: request });
}

export function setIntegrationAddOns(setupId: string, request: UpdateIntegrationAddOnsRequest): Promise<BusinessSetupResponse> {
  return apiRequest<BusinessSetupResponse>(`${setupBase(setupId)}/integration-add-ons`, { method: "PUT", body: request });
}

/** Allowed while Draft, or AwaitingPayment with a spent/under-review attempt
 *  (see `allowedActions`). Does NOT cancel a live provider checkout — that is
 *  cancelCheckout's job. Repeating is an unchanged 200. */
export function cancelBusinessSetup(setupId: string): Promise<BusinessSetupResponse> {
  return apiRequest<BusinessSetupResponse>(`${setupBase(setupId)}/cancel`, { method: "POST" });
}

export function checkout(setupId: string, request: CheckoutRequest): Promise<BusinessSetupResponse> {
  return apiRequest<BusinessSetupResponse>(`${setupBase(setupId)}/checkout`, { method: "POST", body: request });
}

/** No body — see identity/backend research: the Fake gateway (dev-only,
 *  Billing:Payments:Provider=Fake) just confirms whatever attempt is
 *  in flight for this setup. */
export function confirmCheckout(setupId: string): Promise<BusinessSetupResponse> {
  return apiRequest<BusinessSetupResponse>(`${setupBase(setupId)}/checkout/confirm`, { method: "POST" });
}

/** AwaitingPayment -> Draft. 409 onboarding.checkout.already-paid when the
 *  provider reports the attempt paid (the setup is then Paid — reload it);
 *  409 onboarding.checkout.not-in-progress when nothing is in flight. */
export function cancelCheckout(setupId: string): Promise<BusinessSetupResponse> {
  return apiRequest<BusinessSetupResponse>(`${setupBase(setupId)}/checkout/cancel`, { method: "POST" });
}

// ---- Businesses (read-only from here — creation happens via setup+checkout) ----

/** Works with either token (verified: a business token is accepted here), so
 *  the shared auto-refresh applies as for any other call. */
export function listBusinesses(): Promise<BusinessListResponse> {
  return apiRequest<BusinessListResponse>("/v1/businesses");
}

export function getBusiness(businessId: string): Promise<BusinessResponse> {
  return apiRequest<BusinessResponse>(`/v1/businesses/${businessId}`);
}
