// Mirrors the Menu module's AdminApi contracts (87 endpoints) — verified
// against the actual C# records in
// E:\Octupus\octopus-backend\src\Modules\Menu\Octopus.Modules.Menu.Contracts,
// not specs/*.md (which had already drifted for the offers routes — see
// MENU_INTEGRATION_NOTES.md).
//
// Named menu-admin.ts, not menu.ts: ./menu.ts already exists and is the
// customer storefront's unrelated local mock menu domain (MenuItem,
// MenuCategory, ...) — don't merge the two or re-add exports of this file
// under that name.
//
// CRITICAL: every endpoint in this module — reads included — goes through
// the same MediatR pipeline permission check (`IHasPermissionRequirement`,
// checked by `AccountPermissionProvider`), which currently returns no
// permissions for any real account. Until that's fixed, calling ANY function
// in menu-admin-client.ts with a real user's token 403s, including plain
// GETs. See FRONTEND_INTEGRATION_GAPS.md 4.1 and MENU_INTEGRATION_NOTES.md.

export interface LocalizedMap {
  [locale: string]: string;
}

export interface MoneyDto {
  amountMinor: number;
  currency: string;
}

export interface MediaReferenceDto {
  assetId: string;
  deliveryUrl: string;
}

export interface ChannelSelectionDto {
  all: boolean;
  codes: string[];
}

export interface WeeklyWindowDto {
  days: string[];
  start: string;
  end: string;
}

export interface AvailabilityScheduleDto {
  presetCode: string | null;
  windows: WeeklyWindowDto[];
  dateFrom: string | null;
  dateTo: string | null;
}

/** Shape observed on Menu's list endpoints — a BuildingBlocks.Web type shared
 *  across modules. Some endpoints (sections, offers, modifier groups,
 *  schedule-presets, facts) are explicitly documented as unpaged and may
 *  omit `metadata`'s paging fields — treat them as always present but
 *  possibly meaningless (e.g. totalCount === data.length) until confirmed
 *  live. `GET /facts` and `GET /schedule-presets` return a bare array
 *  instead of this envelope — see the client functions for those two. */
export interface ListEnvelope<T> {
  success: boolean;
  data: T[];
  error: unknown;
  metadata: { page: number; pageSize: number; totalCount: number } | null;
  correlationId: string;
  timestampUtc: string;
}

export interface ExpectedVersionRequest {
  expectedVersion: number | null;
}

// ---- Settings + Branches ---------------------------------------------------

export interface CatalogSettingsResponse {
  defaultLanguage: string;
  enabledLanguages: string[];
  salesChannels: ChannelSelectionDto;
  fulfillmentModes: ChannelSelectionDto;
  currency: string | null;
  currencyLocked: boolean;
  defaultTimeZoneId: string | null;
  requiredFactCodes: string[];
  factRequirementSeverity: string;
  version: number;
}

export interface UpdateCatalogSettingsRequest {
  defaultLanguage: string;
  enabledLanguages: string[];
  salesChannels: ChannelSelectionDto;
  fulfillmentModes: ChannelSelectionDto;
  currency: string | null;
  defaultTimeZoneId: string | null;
  requiredFactCodes: string[] | null;
  factRequirementSeverity: string | null;
  expectedVersion: number | null;
}

export interface BranchProfileResponse {
  branchId: string;
  timeZoneId: string;
}

export interface UpsertBranchProfileRequest {
  timeZoneId: string;
}

// ---- Menus ------------------------------------------------------------------

export interface BranchScopeDto {
  all: boolean;
  branchIds: string[];
}

export interface MenuThemeDto {
  presetCode: string | null;
  logo: MediaReferenceDto | null;
  hero: MediaReferenceDto | null;
  heroText: LocalizedMap;
  heroSubtext: LocalizedMap;
  titleFontCode: string | null;
  bodyFontCode: string | null;
  primaryColor: string | null;
  lightColor: string | null;
  accentColor: string | null;
  darkColor: string | null;
  navigationStyle: string;
  sectionNavStyle: string;
  cardStyle: string;
  itemDetailsBehavior: string;
  stickyPrimaryAction: boolean;
  showItemTags: boolean;
  isConfigured: boolean;
}

