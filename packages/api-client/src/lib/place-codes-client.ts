// Table place codes — AdminApi, /v1/businesses/{businessId}/menu/place-codes.
// Every command body repeats `businessId` (the route guard compares it with
// the path). Lifecycle commands replay on `operationId`, generate on
// `batchId`; the Idempotency-Key header is not read by these routes.
import type { ListEnvelope } from "../contracts/menu-admin";
import type {
  BulkPlaceCodeLifecycleResponse,
  GeneratedPlaceCode,
  GeneratePlaceCodesRequest,
  GeneratePlaceCodesResponse,
  PlaceCodeActivityResponse,
  PlaceCodeDesign,
  PlaceCodeDesignRequest,
  PlaceCodeDetail,
  PlaceCodeFloorsResponse,
  PlaceCodeLifecycle,
  PlaceCodeListResponse,
  PlaceCodePrintRun,
  PlaceCodeSelection,
  PlaceCodeStatus,
  RebuildPlaceCodeHistoryResponse,
} from "../contracts/place-codes";
import { apiDownload, apiRequest, type ApiDownload } from "./http";

const base = (businessId: string) => `/v1/businesses/${businessId}/menu/place-codes`;

export function listPlaceCodeFloors(businessId: string): Promise<PlaceCodeFloorsResponse> {
  return apiRequest(`${base(businessId)}/floors`);
}

export function listPlaceCodes(
  businessId: string,
  filter: {
    floorId: string;
    zoneId?: string;
    status?: PlaceCodeStatus;
    neverPrinted?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<PlaceCodeListResponse> {
  return apiRequest(base(businessId), {
    query: {
      floorId: filter.floorId,
      zoneId: filter.zoneId,
      status: filter.status,
      neverPrinted: filter.neverPrinted?.toString(),
      search: filter.search,
      page: filter.page?.toString(),
      pageSize: filter.pageSize?.toString(),
    },
  });
}

/** `address` is present only for print/manage holders. */
export function getPlaceCode(businessId: string, codeId: string): Promise<PlaceCodeDetail> {
  return apiRequest(`${base(businessId)}/${codeId}`);
}

/** The whole lineage's timeline, oldest first. */
export function listPlaceCodeActivity(businessId: string, codeId: string): Promise<PlaceCodeActivityResponse> {
  return apiRequest(`${base(businessId)}/${codeId}/activity`);
}

/** All-or-nothing, at most 500 places. A repeated `batchId` answers `replayed: true`. */
export function generatePlaceCodes(businessId: string, request: GeneratePlaceCodesRequest): Promise<GeneratePlaceCodesResponse> {
  return apiRequest(`${base(businessId)}/generate`, { method: "POST", body: { businessId, ...request } });
}

export type PlaceCodeBulkTarget =
  | { codes: { codeId: string; expectedRevision?: number }[] }
  | { floorId: string; selection: PlaceCodeSelection };

export function disablePlaceCodes(
  businessId: string,
  operationId: string,
  target: PlaceCodeBulkTarget
): Promise<BulkPlaceCodeLifecycleResponse> {
  return apiRequest(`${base(businessId)}/disable`, { method: "POST", body: { businessId, operationId, ...target } });
}

export function enablePlaceCodes(
  businessId: string,
  operationId: string,
  target: PlaceCodeBulkTarget
): Promise<BulkPlaceCodeLifecycleResponse> {
  return apiRequest(`${base(businessId)}/enable`, { method: "POST", body: { businessId, operationId, ...target } });
}

/** Issues a successor; the printed code stops working. */
export function regeneratePlaceCode(
  businessId: string,
  codeId: string,
  operationId: string,
  expectedRevision?: number
): Promise<GeneratedPlaceCode> {
  return apiRequest(`${base(businessId)}/${codeId}/regenerate`, {
    method: "POST",
    body: { businessId, codeId, operationId, expectedRevision },
  });
}

/** 409 `menu.place-code.relink-target-taken` when the target already holds a code. */
export function relinkPlaceCode(
  businessId: string,
  codeId: string,
  operationId: string,
  resourceId: string,
  expectedRevision?: number
): Promise<PlaceCodeLifecycle> {
  return apiRequest(`${base(businessId)}/${codeId}/relink`, {
    method: "POST",
    body: { businessId, codeId, operationId, expectedRevision, resourceId },
  });
}

/** Terminal. */
export function revokePlaceCode(
  businessId: string,
  codeId: string,
  operationId: string,
  expectedRevision?: number
): Promise<PlaceCodeLifecycle> {
  return apiRequest(`${base(businessId)}/${codeId}/revoke`, {
    method: "POST",
    body: { businessId, codeId, operationId, expectedRevision },
  });
}

export function rebuildPlaceCodeHistory(businessId: string, codeId: string): Promise<RebuildPlaceCodeHistoryResponse> {
  return apiRequest(`${base(businessId)}/${codeId}/activity/rebuild`, { method: "POST", body: { businessId, codeId } });
}

/** Raw SVG/PNG bytes fetched with the bearer token (a bare <img src> would be
 *  refused). `size` is pixels per module, 4–40. Rate limited 30/min per user;
 *  refused for a revoked code. */
export function getPlaceCodeSymbol(
  businessId: string,
  codeId: string,
  format: "svg" | "png",
  size = 10
): Promise<ApiDownload> {
  return apiDownload(`${base(businessId)}/${codeId}/symbol`, { query: { format, size: String(size) } });
}

export function getPlaceCodeDesign(businessId: string): Promise<PlaceCodeDesign> {
  return apiRequest(`${base(businessId)}/design`);
}

/** 409 `menu.place-code.design-stale` when `expectedVersion` is behind. */
export function updatePlaceCodeDesign(businessId: string, request: PlaceCodeDesignRequest): Promise<PlaceCodeDesign> {
  return apiRequest(`${base(businessId)}/design`, { method: "PUT", body: { businessId, ...request } });
}

/** Must be recorded BEFORE any symbol or bundle is fetched for printing. */
export function recordPlaceCodePrintRun(
  businessId: string,
  request: { codeIds: string[]; format: "svg" | "png"; purpose?: "print" | "export" }
): Promise<PlaceCodePrintRun> {
  return apiRequest(`${base(businessId)}/print-runs`, { method: "POST", body: { businessId, ...request } });
}

export function listPlaceCodePrintRuns(businessId: string, page = 1): Promise<ListEnvelope<PlaceCodePrintRun>> {
  return apiRequest(`${base(businessId)}/print-runs`, { query: { page: String(page) } });
}

/** application/zip with a manifest.json; a code revoked since the run is left out. */
export function getPlaceCodeBundle(businessId: string, runId: string, size = 10): Promise<ApiDownload> {
  return apiDownload(`${base(businessId)}/print-runs/${runId}/bundle`, { query: { size: String(size) } });
}
