// Table place codes (Menu module, US-020). 1:1 with
// Octopus.Modules.Menu.Contracts/Dtos/PlaceCodes/*.cs, camelCased.
// Dates are ISO strings. `address` is sent only to print/manage holders.

export type PlaceCodeStatus = "active" | "notGenerated" | "needsReprint" | "disabled";

export interface PlaceCodeCounts {
  places: number;
  active: number;
  notGenerated: number;
  needsReprint: number;
  disabled: number;
  neverPrinted: number;
  blocked: number;
  suspended: number;
}

export interface PlaceCodeLastPrint {
  printedAtUtc: string;
  printedBy: string | null;
  itemCount: number;
}

export interface PlaceCodeFloor {
  floorId: string;
  name: string;
  version: number;
  counts: PlaceCodeCounts;
}

export interface PlaceCodeFloorsResponse {
  floors: PlaceCodeFloor[];
  suspended: number;
  lastPrint: PlaceCodeLastPrint | null;
}

export interface PlaceCodeRow {
  floorId: string;
  resourceId: string;
  number: string;
  name: string | null;
  zoneId: string | null;
  zone: string | null;
  capacity: number;
  status: PlaceCodeStatus;
  neverPrinted: boolean;
  blocked: boolean;
  codeId: string | null;
  version: number | null;
  revision: number | null;
  generatedAtUtc: string | null;
  hiddenFromCustomers: boolean;
}

export interface PlaceCodeCandidate {
  floorId: string;
  resourceId: string;
  number: string;
  name: string | null;
}

/** A suspended code: its place left the live floor. */
export interface PlaceCodeAttention {
  codeId: string;
  floorId: string;
  resourceId: string;
  lastKnownNumber: string | null;
  lastKnownName: string | null;
  version: number;
  revision: number;
  candidate: PlaceCodeCandidate | null;
}

export interface PlaceCodeListResponse {
  items: PlaceCodeRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  counts: PlaceCodeCounts;
  attention: PlaceCodeAttention[];
  lastPrint: PlaceCodeLastPrint | null;
}

export interface PlaceCodeDetail {
  codeId: string;
  floorId: string;
  resourceId: string;
  status: PlaceCodeStatus | "revoked" | "suspended";
  number: string | null;
  name: string | null;
  zone: string | null;
  floorName: string | null;
  neverPrinted: boolean;
  blocked: boolean;
  version: number;
  revision: number;
  generatedAtUtc: string;
  generatedBy: string | null;
  lastPrintedAtUtc: string | null;
  lastPrintedBy: string | null;
  printedCount: number;
  address: string | null;
  candidate: PlaceCodeCandidate | null;
}

export interface GeneratedPlaceCode {
  codeId: string;
  floorId: string;
  resourceId: string;
  number: string;
  name: string | null;
  zone: string | null;
  version: number;
  address: string;
  replacesCodeId: string | null;
}

export interface KeptPlaceCode {
  codeId: string;
  floorId: string;
  resourceId: string;
  number: string;
  name: string | null;
  version: number;
}

export interface GeneratePlaceCodesResponse {
  batchId: string;
  replayed: boolean;
  created: GeneratedPlaceCode[];
  replaced: GeneratedPlaceCode[];
  kept: KeptPlaceCode[];
}

export interface PlaceCodeLifecycle {
  codeId: string;
  status: string;
  version: number;
  revision: number;
  floorId: string;
  resourceId: string;
  replayed: boolean;
}

export interface BulkPlaceCodeLifecycleResponse {
  operationId: string;
  applied: number;
  unchanged: number;
  replayed: number;
  codes: PlaceCodeLifecycle[];
}

export type PlaceCodeActivityKind = "Generated" | "Disabled" | "Enabled" | "Relinked" | "Revoked" | "Printed" | "Exported";

export interface PlaceCodeActivityEntry {
  kind: PlaceCodeActivityKind;
  generation: number;
  revision: number | null;
  occurredAtUtc: string;
  actor: string | null;
  placeNumber: string | null;
  placeName: string | null;
  reconstructed: boolean;
}

export interface PlaceCodeHistoryStatus {
  complete: boolean;
  expected: number;
  recorded: number;
  missing: { generation: number; revision: number }[];
}

export interface PlaceCodeActivityResponse {
  entries: PlaceCodeActivityEntry[];
  history: PlaceCodeHistoryStatus;
}

export interface RebuildPlaceCodeHistoryResponse {
  inserted: boolean;
  revision: number;
  history: PlaceCodeHistoryStatus;
}

export interface PlaceCodeDesign {
  templateKey: string;
  logoAssetId: string | null;
  primaryColour: string | null;
  message: string | null;
  showLabel: boolean;
  labelStyle: string;
  sizeKey: string;
  version: number;
  updatedAtUtc: string | null;
  updatedBy: string | null;
}

export interface PlaceCodePrintRun {
  runId: string;
  printedAtUtc: string;
  printedBy: string | null;
  itemCount: number;
  designVersion: number;
  format: "svg" | "png";
}

export type PlaceCodeSelection =
  | { mode: "one"; resourceId: string }
  | { mode: "zone"; zoneId: string }
  | { mode: "range"; from: string; to: string }
  | { mode: "all" };

export interface GeneratePlaceCodesRequest {
  batchId: string;
  floorId: string;
  selection: PlaceCodeSelection;
  existing: "keep" | "regenerate";
  confirmReplaceCount?: number;
}

export interface PlaceCodeDesignRequest {
  expectedVersion: number;
  templateKey: string;
  logoAssetId: string | null;
  primaryColour: string | null;
  message: string | null;
  showLabel: boolean;
  labelStyle: string;
  sizeKey: string;
}