export interface MenuSummaryResponse {
  id: string;
  name: LocalizedMap;
  badge: string;
  isPublished: boolean;
  lastPublishedVersion: number;
  lastPublishedAtUtc: string | null;
  version: number;
}

export interface MenuResponse {
  id: string;
  name: LocalizedMap;
  badge: string;
  branchScope: BranchScopeDto;
  salesChannels: ChannelSelectionDto;
  theme: MenuThemeDto;
  builderStep: string;
  creationMethod: string;
  isPublished: boolean;
  isOnHold: boolean;
  isArchived: boolean;
  lastPublishedVersion: number;
  lastPublishedAtUtc: string | null;
  version: number;
}

/** Idempotency-Key REQUIRED. */
export interface CreateMenuRequest {
  businessId: string;
  name: LocalizedMap;
  branchScope: BranchScopeDto | null;
  salesChannels: ChannelSelectionDto | null;
}

export interface UpdateMenuDetailsRequest {
  name: LocalizedMap;
  branchScope: BranchScopeDto | null;
  salesChannels: ChannelSelectionDto | null;
  expectedVersion: number | null;
}

/** Idempotency-Key REQUIRED. */
export interface DuplicateMenuRequest {
  businessId: string;
  menuId: string;
  name: LocalizedMap;
}

export interface SaveBuilderProgressRequest {
  step: string;
}

// ---- Availability -----------------------------------------------------------

export interface MenuAvailabilityResponse {
  schedule: AvailabilityScheduleDto | null;
  fallbackMenuId: string | null;
  allowPreOrder: boolean;
  version: number;
}

export interface SetMenuAvailabilityRequest {
  schedule: AvailabilityScheduleDto | null;
  fallbackMenuId: string | null;
  allowPreOrder: boolean;
  expectedVersion: number | null;
}

export interface AvailabilityTimelineEntry {
  startsAtUtc: string;
  endsAtUtc: string;
}

export interface AvailabilityTimelineResponse {
  timeZoneId: string;
  entries: AvailabilityTimelineEntry[];
}

export interface SchedulePresetResponse {
  code: string;
}

// ---- Sections & Placements ----------------------------------------------------

export type SectionKind = "Items" | "Offers";

export interface SectionPlacementDto {
  placementId: string;
  targetKind: string;
  targetId: string;
  position: number;
}

export interface SectionSummaryResponse {
  id: string;
  menuId: string;
  kind: string;
  name: LocalizedMap;
  visibility: string;
  displayStyle: string;
  position: number;
  isArchived: boolean;
  placementCount: number;
  version: number;
}

export interface SectionResponse {
  id: string;
  menuId: string;
  kind: string;
  name: LocalizedMap;
  description: LocalizedMap;
  image: MediaReferenceDto | null;
  visibility: string;
  displayStyle: string;
  color: string | null;
  position: number;
  isArchived: boolean;
  placements: SectionPlacementDto[];
  version: number;
}

/** Idempotency-Key REQUIRED. */
export interface CreateSectionRequest {
  businessId: string;
  menuId: string;
  kind: SectionKind;
  name: LocalizedMap;
}

export interface UpdateSectionRequest {
  name: LocalizedMap;
  description: LocalizedMap | null;
  image: MediaReferenceDto | null;
  visibility: string | null;
  displayStyle: string | null;
  color: string | null;
  expectedVersion: number | null;
}

export interface ReorderSectionsRequest {
  orderedSectionIds: string[];
}

export interface PlacementRequestDto {
  targetKind: string;
  targetId: string;
}

