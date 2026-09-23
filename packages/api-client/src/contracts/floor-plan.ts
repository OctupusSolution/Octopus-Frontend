// Mirrors the FloorPlan module's AdminApi contracts, verified against the C# records in
// E:\Octupus\octopus-backend\src\Modules\FloorPlan\Octopus.Modules.FloorPlan.Contracts\Dtos and the
// command records in ...Application (POST/PUT bodies bind straight to those commands).
//
// Enums travel as strings; allowed values are documented as string-literal aliases below, but the
// wire fields stay open where the value comes from a business-configurable catalog (spot kinds,
// shapes, zone kinds, attributes, reasons). Names that would collide with menu-admin.ts exports are
// prefixed FloorPlan.
// Lists: PagedResult<T> endpoints use the shared ListEnvelope (from ./menu-admin); zones list,
// geometry batch and zone reorder return bare arrays.

/** "PublishedWithChanges" is part of the contract but the backend mapper never emits it today
 *  (hasUnpublishedChanges is always false) — don't rely on it to detect a draft on a live plan. */
export type FloorPlanBadge = "Archived" | "Draft" | "PublishedWithChanges" | "Published";
export type FloorPlanCreationMethod = "Scratch" | "QuickGrid" | "Import";
export type FloorPlanBuilderStep = "Layout" | "Configure" | "Review";
export type FloorPlanEditLockState = "Free" | "Expired" | "HeldByMe" | "HeldByOther";
export type FloorPlanPublishMode = "Live" | "VersionOnly";
export type FloorPlanValidationSeverity = "Information" | "Warning" | "Error";
export type FloorPlanAvailabilityMode = "Active" | "Blocked" | "Maintenance";
/** Live operational status of a spot (PUT live/spots/{id}/status). */
export type FloorPlanSpotStatus = "Available" | "Reserved" | "Occupied" | "Cleaning" | "Blocked" | "OutOfService";
export type FloorPlanStatusSource = "Manual" | "System";
export type FloorPlanSceneElementKind = "Wall" | "Door" | "Decor" | "Counter" | "Text" | "Room" | "Background";
export type FloorPlanDoorSwing = "Left" | "Right" | "BothWays" | "None";
export type FloorPlanNumberingDirection = "LeftToRightTopToBottom" | "TopToBottomLeftToRight";
/** Route segment of PUT /settings/catalogs/{catalog}. */
export type FloorPlanSettingsCatalog = "spot-kinds" | "shapes" | "zone-kinds" | "attributes" | "reasons";

// ---- Plans -------------------------------------------------------------------

export interface FloorPlanCanvasDto {
  width: number;
  height: number;
  gridStep: number;
}

export interface FloorPlanEditLockDto {
  state: FloorPlanEditLockState;
  /** The holder's user id, not a display name. */
  heldBy: string | null;
  expiresAtUtc: string | null;
}

export interface FloorPlanResponse {
  id: string;
  businessId: string;
  branchId: string | null;
  name: string;
  description: string | null;
  creationMethod: FloorPlanCreationMethod;
  canvas: FloorPlanCanvasDto;
  builderStep: FloorPlanBuilderStep;
  badge: FloorPlanBadge;
  editLock: FloorPlanEditLockDto;
  isPublished: boolean;
  isArchived: boolean;
  lastPublishedVersion: number;
  lastPublishedAtUtc: string | null;
  /** Optimistic-concurrency token: send back as `expectedVersion`. */
  version: number;
}

export interface FloorPlanSummaryResponse {
  id: string;
  branchId: string | null;
  name: string;
  badge: FloorPlanBadge;
  spotCount: number;
  totalCapacity: number;
  lastPublishedVersion: number;
  updatedAtUtc: string | null;
  version: number;
}

/** planCount excludes archived plans; totalSpots/totalCapacity cover the published plan only. */
export interface FloorPlanEntrySummaryResponse {
  hasAnyPlan: boolean;
  planCount: number;
  draftPlan: FloorPlanSummaryResponse | null;
  publishedPlan: FloorPlanSummaryResponse | null;
  totalSpots: number;
  totalCapacity: number;
}

