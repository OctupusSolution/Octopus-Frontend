import { SummaryStep } from "./summary-step";
import type { StepProps } from "../_shared/steps";

export function ReviewStepSlot({ draft, dispatch }: StepProps) {
  return (
    <SummaryStep
      vertical={draft.vertical}
      type={draft.type}
      enabled={draft.enabled}
      branchCount={draft.brand.branchCount}
      integrations={draft.integrations}
      onEditStep={(step) => dispatch({ type: "goTo", step })}
    />
  );
}