export interface PlaceEntriesRequest {
  entries: PlacementRequestDto[];
  expectedVersion: number | null;
}

export interface PlaceItemInSectionsRequest {
  sectionIds: string[];
}

export interface ReorderPlacementsRequest {
  orderedPlacementIds: string[];
  expectedVersion: number | null;
}

export interface MovePlacementRequest {
  fromSectionId: string;
  placementId: string;
  toSectionId: string;
}

// ---- Catalog items, labels, facts ---------------------------------------------

export interface MeasuredFactDto {
  factCode: string;
  value: string;
}

export interface AdvisoryDto {
  allergenCodes: string[];
  dietaryCodes: string[];
}

export interface CatalogItemSummaryResponse {
  id: string;
  name: LocalizedMap;
  sku: string | null;
  status: string;
  isUnavailable: boolean;
  basePrice: MoneyDto | null;
  image: MediaReferenceDto | null;
  version: number;
}

export interface CatalogItemResponse {
  id: string;
  name: LocalizedMap;
  shortName: LocalizedMap;
  description: LocalizedMap;
  sku: string | null;
  image: MediaReferenceDto | null;
  video: MediaReferenceDto | null;
  tagCodes: string[];
  status: string;
  isUnavailable: boolean;
  fulfillmentModes: ChannelSelectionDto;
  schedule: AvailabilityScheduleDto | null;
  basePrice: MoneyDto | null;
  facts: MeasuredFactDto[];
  advisories: AdvisoryDto;
  modifierGroupIds: string[];
  placementCount: number;
  version: number;
}

/** Idempotency-Key REQUIRED. */
export interface CreateCatalogItemRequest {
  businessId: string;
  name: LocalizedMap;
  shortName: LocalizedMap | null;
  description: LocalizedMap | null;
  sku: string | null;
  tagCodes: string[] | null;
  basePrice: MoneyDto | null;
}

export interface UpdateCatalogItemRequest {
  name: LocalizedMap;
  shortName: LocalizedMap | null;
  description: LocalizedMap | null;
  sku: string | null;
  tagCodes: string[] | null;
  status: string | null;
  fulfillmentModes: ChannelSelectionDto | null;
  basePrice: MoneyDto | null;
  facts: MeasuredFactDto[] | null;
  advisories: AdvisoryDto | null;
  image: MediaReferenceDto | null;
  video: MediaReferenceDto | null;
  expectedVersion: number | null;
}

export interface SetItemScheduleRequest {
  schedule: AvailabilityScheduleDto | null;
  expectedVersion: number | null;
}

/** No expectedVersion, no idempotency key — operational/live, reaches
 *  published menus immediately. */
export interface SetItemAvailabilityRequest {
  unavailable: boolean;
}

export interface SetItemModifierGroupsRequest {
  modifierGroupIds: string[];
  expectedVersion: number | null;
}

/** Idempotency-Key REQUIRED. */
export interface DuplicateCatalogItemRequest {
  businessId: string;
  itemId: string;
  name: LocalizedMap;
}

export interface LabelResponse {
  /** null for platform-seeded labels — cannot be renamed/deleted. */
  id: string | null;
  kind: string;
  code: string;
  label: LocalizedMap;
  isSeeded: boolean;
  usageCount: number;
}

/** Idempotency-Key REQUIRED. */
export interface CreateLabelRequest {
  businessId: string;
  kind: string;
  code: string;
  label: LocalizedMap;
}

export interface UpdateLabelRequest {
  /** Code is immutable — only display text can change. */
  label: LocalizedMap;
}

export interface FactTypeResponse {
  factCode: string;
}

// ---- Modifier groups & options -------------------------------------------------

export type SelectionMode = "Single" | "Multiple" | string;

export interface PriceEffectDto {
  kind: string;
  amount: MoneyDto | null;
}

export interface ModifierOptionResponse {
  id: string;
  name: LocalizedMap;
  effect: PriceEffectDto;
  isDefault: boolean;
  isAvailable: boolean;
  position: number;
}

