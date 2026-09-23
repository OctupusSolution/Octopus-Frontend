// Real client for the FloorPlan module's AdminApi — `/v1/businesses/{businessId}/floor-plans/...`.
// Source of truth: E:\Octupus\octopus-backend\src\Modules\FloorPlan\Octopus.Modules.FloorPlan.Api
// (FloorPlanApiConstants.cs has every route string).
//
// DELETE endpoints answer 200 with an empty body (not 204); apiRequest handles both.
// Holding the edit lock is never required, but while someone else holds it every draft write
// (details, canvas, builder-progress, grid, zones, spots, scene, restore-draft) fails with 409
// `floor-plan.lock.held-by-other`. `expectedVersion` is optional everywhere; a stale one is
// 409 `floor-plan.concurrency.stale`.
//
// Idempotency-Key is required on exactly these calls: createFloorPlan, duplicateFloorPlan,
// generateSpotGrid, createZone, createSpot, duplicateSpot, bulkUpdateSpots, publishFloorPlan,
// rollbackToVersion, restoreVersionToDraft. Every other write is a plain PUT/POST/DELETE.
//
// POST bodies that bind to a backend command carry businessId/floorPlanId (and `version` for the
// version routes); the route guard 400s if they disagree with the URL, so these functions fill them
// in from the arguments and callers never pass them.
import type { ListEnvelope } from "../contracts/menu-admin";
import type {
  BulkUpdateSpotsRequest,
  BulkUpdateSpotsResponse,
  CreateFloorPlanRequest,
  CreateSpotRequest,
  CreateZoneRequest,
  DuplicateFloorPlanRequest,
  DuplicateSpotRequest,
  FloorPlanEditLockDto,
  FloorPlanEntrySummaryResponse,
  FloorPlanExpectedVersionRequest,
  FloorPlanResponse,
  FloorPlanSettingsCatalog,
  FloorPlanSettingsResponse,
  FloorPlanStatsResponse,
  FloorPlanSummaryResponse,
  FloorPlanValidationReportResponse,
  FloorPlanVersionDocumentResponse,
  FloorPlanVersionResponse,
  LayoutSceneResponse,
  ListSpotsParams,
  LiveBoardResponse,
  LiveSpotResponse,
  PublishedLayoutSnapshot,
  PublishFloorPlanRequest,
  PublishFloorPlanResponse,
  ReorderZonesRequest,
  ResetFloorPlanSettingsRequest,
  RestoreToDraftResponse,
  RollbackToVersionRequest,
  SaveFloorPlanBuilderProgressRequest,
  SaveLayoutSceneRequest,
  SetFloorPlanCanvasRequest,
  SetSpotAvailabilityRequest,
  SetSpotCombiningRequest,
  SetSpotLockRequest,
  SetSpotStatusRequest,
  SpotGridRequest,
  SpotGridResponse,
  SpotResponse,
  UpdateFloorPlanCatalogRequest,
  UpdateFloorPlanDetailsRequest,
  UpdateFloorPlanLimitsRequest,
  UpdateFloorPlanSceneLayersRequest,
  UpdateFloorPlanSizePresetsRequest,
  UpdateSceneElementsBatchRequest,
  UpdateSpotGeometryBatchRequest,
  UpdateSpotRequest,
  UpdateZoneRequest,
  ZoneResponse,
} from "../contracts/floor-plan";
import { apiRequest } from "./http";

const base = (businessId: string) => `/v1/businesses/${businessId}/floor-plans`;
const plan = (businessId: string, planId: string) => `${base(businessId)}/plans/${planId}`;

// ---- Entry summary + settings ---------------------------------------------------

export function getFloorPlanSummary(businessId: string): Promise<FloorPlanEntrySummaryResponse> {
  return apiRequest(`${base(businessId)}/summary`);
}

export function getFloorPlanSettings(businessId: string): Promise<FloorPlanSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings`);
}

export function updateFloorPlanCatalog(
  businessId: string,
  catalog: FloorPlanSettingsCatalog,
  request: UpdateFloorPlanCatalogRequest
): Promise<FloorPlanSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings/catalogs/${catalog}`, { method: "PUT", body: request });
}

export function updateFloorPlanSizePresets(
  businessId: string,
  request: UpdateFloorPlanSizePresetsRequest
): Promise<FloorPlanSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings/size-presets`, { method: "PUT", body: request });
}

export function updateFloorPlanSceneLayers(
  businessId: string,
  request: UpdateFloorPlanSceneLayersRequest
): Promise<FloorPlanSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings/scene-layers`, { method: "PUT", body: request });
}

