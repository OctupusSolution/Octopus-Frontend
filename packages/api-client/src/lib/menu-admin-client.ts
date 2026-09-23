// Real client for the Menu module's AdminApi endpoints (87 routes) —
// `/v1/businesses/{businessId}/menu/...`. See
// E:\Octupus\octopus-backend\src\Modules\Menu\Octopus.Modules.Menu.Api for
// the source of truth (MenuApiConstants.cs has every route string).
//
// CRITICAL: every endpoint here — GETs included — currently 403s for any
// real account. See the banner in ../contracts/menu-admin.ts and
// FRONTEND_INTEGRATION_GAPS.md 4.1.
//
// Idempotency-Key is required on exactly these calls (all "create a new
// resource with an id" POSTs): createMenu, duplicateMenu, createSection,
// createCatalogItem, duplicateCatalogItem, createLabel, createModifierGroup,
// createOffer, duplicateOffer, createAccessCode, regenerateAccessCode,
// publishMenu, republishVersion, executePriceAdjustment,
// executeTextReplacement. Every other write is a plain PUT/POST/DELETE with
// no idempotency requirement — see menu-admin.ts's per-request doc comments.
import type {
  AccessCodeImageFormat,
  AccessCodeResponse,
  AvailabilityTimelineResponse,
  CatalogItemSummaryResponse,
  LabelKind,
  MenuPreviewResponse,
  BranchProfileResponse,
  CatalogItemResponse,
  CatalogSettingsResponse,
  CompleteMediaUploadRequest,
  CreateAccessCodeRequest,
  CreateCatalogItemRequest,
  CreateLabelRequest,
  CreateMenuRequest,
  CreateModifierGroupRequest,
  CreateOfferRequest,
  CreateSectionRequest,
  DuplicateCatalogItemRequest,
  DuplicateMenuRequest,
  DuplicateOfferRequest,
  ExecutePriceAdjustmentRequest,
  ExecuteTextReplacementRequest,
  FactTypeResponse,
  LabelResponse,
  ListEnvelope,
  MediaAssetResponse,
  MediaUploadTicketResponse,
  MenuAvailabilityResponse,
  MenuResponse,
  MenuSummaryResponse,
  MenuThemeDto,
  MenuVersionResponse,
  MenuVersionSummaryResponse,
  ModifierGroupResponse,
  ModifierGroupSummaryResponse,
  MovePlacementRequest,
  OfferPriceQuoteResponse,
  OfferResponse,
  OfferSummaryResponse,
  PlaceEntriesRequest,
  PlaceItemInSectionsRequest,
  PriceAdjustmentPreviewResponse,
  PriceAdjustmentResultResponse,
  PreviewPriceAdjustmentRequest,
  PreviewTextReplacementRequest,
  PublishMenuRequest,
  PublishResultResponse,
  QuoteOfferPriceRequest,
  RepublishVersionRequest,
  RequestMediaUploadRequest,
  ReorderModifierOptionsRequest,
  ReorderPlacementsRequest,
  ReorderSectionsRequest,
  AddModifierOptionRequest,
  SaveBuilderProgressRequest,
  SchedulePresetResponse,
  SectionResponse,
  SectionSummaryResponse,
  SetItemAvailabilityRequest,
  SetItemModifierGroupsRequest,
  SetItemScheduleRequest,
  SetMenuAvailabilityRequest,
  SetOfferActiveRequest,
  SetOptionAvailabilityRequest,
  OfferSlugAvailabilityResponse,
  TextReplacementPreviewResponse,
  TextReplacementResultResponse,
  ThemePresetsResponse,
  BulkOperationSummaryResponse,
  UpdateCatalogItemRequest,
  UpdateCatalogSettingsRequest,
  UpdateLabelRequest,
  UpdateMenuDetailsRequest,
  UpdateMenuThemeRequest,
  UpdateModifierGroupRequest,
  UpdateModifierOptionRequest,
  UpdateOfferRequest,
  UpdateSectionRequest,
  UpsertBranchProfileRequest,
  ValidationReportResponse,
} from "../contracts/menu-admin";
import { apiRequest } from "./http";