/** NOTE: this group's optimistic-concurrency field is `contentVersion`, not
 *  `version` like every other resource in this module. */
export interface ModifierGroupSummaryResponse {
  id: string;
  name: LocalizedMap;
  selectionMode: string;
  minSelected: number;
  maxSelected: number | null;
  optionCount: number;
  contentVersion: number;
}

export interface ModifierGroupResponse {
  id: string;
  name: LocalizedMap;
  promptLabel: LocalizedMap;
  helpText: LocalizedMap;
  selectionMode: string;
  minSelected: number;
  maxSelected: number | null;
  showAsRadio: boolean;
  isRequired: boolean;
  options: ModifierOptionResponse[];
  attachedItemCount: number;
  contentVersion: number;
}

/** Idempotency-Key REQUIRED. */
export interface CreateModifierGroupRequest {
  businessId: string;
  name: LocalizedMap;
  promptLabel: LocalizedMap;
  helpText: LocalizedMap;
  selectionMode: string;
  minSelected: number;
  maxSelected: number | null;
  showAsRadio: boolean;
}

export interface UpdateModifierGroupRequest {
  name: LocalizedMap;
  promptLabel: LocalizedMap;
  helpText: LocalizedMap;
  selectionMode: string;
  minSelected: number;
  maxSelected: number | null;
  showAsRadio: boolean;
  expectedVersion: number | null;
}

/** No Idempotency-Key despite creating a sub-resource. Returns 200 with the
 *  whole parent group, not 201 with the created option. */
export interface AddModifierOptionRequest {
  name: LocalizedMap;
  effect: PriceEffectDto;
  isDefault: boolean;
  expectedVersion: number | null;
}

export type UpdateModifierOptionRequest = AddModifierOptionRequest;

export interface ReorderModifierOptionsRequest {
  orderedOptionIds: string[];
  expectedVersion: number | null;
}

/** No expectedVersion — operational/live. */
export interface SetOptionAvailabilityRequest {
  unavailable: boolean;
}

// ---- Offers -------------------------------------------------------------------

export interface OfferComponentDto {
  catalogItemId: string;
  quantity: number;
}

export type OfferPricingKind = "Fixed" | "DiscountPercent" | "DiscountAmount" | "Dynamic";

export interface OfferPricingRuleDto {
  kind: OfferPricingKind;
  fixedPrice: MoneyDto | null;
  discountPercent: number | null;
  discountAmount: MoneyDto | null;
  dynamicBasePrice: MoneyDto | null;
}

export interface OfferPriceQuoteResponse {
  referenceTotal: MoneyDto;
  price: MoneyDto;
  saving: MoneyDto;
  savingPercent: number;
}

export interface OfferSummaryResponse {
  id: string;
  name: LocalizedMap;
  slug: string;
  image: MediaReferenceDto | null;
  isActive: boolean;
  isComplete: boolean;
  version: number;
}

export interface OfferResponse {
  id: string;
  name: LocalizedMap;
  slug: string;
  image: MediaReferenceDto | null;
  badge: LocalizedMap;
  showSavingBadge: boolean;
  isActive: boolean;
  components: OfferComponentDto[];
  pricingRule: OfferPricingRuleDto;
  excludeFromPromotions: boolean;
  schedule: AvailabilityScheduleDto | null;
  salesChannels: ChannelSelectionDto;
  fulfillmentModes: ChannelSelectionDto;
  isComplete: boolean;
  computed: OfferPriceQuoteResponse | null;
  version: number;
}

/** Idempotency-Key REQUIRED. Offer always starts inactive. */
export interface CreateOfferRequest {
  businessId: string;
  name: LocalizedMap;
  slug: string | null;
  components: OfferComponentDto[];
  pricingRule: OfferPricingRuleDto;
}

