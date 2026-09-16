// apps/merchant/src/pages/orders-list/_shared/action-flow-state.ts
// A tiny step-sequence state machine shared by all four action flows.
// Cancel/Void/Wastage/cash-Refund use ["form", "pin", "result"]; online
// Refund uses ["form", "pin", "processing", "pending", "result"] — see
// action-flow.tsx for the auto-advance timing on "processing"/"pending".
export type FlowStepKind = "form" | "pin" | "processing" | "pending" | "result";

export interface FlowState<TPayload> {
  stepIndex: number;
  payload: TPayload | undefined;
}

export function initFlowState<TPayload>(): FlowState<TPayload> {
  return { stepIndex: 0, payload: undefined };
}

export function currentStep(state: FlowState<unknown>, steps: readonly FlowStepKind[]): FlowStepKind {
  return steps[Math.min(state.stepIndex, steps.length - 1)];
}

export function advanceFlow<TPayload>(
  state: FlowState<TPayload>,
  steps: readonly FlowStepKind[],
  payload?: TPayload
): FlowState<TPayload> {
  const nextIndex = Math.min(state.stepIndex + 1, steps.length - 1);
  return { stepIndex: nextIndex, payload: payload !== undefined ? payload : state.payload };
}

export function isLastStep(state: FlowState<unknown>, steps: readonly FlowStepKind[]): boolean {
  return state.stepIndex >= steps.length - 1;
}
