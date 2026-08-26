// The single source of step order. Adding, removing or reordering a step is an
// edit to this array — the rail, the continue guard and the price bar all read
// from it, so they cannot drift out of sync with each other.
import { createContext, useContext, type ComponentType, type Dispatch, type ReactNode } from "react";
import type { DraftAction, OnboardingDraft } from "./draft";
import { VerticalStep, TypeStep, ModulesStep } from "@/widgets/business-wizard";
import { withDependencies, withoutDependents, type ModuleId } from "@/shared/catalog";
import { GetStartedStep } from "../steps/get-started-step";
import { InsightsAside } from "../steps/insights-aside";
import { ModulesSummaryAside } from "../steps/modules-summary-aside";
import { BusinessDetailsStep } from "../steps/business-details-step";
import { BusinessDetailsAside } from "../steps/business-details-aside";
import { IntegrationsStepSlot } from "../steps/integrations-step-slot";
import { ReviewStep } from "../steps/review-step";
import { PublicLinkStep } from "../steps/public-link-step";
import { DashboardPreviewStep } from "../steps/dashboard-preview-step";
import { PaymentStep } from "../steps/payment-step";
import { ReviewPlanAside } from "../steps/review-plan-aside";
import { PublicLinkAside } from "../steps/public-link-aside";
import { DashboardPreviewAside } from "../steps/dashboard-preview-aside";

/** Enabling pulls in prerequisites; disabling drops anything that depended on
 * `id`. Same dependency-resolution rule the Create Business wizard uses — the
 * two flows must never disagree about what a module toggle actually does. */
function toggleModule(draft: OnboardingDraft, id: ModuleId, next: boolean): ModuleId[] {
  return next ? withDependencies([...draft.enabled, id]) : withoutDependents(draft.enabled, id);
}

export interface StepProps {
  draft: OnboardingDraft;
  dispatch: Dispatch<DraftAction>;
  /** Finishes the whole wizard: creates the business, signs the merchant in,
   * clears the persisted draft and navigates to the dashboard. Only the last
   * step needs it — the payment success dialog calls it directly rather than
   * relying on the sticky footer, which the dialog itself sits on top of. */
  onFinish?: () => void;
  /** i18n key for the finish button's label — "Go To My Dashboard" on
   * signup, something else on a host that finishes somewhere other than the
   * dashboard. Same reason as `onFinish`: the payment success dialog renders
   * its own copy of the finish button rather than relying on the sticky
   * footer's, so it needs this passed down too. */
  finishLabelKey?: string;
}

export interface StepDef {
  id: string;
  labelKey: string;
  /** Optional: a step that carries its own headline (the landing step) omits
   *  it, and the shared header block is simply not rendered. */
  titleKey?: string;
  subtitleKey?: string;
  Component: ComponentType<StepProps>;
  Aside?: ComponentType<StepProps>;
  canContinue: (draft: OnboardingDraft) => boolean;
  showPriceBar: boolean;
  /** Whether the footer offers "Save As Draft" beside Back and Continue. The
   *  design puts it on step 8 — the last screen a merchant sees before the
   *  account and payment steps, and so the natural place to stop for now. */
  showSaveDraft?: boolean;
}

export const STEPS: readonly StepDef[] = [
  {
    id: "getStarted",
    labelKey: "onboarding.rail.getStarted",
    // No titleKey/subtitleKey: this step renders its own hero headline, so the
    // shared "Step n of m / title / subtitle" block is skipped for it.
    Component: GetStartedStep,
    canContinue: () => true,
    showPriceBar: false,
  },
  {
    id: "businessType",
    labelKey: "onboarding.rail.businessType",
    titleKey: "onboarding.step1.title",
    subtitleKey: "onboarding.step1.subtitle",
    Component: ({ draft, dispatch }) => (
      <VerticalStep selected={draft.vertical} onSelect={(id) => dispatch({ type: "setVertical", id })} />
    ),
    Aside: InsightsAside,
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
    Component: BusinessDetailsStep,
    Aside: BusinessDetailsAside,
    canContinue: (d) => d.brand.businessName.trim() !== "" && d.brand.city !== "",
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
          onToggle={(id, next) => dispatch({ type: "setModules", ids: toggleModule(draft, id, next) })}
          searchable
        />
      ) : null,
    Aside: ModulesSummaryAside,
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
    Component: ReviewStep,
    Aside: ReviewPlanAside,
    canContinue: () => true,
    showPriceBar: false,
  },
  {
    id: "publicLink",
    labelKey: "onboarding.rail.publicLink",
    titleKey: "onboarding.publicLink.title",
    subtitleKey: "onboarding.publicLink.subtitle",
    Component: PublicLinkStep,
    Aside: PublicLinkAside,
    canContinue: () => true,
    showPriceBar: false,
    showSaveDraft: true,
  },
  {
    id: "dashboardPreview",
    labelKey: "onboarding.rail.dashboardPreview",
    titleKey: "onboarding.dashboardPreview.title",
    subtitleKey: "onboarding.dashboardPreview.subtitle",
    Component: DashboardPreviewStep,
    Aside: DashboardPreviewAside,
    canContinue: () => true,
    showPriceBar: false,
  },
  {
    id: "payment",
    labelKey: "onboarding.rail.payment",
    titleKey: "onboarding.payment.title",
    subtitleKey: "onboarding.payment.subtitle",
    Component: PaymentStep,
    canContinue: (d) => d.paid,
    showPriceBar: false,
  },
];

/** The signup flow minus the marketing "Get Started" hero — the one step that
 *  makes no sense for a merchant who is already signed in and adding a second
 *  business. Every other step, in the same order. */
export const ADD_BUSINESS_STEPS: readonly StepDef[] = STEPS.filter((s) => s.id !== "getStarted");

/** Carries whichever step list is actually driving the current flow. Supplied
 *  by the wizard around its content, so `useStepNumber` below resolves edit
 *  links against the steps the merchant can actually see — the full ten for
 *  signup, the shorter nine for add-business — never always the full STEPS. */
const StepsContext = createContext<readonly StepDef[] | null>(null);

export function StepsProvider({ steps, children }: { steps: readonly StepDef[]; children: ReactNode }) {
  return <StepsContext.Provider value={steps}>{children}</StepsContext.Provider>;
}

/** Returns a resolver for the 1-based position of a step in the *active*
 *  flow's step list. Edit links resolve through this so reordering STEPS — or
 *  running a shorter list, like add-business's nine steps — cannot silently
 *  send a merchant to the wrong screen.
 *
 *  An unknown id throws rather than returning a number. Every caller passes a
 *  literal id declared in this file, so a typo or a removed step surfaces as a
 *  hard failure the first time that screen renders — loudly — instead of
 *  quietly landing the merchant somewhere else. Returning 0 would be the worst
 *  of both: the reducer would clamp it to step 1 and nobody would notice. */
export function useStepNumber(): (id: string) => number {
  const steps = useContext(StepsContext);
  if (!steps) throw new Error("useStepNumber must be used within a StepsProvider");
  return (id: string) => {
    const index = steps.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`stepNumber: no step with id "${id}" in the active steps list`);
    return index + 1;
  };
}

/** How many steps the signup flow has. Used to normalise a restored
 *  `draft.step` for that flow; add-business normalises against
 *  `ADD_BUSINESS_STEPS.length` instead. */
export const STEP_COUNT = STEPS.length;