export interface UpdateOfferRequest {
  name: LocalizedMap;
  badge: LocalizedMap | null;
  image: MediaReferenceDto | null;
  showSavingBadge: boolean;
  slug: string;
  components: OfferComponentDto[];
  pricingRule: OfferPricingRuleDto;
  excludeFromPromotions: boolean;
  schedule: AvailabilityScheduleDto | null;
  salesChannels: ChannelSelectionDto | null;
  fulfillmentModes: ChannelSelectionDto | null;
  expectedVersion: number | null;
}

/** Turning on is refused while the offer is incomplete — the doc comment
 *  says 409 but the backing error is declared ErrorType.Validation (usually
 *  422); verify which your ProblemDetails handler actually returns before
 *  branching on status code for this one case. */
export interface SetOfferActiveRequest {
  active: boolean;
  expectedVersion: number | null;
}

/** Idempotency-Key REQUIRED. Copy always starts inactive. Returns 200, not
 *  201 (a "copy into an existing collection", not a fresh top-level create). */
export interface DuplicateOfferRequest {
  businessId: string;
  offerId: string;
  name: LocalizedMap;
  slug: string | null;
}

/** Named to avoid colliding with public-link.ts's own SlugAvailabilityResponse
 *  (different shape: that one has {slug, isAvailable, reason}, this has just
 *  {available}). */
export interface OfferSlugAvailabilityResponse {
  available: boolean;
}

export interface QuoteOfferPriceRequest {
  components: OfferComponentDto[];
  pricingRule: OfferPricingRuleDto;
}

// ---- Theme --------------------------------------------------------------------

/** BusinessId/MenuId are echoed in the body itself (route-mismatch guarded)
 *  — an oddity specific to this endpoint. Replaces every field together;
 *  there is no partial theme update. */
export interface UpdateMenuThemeRequest {
  businessId: string;
  menuId: string;
  presetCode: string | null;
  logo: MediaReferenceDto | null;
  hero: MediaReferenceDto | null;
  heroText: LocalizedMap;
  heroSubtext: LocalizedMap;
  titleFontCode: string | null;
  bodyFontCode: string | null;
  primaryColor: string | null;
  lightColor: string | null;
  accentColor: string | null;
  darkColor: string | null;
  navigationStyle: string;
  sectionNavStyle: string;
  cardStyle: string;
  itemDetailsBehavior: string;
  stickyPrimaryAction: boolean;
  showItemTags: boolean;
  expectedVersion: number | null;
}

export interface ThemePresetsResponse {
  presets: string[];
  fonts: string[];
}

// ---- Publishing -----------------------------------------------------------------

export interface ValidationFindingResponse {
  code: string;
  severity: string;
  subjectKind: string;
  subjectId: string | null;
  details: Record<string, string> | null;
}

export interface ValidationReportResponse {
  canPublish: boolean;
  healthScore: number;
  /** Must be echoed unchanged to publish() as reviewToken. */
  reviewToken: string;
  errors: ValidationFindingResponse[];
  warnings: ValidationFindingResponse[];
  recommendations: ValidationFindingResponse[];
}

/** Idempotency-Key REQUIRED. Whole command (incl. businessId/menuId) is
 *  bound from the body — it's part of the idempotency fingerprint. */
export interface PublishMenuRequest {
  businessId: string;
  menuId: string;
  reviewToken: string | null;
}

export interface PublishResultResponse {
  menuId: string;
  version: number;
  /** True when the manifest didn't actually change — no new version made. */
  unchanged: boolean;
  publishedAtUtc: string;
  warnings: ValidationFindingResponse[];
}

export interface MenuVersionSummaryResponse {
  version: number;
  publishedAtUtc: string;
  publishedBy: string | null;
  documentSizeBytes: number;
  isCurrent: boolean;
}

