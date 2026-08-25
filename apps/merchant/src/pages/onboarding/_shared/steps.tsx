// The single source of step order. Adding, removing or reordering a step is an
// edit to this array — the rail, the continue guard and the price bar all read
// from it, so they cannot drift out of sync with each other.
import type { ComponentType, Dispatch } from "react";
import type { DraftAction, OnboardingDraft } from "./draft";
import { VerticalStep, TypeStep, ModulesStep } from "@/widgets/business-wizard";
import { QuestionsStepSlot } from "../steps/questions-step-slot";
import { IntegrationsStepSlot } from "../steps/integrations-step-slot";
import { ReviewStepSlot } from "../steps/review-step-slot";
import { PaymentStepSlot } from "../steps/payment-step-slot";

export interface StepProps {
  draft: OnboardingDraft;
  dispatch: Dispatch<DraftAction>;
}

export interface StepDef {
  id: string;
  labelKey: string;
  titleKey: string;
  subtitleKey: string;
  Component: ComponentType<StepProps>;
  Aside?: ComponentType<StepProps>;
  canContinue: (draft: OnboardingDraft) => boolean;
  showPriceBar: boolean;
}

export const STEPS: readonly StepDef[] = [
  {
    id: "businessType",
    labelKey: "onboarding.rail.businessType",
    titleKey: "onboarding.step1.title",
    subtitleKey: "onboarding.step1.subtitle",
    Component: ({ draft, dispatch }) => (
      <VerticalStep selected={draft.vertical} onSelect={(id) => dispatch({ type: "setVertical", id })} />
    ),
    canContinue: (d) => d.vertical !== null,
    showPriceBar: false,
  },
  {
    id: "services",
    labelKey: "onboarding.rail.services",
    titleKey: "onboarding.step2.title",
    subtitleKey: "onboarding.step2.subtitle",
    Component: ({ draft, dispatch }) => (
      <TypeStep selected={draft.type} onSelect={(code) => dispatch({ type: "setType", code })} />
    ),
    canContinue: (d) => d.type !== null,
    showPriceBar: false,
  },
  {
    id: "businessDetails",
    labelKey: "onboarding.rail.businessDetails",
    titleKey: "onboarding.details.title",
    subtitleKey: "onboarding.details.subtitle",
    Component: QuestionsStepSlot,
    canContinue: () => true,
    showPriceBar: true,
  },
  {
    id: "modules",
    labelKey: "onboarding.rail.modules",
    titleKey: "onboarding.modules.title",
    subtitleKey: "onboarding.modules.subtitle",
    Component: ({ draft, dispatch }) =>
      draft.type ? (
        <ModulesStep
          type={draft.type}
          answers={draft.answers}
          enabled={draft.enabled}
          onToggle={(id, next) => dispatch({ type: "setModules", ids: next ? [...draft.enabled, id] : draft.enabled.filter((m) => m !== id) })}
        />
      ) : null,
    canContinue: () => true,
    showPriceBar: true,
  },
  {
    id: "integrations",
    labelKey: "onboarding.rail.integrations",
    titleKey: "onboarding.integrations.title",
    subtitleKey: "onboarding.integrations.optional",
    Component: IntegrationsStepSlot,
    canContinue: () => true,
    showPriceBar: true,
  },
  {
    id: "review",
    labelKey: "onboarding.rail.review",
    titleKey: "onboarding.review.title",
    subtitleKey: "onboarding.review.subtitle",
    Component: ReviewStepSlot,
    canContinue: () => true,
    showPriceBar: false,
  },
  {
    id: "payment",
    labelKey: "onboarding.rail.payment",
    titleKey: "onboarding.payment.title",
    subtitleKey: "onboarding.payment.subtitle",
    Component: PaymentStepSlot,
    canContinue: (d) => d.account.email.trim() !== "" && d.brand.businessName.trim() !== "",
    showPriceBar: false,
  },
];