export interface FloorPlanStatsResponse {
  spotCount: number;
  totalCapacity: number;
  zoneCount: number;
  blockedCount: number;
  walkInCapacity: number;
  unzonedCount: number;
  sceneElementCount: number;
  wallLengthMeters: number;
}

/** POST /plans: Idempotency-Key required. The client fills businessId from the route. */
export interface CreateFloorPlanRequest {
  branchId?: string | null;
  name: string;
  description?: string | null;
  creationMethod?: FloorPlanCreationMethod | null;
  canvas?: FloorPlanCanvasDto | null;
}

export interface UpdateFloorPlanDetailsRequest {
  name: string;
  description?: string | null;
  branchId?: string | null;
  expectedVersion?: number | null;
}

export interface SetFloorPlanCanvasRequest {
  canvas: FloorPlanCanvasDto;
  expectedVersion?: number | null;
}

export interface SaveFloorPlanBuilderProgressRequest {
  builderStep: FloorPlanBuilderStep;
}

/** POST /plans/{id}/duplicate: Idempotency-Key required. */
export interface DuplicateFloorPlanRequest {
  name: string;
}

export interface FloorPlanExpectedVersionRequest {
  expectedVersion?: number | null;
}

// ---- Spots -------------------------------------------------------------------

export interface SpotGeometryDto {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
}

export interface SpotAcceptancePolicyDto {
  acceptsAdvance: boolean;
  acceptsWalkIn: boolean;
  walkInOnly: boolean;
  largePartyOnly: boolean;
  customerVisible: boolean;
}

export interface SpotAvailabilityDto {
  mode: FloorPlanAvailabilityMode;
  reasonCode: string | null;
  fromUtc: string | null;
  untilUtc: string | null;
  affectsAdvance: boolean;
  affectsWalkIn: boolean;
}

export interface SpotCombiningDto {
  isCombinable: boolean;
  groupCode: string | null;
  partnerSpotIds: string[];
}

export interface SpotResponse {
  id: string;
  floorPlanId: string;
  zoneId: string | null;
  code: string;
  displayName: string | null;
  kindCode: string;
  shapeCode: string;
  sizeCode: string | null;
  geometry: SpotGeometryDto;
  capacity: number;
  minPartySize: number;
  maxPartySize: number;
  attributeCodes: string[];
  acceptance: SpotAcceptancePolicyDto;
  availability: SpotAvailabilityDto;
  combining: SpotCombiningDto;
  color: string | null;
  internalNote: string | null;
  priority: number;
  isLocked: boolean;
  zIndex: number;
  version: number;
}

/** POST /plans/{id}/spots: Idempotency-Key required. */
export interface CreateSpotRequest {
  zoneId?: string | null;
  code: string;
  displayName?: string | null;
  kindCode: string;
  shapeCode: string;
  geometry: SpotGeometryDto;
  capacity: number;
  minPartySize?: number | null;
  maxPartySize?: number | null;
  attributeCodes?: string[] | null;
  acceptance?: SpotAcceptancePolicyDto | null;
}

export interface UpdateSpotRequest {
  zoneId?: string | null;
  code: string;
  displayName?: string | null;
  kindCode: string;
  shapeCode: string;
  geometry: SpotGeometryDto;
  capacity: number;
  minPartySize?: number | null;
  maxPartySize?: number | null;
  attributeCodes?: string[] | null;
  acceptance?: SpotAcceptancePolicyDto | null;
  color?: string | null;
  internalNote?: string | null;
  priority?: number | null;
  zIndex?: number | null;
  expectedVersion?: number | null;
}

/** POST /spots/{id}/duplicate: Idempotency-Key required. */
export interface DuplicateSpotRequest {
  code: string;
  geometry: SpotGeometryDto;
}

export interface SpotGeometryChange {
  spotId: string;
  geometry: SpotGeometryDto;
  expectedVersion?: number | null;
}

/** PUT /spots/geometry: returns the updated SpotResponse[] (bare array). */
export interface UpdateSpotGeometryBatchRequest {
  changes: SpotGeometryChange[];
}

