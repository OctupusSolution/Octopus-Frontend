// apps/merchant/src/pages/orders-list/_shared/action-flow-state.test.ts
import { describe, expect, it } from "vitest";
import { advanceFlow, currentStep, initFlowState, isLastStep, type FlowStepKind } from "./action-flow-state";

const SIMPLE_STEPS: readonly FlowStepKind[] = ["form", "pin", "result"];
const ONLINE_REFUND_STEPS: readonly FlowStepKind[] = ["form", "pin", "processing", "pending", "result"];

describe("action flow state", () => {
  it("starts on the first step", () => {
    const state = initFlowState();
    expect(currentStep(state, SIMPLE_STEPS)).toBe("form");
    expect(isLastStep(state, SIMPLE_STEPS)).toBe(false);
  });

  it("advances one step at a time and carries the payload forward", () => {
    let state = initFlowState<{ reason: string }>();
    state = advanceFlow(state, SIMPLE_STEPS, { reason: "Wrong order" });
    expect(currentStep(state, SIMPLE_STEPS)).toBe("pin");
    expect(state.payload).toEqual({ reason: "Wrong order" });

    state = advanceFlow(state, SIMPLE_STEPS);
    expect(currentStep(state, SIMPLE_STEPS)).toBe("result");
    expect(state.payload).toEqual({ reason: "Wrong order" });
    expect(isLastStep(state, SIMPLE_STEPS)).toBe(true);
  });

  it("never advances past the last step", () => {
    let state = initFlowState();
    for (let i = 0; i < 10; i++) state = advanceFlow(state, SIMPLE_STEPS);
    expect(currentStep(state, SIMPLE_STEPS)).toBe("result");
  });

  it("walks the 5-step online refund sequence", () => {
    let state = initFlowState();
    const seen: FlowStepKind[] = [currentStep(state, ONLINE_REFUND_STEPS)];
    for (let i = 0; i < 4; i++) {
      state = advanceFlow(state, ONLINE_REFUND_STEPS);
      seen.push(currentStep(state, ONLINE_REFUND_STEPS));
    }
    expect(seen).toEqual(["form", "pin", "processing", "pending", "result"]);
  });
});
