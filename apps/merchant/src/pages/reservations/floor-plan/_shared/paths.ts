export const LIVE_FLOOR_PLAN_PATH = "/reservations/floor-plan";
export const FLOOR_PLAN_BUILDER_PATH = "/reservations/floor-plan/builder";
export const QUICK_BOX_PATH = `${FLOOR_PLAN_BUILDER_PATH}/quick`;
export const SCRATCH_PATH = `${FLOOR_PLAN_BUILDER_PATH}/scratch`;

export type ScratchSource = "blank" | "live" | "sample";

export function scratchPath(source?: ScratchSource): string {
  return source ? `${SCRATCH_PATH}?source=${source}` : SCRATCH_PATH;
}