/** POST /spots/bulk-update: Idempotency-Key required. Only the fields you set are changed. */
export interface BulkUpdateSpotsRequest {
  spotIds: string[];
  zoneId?: string | null;
  /** true clears the zone (zoneId is then ignored). */
  unzone?: boolean;
  capacity?: number | null;
  kindCode?: string | null;
  attributeCodes?: string[] | null;
  acceptance?: SpotAcceptancePolicyDto | null;
  availability?: SpotAvailabilityDto | null;
}

export interface BulkUpdateSpotsResponse {
  changedCount: number;
  spotIds: string[];
}

export interface SetSpotLockRequest {
  isLocked: boolean;
}

export interface SetSpotCombiningRequest {
  isCombinable: boolean;
  groupCode?: string | null;
  partnerSpotIds?: string[] | null;
  expectedVersion?: number | null;
}

export interface SetSpotAvailabilityRequest {
  availability: SpotAvailabilityDto;
  expectedVersion?: number | null;
}

export interface ListSpotsParams {
  zoneId?: string;
  /** Only spots without a zone. */
  unzoned?: boolean;
  availability?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ---- Quick grid --------------------------------------------------------------

export interface FloorPlanNumberingRuleDto {
  prefix?: string | null;
  startNumber: number;
  suffix?: string | null;
  step: number;
  direction?: FloorPlanNumberingDirection | null;
}

export interface FloorPlanGridPresetDto {
  columns?: number | null;
  rows?: number | null;
  spacingMeters?: number | null;
}

export interface FloorPlanSpotDefaultsDto {
  kindCode: string;
  shapeCode: string;
  sizeCode?: string | null;
  capacity: number;
  zoneId?: string | null;
  attributeCodes?: string[] | null;
  acceptance?: SpotAcceptancePolicyDto | null;
}

/** Body of both spot-grid/preview (no writes) and spot-grid (Idempotency-Key required). */
export interface SpotGridRequest {
  count: number;
  numbering?: FloorPlanNumberingRuleDto | null;
  grid?: FloorPlanGridPresetDto | null;
  defaults: FloorPlanSpotDefaultsDto;
}

export interface PlannedSpotDto {
  code: string;
  geometry: SpotGeometryDto;
}

export interface SpotGridResponse {
  spots: PlannedSpotDto[];
  skippedNumbers: number[];
  canvasGrown: boolean;
  requiredCanvas: FloorPlanCanvasDto;
  /** Empty for a preview. */
  createdSpotIds: string[];
}

// ---- Zones -------------------------------------------------------------------

export interface ZoneResponse {
  id: string;
  floorPlanId: string;
  name: string;
  kindCode: string;
  color: string | null;
  attributeCodes: string[];
  position: number;
  minPartySize: number | null;
  priority: number | null;
  /** Always 0 today: the backend maps zones without a count on every zone endpoint. */
  spotCount: number;
  version: number;
}

/** POST /plans/{id}/zones: Idempotency-Key required. */
export interface CreateZoneRequest {
  name: string;
  kindCode: string;
  color?: string | null;
  attributeCodes?: string[] | null;
  minPartySize?: number | null;
  priority?: number | null;
}

export interface UpdateZoneRequest {
  name: string;
  kindCode: string;
  color?: string | null;
  attributeCodes?: string[] | null;
  minPartySize?: number | null;
  priority?: number | null;
  expectedVersion?: number | null;
}

export interface ReorderZonesRequest {
  zoneIds: string[];
}

// ---- Publishing --------------------------------------------------------------

export interface FloorPlanValidationFindingDto {
  code: string;
  severity: FloorPlanValidationSeverity;
  message: string;
  subjects: string[];
}

export interface FloorPlanValidationReportResponse {
  canPublish: boolean;
  score: number;
  errorCount: number;
  warningCount: number;
  informationCount: number;
  findings: FloorPlanValidationFindingDto[];
  /** Echo this in PublishFloorPlanRequest.reviewToken; it is bound to the draft state reviewed. */
  reviewToken: string;
  generatedAtUtc: string;
}

export interface FloorPlanVersionResponse {
  id: string;
  version: number;
  kind: FloorPlanPublishMode;
  isLive: boolean;
  label: string | null;
  notes: string | null;
  spotCount: number;
  totalCapacity: number;
  zoneCount: number;
  contentHash: string;
  sourceVersion: number | null;
  publishedAtUtc: string;
  publishedBy: string | null;
}

/** POST /plans/{id}/publish: Idempotency-Key required. */
export interface PublishFloorPlanRequest {
  /** "Live" puts it in front of operations; "VersionOnly" only keeps it in history. */
  mode: FloorPlanPublishMode;
  reviewToken: string;
  label?: string | null;
  notes?: string | null;
}

export interface PublishFloorPlanResponse {
  version: FloorPlanVersionResponse;
  report: FloorPlanValidationReportResponse;
}

/** POST versions/{n}/rollback: Idempotency-Key required. */
export interface RollbackToVersionRequest {
  notes?: string | null;
}

export interface RestoreToDraftResponse {
  matchedZones: number;
  matchedSpots: number;
  addedSpots: number;
  removedSpots: number;
}

export interface PublishedZoneDto {
  id: string;
  name: string;
  kindCode: string;
  color: string | null;
  attributes: string[];
  position: number;
  minPartySize: number | null;
  priority: number | null;
}

export interface PublishedGeometryDto {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
  zIndex: number;
}

export interface PublishedSpotDto {
  id: string;
  code: string;
  displayName: string | null;
  zoneId: string | null;
  kindCode: string;
  shapeCode: string;
  geometry: PublishedGeometryDto;
  capacity: number;
  minPartySize: number;
  maxPartySize: number;
  attributes: string[];
  acceptance: SpotAcceptancePolicyDto;
  combining: { isCombinable: boolean; groupCode: string | null; withSpotIds: string[] };
  availability: SpotAvailabilityDto;
  color: string | null;
  priority: number;
}

/** code -> display label, per catalog. */
export interface PublishedLabelsDto {
  spotKinds: Record<string, string>;
  shapes: Record<string, string>;
  zoneKinds: Record<string, string>;
  attributes: Record<string, string>;
  reasons: Record<string, string>;
}

export interface PublishedLayoutSnapshot {
  floorPlanId: string;
  businessId: string;
  branchId: string | null;
  version: number;
  name: string;
  publishedAtUtc: string;
  canvas: FloorPlanCanvasDto;
  zones: PublishedZoneDto[];
  spots: PublishedSpotDto[];
  labels: PublishedLabelsDto;
}

export interface FloorPlanVersionDocumentResponse {
  version: FloorPlanVersionResponse;
  layout: PublishedLayoutSnapshot;
}

// ---- Scene -------------------------------------------------------------------

export interface SceneLayerDto {
  code: string;
  isVisible: boolean;
  isLocked: boolean;
}

export interface SceneBoundsDto {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
}

/** Set only the payload matching `kind` (wall for Wall, door for Door, ...). */
export interface SceneElementDto {
  id: string;
  kind: FloorPlanSceneElementKind;
  layerCode: string;
  bounds: SceneBoundsDto;
  zIndex: number;
  isLocked: boolean;
  wall?: { fromX: number; fromY: number; toX: number; toY: number; thickness: number } | null;
  door?: { swing: FloorPlanDoorSwing; clearance: number } | null;
  decor?: { decorCode: string } | null;
  counter?: { counterCode: string; label: string | null } | null;
  text?: { text: string; fontSize: number } | null;
  room?: { label: string | null; color: string | null } | null;
  background?: { reference: string | null; opacity: number; scale: number } | null;
}

export interface LayoutSceneResponse {
  schemaVersion: number;
  layers: SceneLayerDto[];
  elements: SceneElementDto[];
  stats: { elementCount: number; wallLengthMeters: number; doorCount: number; layerCount: number };
  sceneHash: string | null;
  version: number;
}

/** PUT /scene replaces the whole scene. */
export interface SaveLayoutSceneRequest {
  layers: SceneLayerDto[];
  elements: SceneElementDto[];
  expectedVersion?: number | null;
}

/** PATCH /scene/elements applies a partial change set. */
export interface UpdateSceneElementsBatchRequest {
  upserts?: SceneElementDto[] | null;
  removedElementIds?: string[] | null;
  layers?: SceneLayerDto[] | null;
  expectedVersion?: number | null;
}

// ---- Live board --------------------------------------------------------------

export interface FloorPlanExternalReferenceDto {
  kind: string;
  id: string;
}

export interface FloorPlanStatusContextDto {
  partySize?: number | null;
  startedAtUtc?: string | null;
  externalReferences?: FloorPlanExternalReferenceDto[] | null;
}

export interface LiveSpotResponse {
  spotId: string;
  code: string;
  displayName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  capacity: number;
  status: FloorPlanSpotStatus;
  source: FloorPlanStatusSource | null;
  reasonCode: string | null;
  elapsedMinutes: number;
  expiresAtUtc: string | null;
  context: FloorPlanStatusContextDto | null;
  isConfigurationBlocked: boolean;
}

export interface LiveBoardCountsResponse {
  available: number;
  reserved: number;
  occupied: number;
  cleaning: number;
  blocked: number;
  outOfService: number;
  total: number;
  availableCapacity: number;
}

export interface LiveBoardResponse {
  floorPlanId: string;
  name: string;
  version: number;
  spots: LiveSpotResponse[];
  counts: LiveBoardCountsResponse;
  asOfUtc: string;
}

export interface SetSpotStatusRequest {
  status: FloorPlanSpotStatus;
  reasonCode?: string | null;
  /** Status auto-reverts after this instant (evaluated lazily on read). */
  expiresAtUtc?: string | null;
  context?: FloorPlanStatusContextDto | null;
}

// ---- Settings ----------------------------------------------------------------

export interface FloorPlanCatalogEntryDto {
  code: string;
  label: string;
  isEnabled: boolean;
}

export interface FloorPlanSceneLayerSettingDto {
  code: string;
  label: string;
  defaultVisible: boolean;
  defaultLocked: boolean;
}

/** Maps a shape + named size (e.g. "small") to concrete width/height in canvas units. */
export interface FloorPlanSizePresetDto {
  shapeCode: string;
  presetCode: string;
  width: number;
  height: number;
}

export interface FloorPlanSettingsLimitsDto {
  capacityCeiling: number;
  maxSpotsPerPlan: number;
  maxZonesPerPlan: number;
  maxPlansPerBusiness: number;
  maxSpotsPerGridAction: number;
  editLockMinutes: number;
  cleaningMinutes: number;
  reservedHoldMinutes: number;
  minAisleMeters: number;
}

export interface FloorPlanSettingsResponse {
  isConfigured: boolean;
  spotKinds: FloorPlanCatalogEntryDto[];
  shapes: FloorPlanCatalogEntryDto[];
  zoneKinds: FloorPlanCatalogEntryDto[];
  attributes: FloorPlanCatalogEntryDto[];
  reasons: FloorPlanCatalogEntryDto[];
  sceneLayers: FloorPlanSceneLayerSettingDto[];
  sizePresets: FloorPlanSizePresetDto[];
  limits: FloorPlanSettingsLimitsDto;
  platformMaximums: FloorPlanSettingsLimitsDto;
  version: number;
}

export interface UpdateFloorPlanCatalogRequest {
  entries: FloorPlanCatalogEntryDto[];
  expectedVersion?: number | null;
}

export interface UpdateFloorPlanSizePresetsRequest {
  presets: FloorPlanSizePresetDto[];
  expectedVersion?: number | null;
}

export interface UpdateFloorPlanSceneLayersRequest {
  layers: FloorPlanSceneLayerSettingDto[];
  expectedVersion?: number | null;
}

export interface UpdateFloorPlanLimitsRequest {
  limits: FloorPlanSettingsLimitsDto;
  expectedVersion?: number | null;
}

export interface ResetFloorPlanSettingsRequest {
  expectedVersion?: number | null;
}
