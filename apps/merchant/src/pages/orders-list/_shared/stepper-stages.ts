import { TIMELINE_STAGES, type OrderRecord, type TimelineStage } from "./types";

export interface StageStatus {
  stage: TimelineStage;
  done: boolean;
  timestamp?: string;
}

// A terminal order (Voided/Refunded/Canceled) freezes the stepper at
// `lastStage` — the last stage it actually reached before the terminal
// event — rather than at `state`, which for a terminal order isn't one
// of the 6 stages at all.
export function stageStatuses(order: OrderRecord): StageStatus[] {
  const currentIndex = TIMELINE_STAGES.indexOf(order.lastStage);
  return TIMELINE_STAGES.map((stage, index) => ({
    stage,
    done: index <= currentIndex,
    timestamp: order.timeline[stage],
  }));
}