const base = (businessId: string) => `/v1/businesses/${businessId}/menu`;

// ---- Settings + Branches ---------------------------------------------------

export function getCatalogSettings(businessId: string): Promise<CatalogSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings`);
}

export function updateCatalogSettings(
  businessId: string,
  request: UpdateCatalogSettingsRequest
): Promise<CatalogSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings`, { method: "PUT", body: request });
}

export function listBranchProfiles(
  businessId: string,
  page?: number,
  pageSize?: number
): Promise<ListEnvelope<BranchProfileResponse>> {
  return apiRequest(`${base(businessId)}/branches`, {
    query: { page: page?.toString(), pageSize: pageSize?.toString() },
  });
}

export function upsertBranchProfile(
  businessId: string,
  branchId: string,
  request: UpsertBranchProfileRequest
): Promise<BranchProfileResponse> {
  return apiRequest(`${base(businessId)}/branches/${branchId}`, { method: "PUT", body: request });
}

// ---- Menus ------------------------------------------------------------------

export function listMenus(
  businessId: string,
  params: { search?: string; includeArchived?: boolean; channel?: string; branchId?: string; page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<MenuSummaryResponse>> {
  return apiRequest(`${base(businessId)}/menus`, {
    query: {
      search: params.search,
      includeArchived: params.includeArchived?.toString(),
      channel: params.channel,
      branchId: params.branchId,
      page: params.page?.toString(),
      pageSize: params.pageSize?.toString(),
    },
  });
}

export function createMenu(businessId: string, request: CreateMenuRequest, idempotencyKey: string): Promise<MenuResponse> {
  return apiRequest(`${base(businessId)}/menus`, { method: "POST", body: request, idempotencyKey });
}

export function getMenu(businessId: string, menuId: string): Promise<MenuResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}`);
}

export function updateMenuDetails(businessId: string, menuId: string, request: UpdateMenuDetailsRequest): Promise<MenuResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}`, { method: "PUT", body: request });
}

export function deleteMenu(
  businessId: string,
  menuId: string,
  params: { expectedVersion?: number; revokeAccessCodes?: boolean } = {}
): Promise<void> {
  return apiRequest(`${base(businessId)}/menus/${menuId}`, {
    method: "DELETE",
    query: { expectedVersion: params.expectedVersion?.toString(), revokeAccessCodes: params.revokeAccessCodes?.toString() },
  });
}

export function duplicateMenu(
  businessId: string,
  menuId: string,
  request: DuplicateMenuRequest,
  idempotencyKey: string
): Promise<MenuResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/duplicate`, { method: "POST", body: request, idempotencyKey });
}

export function archiveMenu(businessId: string, menuId: string, expectedVersion?: number): Promise<MenuResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/archive`, { method: "POST", body: { expectedVersion } });
}

export function restoreMenu(businessId: string, menuId: string, expectedVersion?: number): Promise<MenuResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/restore`, { method: "POST", body: { expectedVersion } });
}

export function saveBuilderProgress(
  businessId: string,
  menuId: string,
  request: SaveBuilderProgressRequest
): Promise<MenuResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/builder-progress`, { method: "PUT", body: request });
}

/** The same shape the customer-facing public read serves, rendered from the
 *  draft. `branchId`/`channel`/`at` are accepted but filter nothing yet. */
export function previewMenuDraft(
  businessId: string,
  menuId: string,
  params: { branchId?: string; channel?: string; at?: string; lang?: string } = {}
): Promise<MenuPreviewResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/preview`, { query: params });
}

// ---- Availability -----------------------------------------------------------

export function getMenuAvailability(businessId: string, menuId: string): Promise<MenuAvailabilityResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/availability`);
}

