// entities/floor-plan
// The floor plan document, its persistence, and the simulated live floor.
// This index.ts is the ONLY file other slices/layers may import from.
export * from "./model";
export * from "./live-status";
export * from "./booking";
export * from "./storage";
export * from "./store";
export { sampleLayout } from "./sample-layout";
export {
  pushDraft,
  publishDraft,
  pullRecord,
  fetchLiveStates,
  writeLiveState,
  clearLiveState,
  floorPlanIdOf,
  activePlanIdOf,
  setActivePlan,
  saveBuilderStep,
  previewGrid,
  generateGrid,
  isServerId,
  type GridOptions,
  type GridPlacement,
  type GridPreview,
} from "./floor-plan-sync";
export { setSyncError, useSyncError } from "./sync-status";
