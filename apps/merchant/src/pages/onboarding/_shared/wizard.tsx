// Drives an ordered list of onboarding steps over a single draft. Two hosts
// use it: the ten-step signup flow (pages/onboarding/index.tsx), rendered
// outside the app shell with its own header passed in as `chrome`; and the
// nine-step "add another business" flow
// (pages/settings/businesses/create.tsx), rendered inside the app shell with
// the existing back-link and page title standing in for a header, so it
// passes no `chrome` at all. Which steps run and what happens on finish are
// entirely the host's decision — this component only knows how to walk
// whatever list it is given, over whatever draft config it is given.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { Button } from "@ui/primitives";
import { defaultModulesFor, questionsFor, withDependencies } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { PriceBar } from "./price-bar";
import { StepRail } from "./step-rail";
import { StepShell } from "./step-shell";
import { StepsProvider, type StepDef } from "./steps";
import { useOnboardingDraft, type OnboardingDraftConfig } from "./use-onboarding-draft";
import type { OnboardingDraft } from "./draft";

export interface WizardProps {
  steps: readonly StepDef[];
  draftConfig: OnboardingDraftConfig;
  /** Finishes the flow: the host's own concern — create the business, sign
   *  the merchant in or don't, navigate wherever makes sense for it. The
   *  wizard clears its persisted draft right after, regardless of what the
   *  host did with it. */
  onFinish: (draft: OnboardingDraft) => void;
  /** Rendered above the rail. Signup passes its own logo/language/theme
   *  header; add-business passes nothing, since it already sits inside the
   *  app shell and has its own back-link and title above the wizard. */
  chrome?: ReactNode;
  /** Signup keeps `min-h-screen` and the page background — it owns the whole
   *  viewport, outside the app shell. Add-business sits inside the settings
   *  shell and must not force a full-height page. */
  containerClassName?: string;
}