export function setMenuAvailability(
  businessId: string,
  menuId: string,
  request: SetMenuAvailabilityRequest
): Promise<MenuAvailabilityResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/availability`, { method: "PUT", body: request });
}

/** `from`/`to` are REQUIRED DateOnly strings (`yyyy-MM-dd`, to >= from). */
export function previewAvailabilityTimeline(
  businessId: string,
  menuId: string,
  params: { from: string; to: string; branchId?: string }
): Promise<AvailabilityTimelineResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/availability/timeline`, { query: params });
}

export function listSchedulePresets(businessId: string): Promise<SchedulePresetResponse[]> {
  return apiRequest(`${base(businessId)}/schedule-presets`);
}

export function holdMenu(businessId: string, menuId: string): Promise<MenuResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/hold`, { method: "POST" });
}

export function releaseMenuHold(businessId: string, menuId: string): Promise<MenuResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/release-hold`, { method: "POST" });
}

// ---- Sections & placements ----------------------------------------------------

export function listSections(
  businessId: string,
  menuId: string,
  includeArchived?: boolean
): Promise<ListEnvelope<SectionSummaryResponse>> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/sections`, { query: { includeArchived: includeArchived?.toString() } });
}

export function createSection(
  businessId: string,
  menuId: string,
  request: CreateSectionRequest,
  idempotencyKey: string
): Promise<SectionResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/sections`, { method: "POST", body: request, idempotencyKey });
}

/** The route is nested under `/menus/{menuId}/sections/{sectionId}`, but the
 *  handler resolves the section purely by id — `menuId` is only path shape,
 *  never re-validated against it server-side (see MENU_INTEGRATION_NOTES.md). */
export function updateSection(
  businessId: string,
  menuId: string,
  sectionId: string,
  request: UpdateSectionRequest
): Promise<SectionResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/sections/${sectionId}`, { method: "PUT", body: request });
}

export function archiveSection(businessId: string, menuId: string, sectionId: string, expectedVersion?: number): Promise<SectionResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/sections/${sectionId}/archive`, { method: "POST", body: { expectedVersion } });
}

export function deleteSection(businessId: string, menuId: string, sectionId: string, expectedVersion?: number): Promise<void> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/sections/${sectionId}`, {
    method: "DELETE",
    query: { expectedVersion: expectedVersion?.toString() },
  });
}

export function reorderSections(businessId: string, menuId: string, request: ReorderSectionsRequest): Promise<void> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/sections/order`, { method: "PUT", body: request });
}

export function placeSectionEntries(
  businessId: string,
  menuId: string,
  sectionId: string,
  request: PlaceEntriesRequest
): Promise<SectionResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/sections/${sectionId}/placements`, { method: "POST", body: request });
}

export function placeItemInSections(
  businessId: string,
  itemId: string,
  request: PlaceItemInSectionsRequest
): Promise<void> {
  return apiRequest(`${base(businessId)}/items/${itemId}/placements`, { method: "POST", body: request });
}

export function removePlacement(
  businessId: string,
  menuId: string,
  sectionId: string,
  placementId: string,
  expectedVersion?: number
): Promise<SectionResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/sections/${sectionId}/placements/${placementId}`, {
    method: "DELETE",
    query: { expectedVersion: expectedVersion?.toString() },
  });
}

export function reorderPlacements(
  businessId: string,
  menuId: string,
  sectionId: string,
  request: ReorderPlacementsRequest
): Promise<SectionResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/sections/${sectionId}/placements/order`, { method: "PUT", body: request });
}

/** `menuId` is path shape only — the server never binds it. */
export function movePlacement(businessId: string, menuId: string, request: MovePlacementRequest): Promise<void> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/placements/move`, { method: "POST", body: request });
}

// ---- Catalog items, labels, facts ---------------------------------------------