export interface MenuVersionResponse {
  version: number;
  schemaVersion: number;
  publishedAtUtc: string;
  publishedBy: string | null;
  contentHash: string;
  isCurrent: boolean;
  /** The exact customer-facing document at that version — untyped on
   *  purpose; type it at the call site if/when needed. */
  document: unknown;
}

/** Idempotency-Key REQUIRED. Creates version N+1 from version k — never
 *  reverts in place; publish history stays append-only. */
export interface RepublishVersionRequest {
  businessId: string;
  menuId: string;
  version: number;
}

// ---- Access codes (QR) -----------------------------------------------------------

export interface AccessCodeResponse {
  accessCodeId: string;
  key: string;
  kind: string;
  branchId: string | null;
  menuId: string | null;
  salesChannelCode: string;
  status: string;
  printableUrl: string;
  createdAtUtc: string;
  revokedAtUtc: string | null;
}

/** Idempotency-Key REQUIRED. */
export interface CreateAccessCodeRequest {
  businessId: string;
  kind: string;
  branchId: string | null;
  menuId: string | null;
}

// ---- Media ------------------------------------------------------------------------

export interface RequestMediaUploadRequest {
  businessId: string;
  purpose: string;
  fileName: string;
  contentType: string;
  bytes: number;
}

/** Signed Cloudinary upload params — POST the file straight to Cloudinary
 *  with these, then call completeMediaUpload(). No Idempotency-Key: two
 *  requests just sign two independent upload scopes. */
export interface MediaUploadTicketResponse {
  uploadId: string;
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  allowedFormats: string[];
  resourceType: string;
  expiresAtUtc: string;
}

export interface CompleteMediaUploadRequest {
  businessId: string;
}

export interface MediaAssetResponse {
  assetId: string;
  kind: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  deliveryUrl: string;
}

// ---- Bulk editing -----------------------------------------------------------------

export interface BulkScopeRequest {
  kind: string;
  ids: string[] | null;
}

export interface PreviewPriceAdjustmentRequest {
  businessId: string;
  scope: BulkScopeRequest;
  adjustmentKind: string;
  direction: string;
  value: number;
  includeOptionAmounts: boolean;
  includeOfferPrices: boolean;
  confirmZeroPrices: boolean;
}

export interface PricedEntrySampleResponse {
  kind: string;
  entityId: string;
  ownerId: string | null;
  status: string;
  currentAmount: number;
  newAmount: number;
  currency: string;
}

export interface PriceAdjustmentPreviewResponse {
  changedCount: number;
  zeroCount: number;
  skippedCount: number;
  samples: PricedEntrySampleResponse[];
  previewToken: string;
}

/** Extends PreviewPriceAdjustmentRequest's fields plus the token from the
 *  preview call — execute needs both. */
export interface ExecutePriceAdjustmentRequest extends PreviewPriceAdjustmentRequest {
  previewToken: string;
}

export interface PriceAdjustmentResultResponse {
  operationId: string;
  changedCount: number;
  zeroCount: number;
  skippedCount: number;
  executedAtUtc: string;
}

export interface PreviewTextReplacementRequest {
  businessId: string;
  language: string;
  term: string;
  replacement: string;
  matchCase: boolean;
  wholeWord: boolean;
}

export interface TextReplacementFieldSampleResponse {
  entityKind: string;
  entityId: string;
  fieldName: string;
  matchCount: number;
}

export interface TextReplacementPreviewResponse {
  totalMatchCount: number;
  changedFieldCount: number;
  samples: TextReplacementFieldSampleResponse[];
  previewToken: string;
}

export interface ExecuteTextReplacementRequest extends PreviewTextReplacementRequest {
  previewToken: string;
}

export interface TextReplacementResultResponse {
  operationId: string;
  changedFieldCount: number;
  totalMatchCount: number;
  executedAtUtc: string;
}

export interface BulkOperationSummaryResponse {
  operationId: string;
  kind: string;
  executedAtUtc: string;
  executedBy: string | null;
}
