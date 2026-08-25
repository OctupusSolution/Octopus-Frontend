import { IntegrationsStep } from "./integrations-step";
import type { StepProps } from "../_shared/steps";

export function IntegrationsStepSlot({ draft, dispatch }: StepProps) {
  return (
    <IntegrationsStep
      selected={draft.integrations}
      onToggle={(id) => dispatch({ type: "toggleIntegration", id })}
    />
  );
}