export function Wizard({ steps, draftConfig, onFinish, chrome, containerClassName }: WizardProps) {
  const { t, dir } = useI18n();
  const { draft, dispatch, clear, keep, restored } = useOnboardingDraft(draftConfig);

  // A local, self-dismissing note, the same shape the settings pages use —
  // there is no shared toast in this app to reach for. It exists for one
  // message: whether "Save As Draft" actually kept anything.
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), 3200);
    return () => window.clearTimeout(id);
  }, [note]);

  // `draft.step` is normalised to the valid range when a persisted draft is
  // restored, so no clamping is needed here. Clamping for display only used to
  // hide an out-of-range value from the screen while leaving it in the reducer,
  // which made Back a no-op until it had decremented back into range.
  const index = draft.step - 1;
  const current = steps[index];
  const labelKeys = useMemo(() => steps.map((s) => s.labelKey), [steps]);

  // The module set is derived from the type profile plus whatever the answers
  // switched on, and re-derived whenever the type or an answer changes. A
  // restored draft already carries the merchant's own hand-picked `enabled`
  // list, so deriving on the mount that restored it would clobber those picks
  // with the type's defaults. `restoredSnapshot` freezes the exact
  // `{ type, answers }` the draft was restored with, once, without ever being
  // mutated by the effect itself — comparing against a frozen value (rather
  // than consuming a "first run" flag inside the effect body) is what keeps
  // this correct under React 18 StrictMode, which deliberately re-invokes a
  // fresh mount's effects twice; a flag flipped inside the effect gets
  // consumed by the first of those two invocations and derives (and
  // overwrites the restored picks) on the second. Once a real `setType` or
  // `answer` dispatch changes `draft.type`/`draft.answers` away from the
  // snapshot, the comparison stops matching for the rest of the session and
  // every subsequent change derives normally.
  const restoredSnapshot = useRef(restored ? { type: draft.type, answers: draft.answers } : null);
  useEffect(() => {
    const snapshot = restoredSnapshot.current;
    if (snapshot && draft.type === snapshot.type && draft.answers === snapshot.answers) return;
    if (!draft.type) return;
    const fromAnswers = questionsFor(draft.type).flatMap((question) => {
      const option = question.options.find((o) => o.id === draft.answers[question.id]);
      return option ? [...option.enables] : [];
    });
    dispatch({ type: "setModules", ids: withDependencies([...defaultModulesFor(draft.type), ...fromAnswers]) });

    // Branch count rides along with the same trigger: derived from the
    // `branches` qualifying answer when the merchant has actually answered
    // it, left untouched otherwise (a later task adds an explicit numeric
    // field and must not have a default silently overwrite it).
    const branchesQuestion = questionsFor(draft.type).find((q) => q.id === "branches");
    const branchesOption = branchesQuestion?.options.find((o) => o.id === draft.answers[branchesQuestion.id]);
    if (branchesOption?.branchCount !== undefined) {
      dispatch({ type: "patchBrand", patch: { branchCount: branchesOption.branchCount } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.type, draft.answers]);

  function handleFinish() {
    onFinish(draft);
    clear();
  }

  // "Save As Draft" does not leave the flow — the header already has a link
  // that does. It promotes the draft from this tab's sessionStorage to
  // localStorage, so closing the tab no longer throws the signup away, and says
  // so. Leaving is then the merchant's own next move, or not.
  function handleSaveDraft() {
    setNote(t(keep() ? "onboarding.publicLink.draftKept" : "onboarding.publicLink.draftKeptFailed"));
  }

  const canContinue = current.canContinue(draft);
  const isLast = index === steps.length - 1;
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const NextArrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const actions = (
    <>
      {index > 0 && (
        <Button variant="secondary" onClick={() => dispatch({ type: "back" })} icon={<BackArrow size={14} />}>
          {t("onboarding.back")}
        </Button>
      )}
      {current.showSaveDraft && (
        <Button variant="secondary" onClick={handleSaveDraft}>
          {t("onboarding.publicLink.saveDraft")}
        </Button>
      )}
      {isLast ? (
        <Button variant="primary" disabled={!canContinue} onClick={handleFinish}>
          {t("onboarding.payment.goToDashboard")}
        </Button>
      ) : (
        <Button variant="primary" disabled={!canContinue} onClick={() => dispatch({ type: "next" })}>
          {t("onboarding.next")}
          <NextArrow size={14} />
        </Button>
      )}
    </>
  );

  return (
    <StepsProvider steps={steps}>
      <div className={clsx("flex flex-col", containerClassName)}>
        {chrome}

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-8">
          <StepRail step={index + 1} labelKeys={labelKeys} />

          {current.titleKey && (
            <>
              <span className="mt-8 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#0D6EFD]">
                {t("onboarding.step").replace("{n}", String(index + 1)).replace("{total}", String(steps.length))}
              </span>
              <h1 className="mt-1.5 text-[24px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)] sm:text-[28px]">
                {t(current.titleKey)}
              </h1>
              {current.subtitleKey && (
                <p className="mt-2 text-[13px] text-[var(--octo-text-muted)]">{t(current.subtitleKey)}</p>
              )}
            </>
          )}

          <div className="mt-6">
            <StepShell aside={current.Aside ? <current.Aside draft={draft} dispatch={dispatch} onFinish={handleFinish} /> : undefined}>
              <current.Component draft={draft} dispatch={dispatch} onFinish={handleFinish} />
            </StepShell>
          </div>
        </main>

        {current.showPriceBar ? (
          <PriceBar draft={draft} action={actions} />
        ) : (
          <div className="sticky bottom-0 border-t border-[var(--octo-border-card)] bg-[var(--octo-card)]/95 backdrop-blur">
            <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-end gap-2 px-5 py-3.5">
              {note && (
                <p role="status" className="me-auto text-[11.5px] text-[var(--octo-text-muted)]">
                  {note}
                </p>
              )}
              {actions}
            </div>
          </div>
        )}
      </div>
    </StepsProvider>
  );
}