export function listCatalogItems(
  businessId: string,
  params: { search?: string; status?: "Draft" | "Active"; tag?: string; unplaced?: boolean; page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<CatalogItemSummaryResponse>> {
  return apiRequest(`${base(businessId)}/items`, {
    query: {
      search: params.search,
      status: params.status,
      tag: params.tag,
      unplaced: params.unplaced?.toString(),
      page: params.page?.toString(),
      pageSize: params.pageSize?.toString(),
    },
  });
}

export function createCatalogItem(
  businessId: string,
  request: CreateCatalogItemRequest,
  idempotencyKey: string
): Promise<CatalogItemResponse> {
  return apiRequest(`${base(businessId)}/items`, { method: "POST", body: request, idempotencyKey });
}

export function getCatalogItem(businessId: string, itemId: string): Promise<CatalogItemResponse> {
  return apiRequest(`${base(businessId)}/items/${itemId}`);
}

export function updateCatalogItem(businessId: string, itemId: string, request: UpdateCatalogItemRequest): Promise<CatalogItemResponse> {
  return apiRequest(`${base(businessId)}/items/${itemId}`, { method: "PUT", body: request });
}

export function setItemSchedule(businessId: string, itemId: string, request: SetItemScheduleRequest): Promise<CatalogItemResponse> {
  return apiRequest(`${base(businessId)}/items/${itemId}/schedule`, { method: "PUT", body: request });
}

/** Operational/live — reaches published menus immediately. */
export function setItemAvailability(
  businessId: string,
  itemId: string,
  request: SetItemAvailabilityRequest
): Promise<CatalogItemResponse> {
  return apiRequest(`${base(businessId)}/items/${itemId}/availability`, { method: "POST", body: request });
}

export function setItemModifierGroups(
  businessId: string,
  itemId: string,
  request: SetItemModifierGroupsRequest
): Promise<CatalogItemResponse> {
  return apiRequest(`${base(businessId)}/items/${itemId}/modifier-groups`, { method: "PUT", body: request });
}

export function duplicateCatalogItem(
  businessId: string,
  itemId: string,
  request: DuplicateCatalogItemRequest,
  idempotencyKey: string
): Promise<CatalogItemResponse> {
  return apiRequest(`${base(businessId)}/items/${itemId}/duplicate`, { method: "POST", body: request, idempotencyKey });
}

/** 409 `menu.item.placed-in-sections` unless `removeFromSections`; 409
 *  `menu.item.in-use-by-offer` regardless. 200, empty body. */
export function deleteCatalogItem(
  businessId: string,
  itemId: string,
  params: { removeFromSections?: boolean; expectedVersion?: number } = {}
): Promise<void> {
  return apiRequest(`${base(businessId)}/items/${itemId}`, {
    method: "DELETE",
    query: { removeFromSections: params.removeFromSections?.toString(), expectedVersion: params.expectedVersion?.toString() },
  });
}

export function listLabels(
  businessId: string,
  params: { kind?: LabelKind; page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<LabelResponse>> {
  return apiRequest(`${base(businessId)}/labels`, {
    query: { kind: params.kind, page: params.page?.toString(), pageSize: params.pageSize?.toString() },
  });
}

export function createLabel(businessId: string, request: CreateLabelRequest, idempotencyKey: string): Promise<LabelResponse> {
  return apiRequest(`${base(businessId)}/labels`, { method: "POST", body: request, idempotencyKey });
}

export function updateLabel(businessId: string, labelId: string, request: UpdateLabelRequest): Promise<LabelResponse> {
  return apiRequest(`${base(businessId)}/labels/${labelId}`, { method: "PUT", body: request });
}

export function deleteLabel(businessId: string, labelId: string): Promise<void> {
  return apiRequest(`${base(businessId)}/labels/${labelId}`, { method: "DELETE" });
}

/** Bare array, not ListEnvelope — platform config, unpaged. */
export function listFactTypes(businessId: string): Promise<FactTypeResponse[]> {
  return apiRequest(`${base(businessId)}/facts`);
}

// ---- Modifier groups & options -------------------------------------------------

export function listModifierGroups(businessId: string): Promise<ListEnvelope<ModifierGroupSummaryResponse>> {
  return apiRequest(`${base(businessId)}/modifier-groups`);
}

export function createModifierGroup(
  businessId: string,
  request: CreateModifierGroupRequest,
  idempotencyKey: string
): Promise<ModifierGroupResponse> {
  return apiRequest(`${base(businessId)}/modifier-groups`, { method: "POST", body: request, idempotencyKey });
}

export function getModifierGroup(businessId: string, groupId: string): Promise<ModifierGroupResponse> {
  return apiRequest(`${base(businessId)}/modifier-groups/${groupId}`);
}

export function updateModifierGroup(
  businessId: string,
  groupId: string,
  request: UpdateModifierGroupRequest
): Promise<ModifierGroupResponse> {
  return apiRequest(`${base(businessId)}/modifier-groups/${groupId}`, { method: "PUT", body: request });
}

/** `expectedVersion` is compared against the group's `contentVersion`. 409
 *  `menu.modifier.in-use` unless `detachFromItems`. 200, empty body. */
export function deleteModifierGroup(
  businessId: string,
  groupId: string,
  params: { detachFromItems?: boolean; expectedVersion?: number } = {}
): Promise<void> {
  return apiRequest(`${base(businessId)}/modifier-groups/${groupId}`, {
    method: "DELETE",
    query: { detachFromItems: params.detachFromItems?.toString(), expectedVersion: params.expectedVersion?.toString() },
  });
}

export function addModifierOption(
  businessId: string,
  groupId: string,
  request: AddModifierOptionRequest
): Promise<ModifierGroupResponse> {
  return apiRequest(`${base(businessId)}/modifier-groups/${groupId}/options`, { method: "POST", body: request });
}

export function updateModifierOption(
  businessId: string,
  groupId: string,
  optionId: string,
  request: UpdateModifierOptionRequest
): Promise<ModifierGroupResponse> {
  return apiRequest(`${base(businessId)}/modifier-groups/${groupId}/options/${optionId}`, { method: "PUT", body: request });
}

export function removeModifierOption(
  businessId: string,
  groupId: string,
  optionId: string,
  expectedVersion?: number
): Promise<ModifierGroupResponse> {
  return apiRequest(`${base(businessId)}/modifier-groups/${groupId}/options/${optionId}`, {
    method: "DELETE",
    query: { expectedVersion: expectedVersion?.toString() },
  });
}

export function reorderModifierOptions(
  businessId: string,
  groupId: string,
  request: ReorderModifierOptionsRequest
): Promise<ModifierGroupResponse> {
  return apiRequest(`${base(businessId)}/modifier-groups/${groupId}/options/order`, { method: "PUT", body: request });
}

/** Operational/live — reaches published menus immediately. */
export function setOptionAvailability(
  businessId: string,
  groupId: string,
  optionId: string,
  request: SetOptionAvailabilityRequest
): Promise<ModifierGroupResponse> {
  return apiRequest(`${base(businessId)}/modifier-groups/${groupId}/options/${optionId}/availability`, {
    method: "POST",
    body: request,
  });
}

// ---- Offers -------------------------------------------------------------------

/** Unpaged. 409 `menu.settings.not-initialized` before catalog settings exist
 *  (as does quoteOfferPrice). */
export function listOffers(businessId: string): Promise<ListEnvelope<OfferSummaryResponse>> {
  return apiRequest(`${base(businessId)}/offers`);
}

export function createOffer(businessId: string, request: CreateOfferRequest, idempotencyKey: string): Promise<OfferResponse> {
  return apiRequest(`${base(businessId)}/offers`, { method: "POST", body: request, idempotencyKey });
}

export function getOffer(businessId: string, offerId: string): Promise<OfferResponse> {
  return apiRequest(`${base(businessId)}/offers/${offerId}`);
}

export function updateOffer(businessId: string, offerId: string, request: UpdateOfferRequest): Promise<OfferResponse> {
  return apiRequest(`${base(businessId)}/offers/${offerId}`, { method: "PUT", body: request });
}

export function deleteOffer(
  businessId: string,
  offerId: string,
  params: { removeFromSections?: boolean; expectedVersion?: number } = {}
): Promise<void> {
  return apiRequest(`${base(businessId)}/offers/${offerId}`, {
    method: "DELETE",
    query: { removeFromSections: params.removeFromSections?.toString(), expectedVersion: params.expectedVersion?.toString() },
  });
}

/** Route is `/offers/{id}/active` — NOT `/activation` (spec/code mismatch,
 *  see FRONTEND_INTEGRATION_GAPS.md 4.2; the code is authoritative). */
export function setOfferActive(businessId: string, offerId: string, request: SetOfferActiveRequest): Promise<OfferResponse> {
  return apiRequest(`${base(businessId)}/offers/${offerId}/active`, { method: "POST", body: request });
}

export function duplicateOffer(
  businessId: string,
  offerId: string,
  request: DuplicateOfferRequest,
  idempotencyKey: string
): Promise<OfferResponse> {
  return apiRequest(`${base(businessId)}/offers/${offerId}/duplicate`, { method: "POST", body: request, idempotencyKey });
}

export function checkOfferSlugAvailability(
  businessId: string,
  slug: string,
  excludingOfferId?: string
): Promise<OfferSlugAvailabilityResponse> {
  return apiRequest(`${base(businessId)}/offers/slug-availability`, { query: { slug, excludingOfferId } });
}

export function quoteOfferPrice(businessId: string, request: QuoteOfferPriceRequest): Promise<OfferPriceQuoteResponse> {
  return apiRequest(`${base(businessId)}/offers/price-quote`, { method: "POST", body: request });
}

// ---- Theme --------------------------------------------------------------------

export function getMenuTheme(businessId: string, menuId: string): Promise<MenuThemeDto> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/theme`);
}

export function updateMenuTheme(businessId: string, menuId: string, request: UpdateMenuThemeRequest): Promise<MenuThemeDto> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/theme`, { method: "PUT", body: request });
}

export function listThemePresets(businessId: string): Promise<ThemePresetsResponse> {
  return apiRequest(`${base(businessId)}/theme-presets`);
}

// ---- Publishing -----------------------------------------------------------------

export function getValidationReport(businessId: string, menuId: string): Promise<ValidationReportResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/validation-report`);
}

export function publishMenu(
  businessId: string,
  menuId: string,
  request: PublishMenuRequest,
  idempotencyKey: string
): Promise<PublishResultResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/publish`, { method: "POST", body: request, idempotencyKey });
}

