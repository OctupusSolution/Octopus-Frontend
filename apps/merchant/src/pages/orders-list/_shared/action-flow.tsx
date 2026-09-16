// apps/merchant/src/pages/orders-list/_shared/action-flow.tsx
import { useEffect, useState } from "react";
import { advanceFlow, currentStep, initFlowState, type FlowState, type FlowStepKind } from "./action-flow-state";

// "processing"/"pending" auto-advance after a short, fixed delay — same
// pattern as this page's own handleRefresh timeout before this rebuild.
const AUTO_ADVANCE_MS: Partial<Record<FlowStepKind, number>> = {
  processing: 900,
  pending: 900,
};

export function useActionFlow<TPayload>(steps: readonly FlowStepKind[], active: boolean) {
  const [state, setState] = useState<FlowState<TPayload>>(initFlowState<TPayload>());

  useEffect(() => {
    if (!active) setState(initFlowState<TPayload>());
  }, [active]);

  const step = currentStep(state, steps);

  useEffect(() => {
    if (!active) return;
    const delay = AUTO_ADVANCE_MS[step];
    if (delay == null) return;
    const timer = window.setTimeout(() => setState((prev) => advanceFlow(prev, steps)), delay);
    return () => window.clearTimeout(timer);
  }, [active, step, steps]);

  return {
    step,
    payload: state.payload,
    submit: (payload: TPayload) => setState((prev) => advanceFlow(prev, steps, payload)),
    advance: () => setState((prev) => advanceFlow(prev, steps)),
    reset: () => setState(initFlowState<TPayload>()),
  };
}
