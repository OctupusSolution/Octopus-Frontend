// "Live Floor Plan". Once a plan is published this is the live floor; until
// then there is nothing live to show, so it offers the ways to build one.
import { FloorPlanHub } from "./_shared/floor-plan-hub";
import { useFloorPlan } from "./_shared/use-floor-plan";
import { LiveFloorPlan } from "./live/live-view";

export function LiveFloorPlanPage() {
  const { published } = useFloorPlan();
  return published ? <LiveFloorPlan published={published} /> : <FloorPlanHub />;
}