export function updateFloorPlanLimits(
  businessId: string,
  request: UpdateFloorPlanLimitsRequest
): Promise<FloorPlanSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings/limits`, { method: "PUT", body: request });
}

export function resetFloorPlanSettings(
  businessId: string,
  request: ResetFloorPlanSettingsRequest = {}
): Promise<FloorPlanSettingsResponse> {
  return apiRequest(`${base(businessId)}/settings/reset`, { method: "POST", body: request });
}

// ---- Plans ------------------------------------------------------------------------

export function listFloorPlans(
  businessId: string,
  params: { branchId?: string; search?: string; includeArchived?: boolean; page?: number; pageSize?: number } = {}
): Promise<ListEnvelope<FloorPlanSummaryResponse>> {
  return apiRequest(`${base(businessId)}/plans`, {
    query: {
      branchId: params.branchId,
      search: params.search,
      includeArchived: params.includeArchived?.toString(),
      page: params.page?.toString(),
      pageSize: params.pageSize?.toString(),
    },
  });
}

export function createFloorPlan(
  businessId: string,
  request: CreateFloorPlanRequest,
  idempotencyKey: string
): Promise<FloorPlanResponse> {
  return apiRequest(`${base(businessId)}/plans`, {
    method: "POST",
    body: { ...request, businessId },
    idempotencyKey,
  });
}

export function getFloorPlan(businessId: string, planId: string): Promise<FloorPlanResponse> {
  return apiRequest(plan(businessId, planId));
}

export function updateFloorPlanDetails(
  businessId: string,
  planId: string,
  request: UpdateFloorPlanDetailsRequest
): Promise<FloorPlanResponse> {
  return apiRequest(plan(businessId, planId), { method: "PUT", body: request });
}

export function deleteFloorPlan(businessId: string, planId: string, expectedVersion?: number): Promise<void> {
  return apiRequest(plan(businessId, planId), {
    method: "DELETE",
    query: { expectedVersion: expectedVersion?.toString() },
  });
}

export function setFloorPlanCanvas(
  businessId: string,
  planId: string,
  request: SetFloorPlanCanvasRequest
): Promise<FloorPlanResponse> {
  return apiRequest(`${plan(businessId, planId)}/canvas`, { method: "PUT", body: request });
}

export function saveFloorPlanBuilderProgress(
  businessId: string,
  planId: string,
  request: SaveFloorPlanBuilderProgressRequest
): Promise<FloorPlanResponse> {
  return apiRequest(`${plan(businessId, planId)}/builder-progress`, { method: "PUT", body: request });
}

export function duplicateFloorPlan(
  businessId: string,
  planId: string,
  request: DuplicateFloorPlanRequest,
  idempotencyKey: string
): Promise<FloorPlanResponse> {
  return apiRequest(`${plan(businessId, planId)}/duplicate`, {
    method: "POST",
    body: { ...request, businessId, floorPlanId: planId },
    idempotencyKey,
  });
}

export function archiveFloorPlan(
  businessId: string,
  planId: string,
  request: FloorPlanExpectedVersionRequest = {}
): Promise<FloorPlanResponse> {
  return apiRequest(`${plan(businessId, planId)}/archive`, { method: "POST", body: request });
}

export function restoreFloorPlan(
  businessId: string,
  planId: string,
  request: FloorPlanExpectedVersionRequest = {}
): Promise<FloorPlanResponse> {
  return apiRequest(`${plan(businessId, planId)}/restore`, { method: "POST", body: request });
}

export function getFloorPlanStats(businessId: string, planId: string): Promise<FloorPlanStatsResponse> {
  return apiRequest(`${plan(businessId, planId)}/stats`);
}

/** Takes the lock, or renews it (from now) when the caller already holds it; lasts
 *  `limits.editLockMinutes`. Held by someone else -> 409 `floor-plan.lock.held-by-other`
 *  (the error carries no holder; read it from GET plan `editLock`). */
export function acquireFloorPlanEditLock(businessId: string, planId: string): Promise<FloorPlanEditLockDto> {
  return apiRequest(`${plan(businessId, planId)}/edit-lock`, { method: "POST" });
}

/** Clears the lock. `force` clears a lock held by someone else (audited as a force-unlock)
 *  but does NOT hand it to the caller — POST edit-lock afterwards to take it. No lock at all,
 *  or someone else's without `force` -> 409 `floor-plan.lock.not-held`. */
export function releaseFloorPlanEditLock(
  businessId: string,
  planId: string,
  force?: boolean
): Promise<FloorPlanEditLockDto> {
  return apiRequest(`${plan(businessId, planId)}/edit-lock`, {
    method: "DELETE",
    query: { force: force?.toString() },
  });
}

// ---- Quick grid ---------------------------------------------------------------------

export function previewSpotGrid(businessId: string, planId: string, request: SpotGridRequest): Promise<SpotGridResponse> {
  return apiRequest(`${plan(businessId, planId)}/spot-grid/preview`, {
    method: "POST",
    body: { ...request, businessId, floorPlanId: planId },
  });
}

export function generateSpotGrid(
  businessId: string,
  planId: string,
  request: SpotGridRequest,
  idempotencyKey: string
): Promise<SpotGridResponse> {
  return apiRequest(`${plan(businessId, planId)}/spot-grid`, {
    method: "POST",
    body: { ...request, businessId, floorPlanId: planId },
    idempotencyKey,
  });
}

// ---- Zones ----------------------------------------------------------------------------

/** Bare array, not an envelope. */
export function listZones(businessId: string, planId: string): Promise<ZoneResponse[]> {
  return apiRequest(`${plan(businessId, planId)}/zones`);
}

export function createZone(
  businessId: string,
  planId: string,
  request: CreateZoneRequest,
  idempotencyKey: string
): Promise<ZoneResponse> {
  return apiRequest(`${plan(businessId, planId)}/zones`, {
    method: "POST",
    body: { ...request, businessId, floorPlanId: planId },
    idempotencyKey,
  });
}

export function updateZone(
  businessId: string,
  planId: string,
  zoneId: string,
  request: UpdateZoneRequest
): Promise<ZoneResponse> {
  return apiRequest(`${plan(businessId, planId)}/zones/${zoneId}`, { method: "PUT", body: request });
}

export function deleteZone(businessId: string, planId: string, zoneId: string, expectedVersion?: number): Promise<void> {
  return apiRequest(`${plan(businessId, planId)}/zones/${zoneId}`, {
    method: "DELETE",
    query: { expectedVersion: expectedVersion?.toString() },
  });
}

export function reorderZones(businessId: string, planId: string, request: ReorderZonesRequest): Promise<ZoneResponse[]> {
  return apiRequest(`${plan(businessId, planId)}/zones/order`, { method: "PUT", body: request });
}

// ---- Spots ----------------------------------------------------------------------------

export function listSpots(
  businessId: string,
  planId: string,
  params: ListSpotsParams = {}
): Promise<ListEnvelope<SpotResponse>> {
  return apiRequest(`${plan(businessId, planId)}/spots`, {
    query: {
      zoneId: params.zoneId,
      unzoned: params.unzoned?.toString(),
      availability: params.availability,
      search: params.search,
      page: params.page?.toString(),
      pageSize: params.pageSize?.toString(),
    },
  });
}

export function createSpot(
  businessId: string,
  planId: string,
  request: CreateSpotRequest,
  idempotencyKey: string
): Promise<SpotResponse> {
  return apiRequest(`${plan(businessId, planId)}/spots`, {
    method: "POST",
    body: { ...request, businessId, floorPlanId: planId },
    idempotencyKey,
  });
}

export function getSpot(businessId: string, planId: string, spotId: string): Promise<SpotResponse> {
  return apiRequest(`${plan(businessId, planId)}/spots/${spotId}`);
}

export function updateSpot(
  businessId: string,
  planId: string,
  spotId: string,
  request: UpdateSpotRequest
): Promise<SpotResponse> {
  return apiRequest(`${plan(businessId, planId)}/spots/${spotId}`, { method: "PUT", body: request });
}

export function deleteSpot(businessId: string, planId: string, spotId: string, expectedVersion?: number): Promise<void> {
  return apiRequest(`${plan(businessId, planId)}/spots/${spotId}`, {
    method: "DELETE",
    query: { expectedVersion: expectedVersion?.toString() },
  });
}

export function duplicateSpot(
  businessId: string,
  planId: string,
  spotId: string,
  request: DuplicateSpotRequest,
  idempotencyKey: string
): Promise<SpotResponse> {
  return apiRequest(`${plan(businessId, planId)}/spots/${spotId}/duplicate`, {
    method: "POST",
    body: { ...request, businessId, floorPlanId: planId, spotId },
    idempotencyKey,
  });
}

export function updateSpotGeometryBatch(
  businessId: string,
  planId: string,
  request: UpdateSpotGeometryBatchRequest
): Promise<SpotResponse[]> {
  return apiRequest(`${plan(businessId, planId)}/spots/geometry`, {
    method: "PUT",
    body: { ...request, businessId, floorPlanId: planId },
  });
}

export function bulkUpdateSpots(
  businessId: string,
  planId: string,
  request: BulkUpdateSpotsRequest,
  idempotencyKey: string
): Promise<BulkUpdateSpotsResponse> {
  return apiRequest(`${plan(businessId, planId)}/spots/bulk-update`, {
    method: "POST",
    body: { unzone: false, ...request, businessId, floorPlanId: planId },
    idempotencyKey,
  });
}

export function setSpotLock(
  businessId: string,
  planId: string,
  spotId: string,
  request: SetSpotLockRequest
): Promise<SpotResponse> {
  return apiRequest(`${plan(businessId, planId)}/spots/${spotId}/lock`, { method: "PUT", body: request });
}

export function setSpotCombining(
  businessId: string,
  planId: string,
  spotId: string,
  request: SetSpotCombiningRequest
): Promise<SpotResponse> {
  return apiRequest(`${plan(businessId, planId)}/spots/${spotId}/combining`, { method: "PUT", body: request });
}

export function setSpotAvailability(
  businessId: string,
  planId: string,
  spotId: string,
  request: SetSpotAvailabilityRequest
): Promise<SpotResponse> {
  return apiRequest(`${plan(businessId, planId)}/spots/${spotId}/availability`, { method: "PUT", body: request });
}

// ---- Publishing -------------------------------------------------------------------------

export function getFloorPlanValidationReport(
  businessId: string,
  planId: string
): Promise<FloorPlanValidationReportResponse> {
  return apiRequest(`${plan(businessId, planId)}/validation-report`);
}

export function publishFloorPlan(
  businessId: string,
  planId: string,
  request: PublishFloorPlanRequest,
  idempotencyKey: string
): Promise<PublishFloorPlanResponse> {
  return apiRequest(`${plan(businessId, planId)}/publish`, {
    method: "POST",
    body: { ...request, businessId, floorPlanId: planId },
    idempotencyKey,
  });
}

export function listFloorPlanVersions(
  businessId: string,
  planId: string,
  page?: number,
  pageSize?: number
): Promise<ListEnvelope<FloorPlanVersionResponse>> {
  return apiRequest(`${plan(businessId, planId)}/versions`, {
    query: { page: page?.toString(), pageSize: pageSize?.toString() },
  });
}

export function getFloorPlanVersion(
  businessId: string,
  planId: string,
  versionNumber: number
): Promise<FloorPlanVersionDocumentResponse> {
  return apiRequest(`${plan(businessId, planId)}/versions/${versionNumber}`);
}

export function rollbackToVersion(
  businessId: string,
  planId: string,
  versionNumber: number,
  request: RollbackToVersionRequest,
  idempotencyKey: string
): Promise<FloorPlanVersionResponse> {
  return apiRequest(`${plan(businessId, planId)}/versions/${versionNumber}/rollback`, {
    method: "POST",
    body: { ...request, businessId, floorPlanId: planId, version: versionNumber },
    idempotencyKey,
  });
}

export function restoreVersionToDraft(
  businessId: string,
  planId: string,
  versionNumber: number,
  idempotencyKey: string
): Promise<RestoreToDraftResponse> {
  return apiRequest(`${plan(businessId, planId)}/versions/${versionNumber}/restore-draft`, {
    method: "POST",
    body: { businessId, floorPlanId: planId, version: versionNumber },
    idempotencyKey,
  });
}

export function getPublishedFloorPlan(businessId: string, planId: string): Promise<PublishedLayoutSnapshot> {
  return apiRequest(`${plan(businessId, planId)}/published`);
}

// ---- Scene ----------------------------------------------------------------------------------

export function getLayoutScene(businessId: string, planId: string): Promise<LayoutSceneResponse> {
  return apiRequest(`${plan(businessId, planId)}/scene`);
}

export function saveLayoutScene(
  businessId: string,
  planId: string,
  request: SaveLayoutSceneRequest
): Promise<LayoutSceneResponse> {
  return apiRequest(`${plan(businessId, planId)}/scene`, { method: "PUT", body: request });
}

export function updateSceneElements(
  businessId: string,
  planId: string,
  request: UpdateSceneElementsBatchRequest
): Promise<LayoutSceneResponse> {
  return apiRequest(`${plan(businessId, planId)}/scene/elements`, {
    method: "PATCH",
    body: request,
  });
}

// ---- Live board -------------------------------------------------------------------------------

export function getLiveBoard(
  businessId: string,
  planId: string,
  params: { zoneId?: string; search?: string } = {}
): Promise<LiveBoardResponse> {
  return apiRequest(`${plan(businessId, planId)}/live`, {
    query: { zoneId: params.zoneId, search: params.search },
  });
}

export function setSpotStatus(
  businessId: string,
  planId: string,
  spotId: string,
  request: SetSpotStatusRequest
): Promise<LiveSpotResponse> {
  return apiRequest(`${plan(businessId, planId)}/live/spots/${spotId}/status`, { method: "PUT", body: request });
}

/** Puts a spot back into service (clears its manual status). */
export function clearSpotStatus(businessId: string, planId: string, spotId: string): Promise<LiveSpotResponse> {
  return apiRequest(`${plan(businessId, planId)}/live/spots/${spotId}/status`, { method: "DELETE" });
}
