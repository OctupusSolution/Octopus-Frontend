// The businessDetails step's current occupant: the qualifying questions,
// until the Business Details & Brand Setup form replaces them.
import { QuestionsStep } from "@/widgets/business-wizard";
import type { StepProps } from "../_shared/steps";

export function QuestionsStepSlot({ draft, dispatch }: StepProps) {
  if (!draft.type) return null;
  return (
    <QuestionsStep
      type={draft.type}
      answers={draft.answers}
      onAnswer={(questionId, optionId) => dispatch({ type: "answer", questionId, optionId })}
    />
  );
}