export function unpublishMenu(businessId: string, menuId: string): Promise<MenuResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/unpublish`, { method: "POST" });
}

export function listMenuVersions(
  businessId: string,
  menuId: string,
  page?: number,
  pageSize?: number
): Promise<ListEnvelope<MenuVersionSummaryResponse>> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/versions`, {
    query: { page: page?.toString(), pageSize: pageSize?.toString() },
  });
}

export function getMenuVersion(businessId: string, menuId: string, version: number): Promise<MenuVersionResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/versions/${version}`);
}

export function republishVersion(
  businessId: string,
  menuId: string,
  version: number,
  request: RepublishVersionRequest,
  idempotencyKey: string
): Promise<PublishResultResponse> {
  return apiRequest(`${base(businessId)}/menus/${menuId}/versions/${version}/republish`, {
    method: "POST",
    body: request,
    idempotencyKey,
  });
}

// ---- Access codes (QR) -----------------------------------------------------------

export function listAccessCodes(businessId: string): Promise<ListEnvelope<AccessCodeResponse>> {
  return apiRequest(`${base(businessId)}/access-codes`);
}

export function createAccessCode(
  businessId: string,
  request: CreateAccessCodeRequest,
  idempotencyKey: string
): Promise<AccessCodeResponse> {
  return apiRequest(`${base(businessId)}/access-codes`, { method: "POST", body: request, idempotencyKey });
}

export function regenerateAccessCode(businessId: string, codeId: string, idempotencyKey: string): Promise<AccessCodeResponse> {
  return apiRequest(`${base(businessId)}/access-codes/${codeId}/regenerate`, { method: "POST", idempotencyKey });
}

export function revokeAccessCode(businessId: string, codeId: string): Promise<AccessCodeResponse> {
  return apiRequest(`${base(businessId)}/access-codes/${codeId}/revoke`, { method: "POST" });
}

/** Path (WITHOUT the configured basePath) of the QR image: raw PNG/SVG bytes
 *  with an ETag, not JSON. The route is NOT anonymous — the permission and
 *  `menu:access-codes` feature checks run in the pipeline, so a bare
 *  <img src> 403s; fetch it with the bearer token and use a blob URL.
 *  `format` is required (missing = 400), `size` is pixels per QR module
 *  (4–40, default 20), `label` an optional printed location note. Rate
 *  limited (429). */
export function accessCodeImageUrl(
  businessId: string,
  codeId: string,
  params: { format: AccessCodeImageFormat; size?: number; label?: string }
): string {
  const q = new URLSearchParams();
  q.set("format", params.format);
  if (params.size) q.set("size", String(params.size));
  if (params.label) q.set("label", params.label);
  const qs = q.toString();
  return `${base(businessId)}/access-codes/${codeId}/image${qs ? `?${qs}` : ""}`;
}

// ---- Media ------------------------------------------------------------------------

/** Returns signed Cloudinary upload params. POST the file to Cloudinary
 *  directly with these (not through this API), then call completeMediaUpload. */
export function requestMediaUpload(businessId: string, request: RequestMediaUploadRequest): Promise<MediaUploadTicketResponse> {
  return apiRequest(`${base(businessId)}/media-uploads`, { method: "POST", body: request });
}

export function completeMediaUpload(
  businessId: string,
  uploadId: string,
  request: CompleteMediaUploadRequest
): Promise<MediaAssetResponse> {
  return apiRequest(`${base(businessId)}/media-uploads/${uploadId}/complete`, { method: "POST", body: request });
}

export function getMediaAsset(businessId: string, assetId: string): Promise<MediaAssetResponse> {
  return apiRequest(`${base(businessId)}/media-assets/${assetId}`);
}

// ---- Bulk editing -----------------------------------------------------------------

export function previewPriceAdjustment(
  businessId: string,
  request: PreviewPriceAdjustmentRequest
): Promise<PriceAdjustmentPreviewResponse> {
  return apiRequest(`${base(businessId)}/price-adjustments/preview`, { method: "POST", body: request });
}

export function executePriceAdjustment(
  businessId: string,
  request: ExecutePriceAdjustmentRequest,
  idempotencyKey: string
): Promise<PriceAdjustmentResultResponse> {
  return apiRequest(`${base(businessId)}/price-adjustments`, { method: "POST", body: request, idempotencyKey });
}

export function previewTextReplacement(
  businessId: string,
  request: PreviewTextReplacementRequest
): Promise<TextReplacementPreviewResponse> {
  return apiRequest(`${base(businessId)}/text-replacements/preview`, { method: "POST", body: request });
}

export function executeTextReplacement(
  businessId: string,
  request: ExecuteTextReplacementRequest,
  idempotencyKey: string
): Promise<TextReplacementResultResponse> {
  return apiRequest(`${base(businessId)}/text-replacements`, { method: "POST", body: request, idempotencyKey });
}

export function listBulkOperations(
  businessId: string,
  page?: number,
  pageSize?: number
): Promise<ListEnvelope<BulkOperationSummaryResponse>> {
  return apiRequest(`${base(businessId)}/bulk-operations`, {
    query: { page: page?.toString(), pageSize: pageSize?.toString() },
  });
}
