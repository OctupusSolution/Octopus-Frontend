// Drives an ordered list of onboarding steps over a single draft. Two hosts
// use it: the ten-step signup flow (pages/onboarding/index.tsx), rendered
// outside the app shell with its own header passed in as `chrome`; and the
// nine-step "add another business" flow
// (pages/select-business/new.tsx), full-screen under the same header. Which steps run and what happens on finish are
// entirely the host's decision — this component only knows how to walk
// whatever list it is given, over whatever draft config it is given.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
  /** Label for the primary button on the last step. Signup finishes into the
   *  dashboard, so the default reads "Go To My Dashboard"; add-business
   *  passes its own key, since finishing there returns to the businesses
   *  list instead. */
  finishLabelKey?: string;
}

export function Wizard({
  steps,
  draftConfig,
  onFinish,
  chrome,
  containerClassName,
  finishLabelKey = "onboarding.payment.goToDashboard",
}: WizardProps) {
  const { t } = useI18n();
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

  // "Save As Draft" does not leave the flow — there is already a link outside
  // the wizard body that does (the header's back-to-sign-in on signup, the
  // page's back-link on add-business). It promotes the draft from this tab's
  // sessionStorage to localStorage, so closing the tab no longer throws the
  // draft away, and says so. Leaving is then the merchant's own next move, or
  // not.
  function handleSaveDraft() {
    setNote(t(keep() ? "onboarding.publicLink.draftKept" : "onboarding.publicLink.draftKeptFailed"));
  }

  const canContinue = current.canContinue(draft);
  const isLast = index === steps.length - 1;

  // The frames give the footer two wide buttons that split the content width —
  // Back on the left at roughly two fifths, the primary action filling the
  // rest — rather than a pair of small right-aligned buttons. On the first
  // step, where there is nothing to go back to, the primary action takes the
  // whole row.
  const actions = (
    <div className="grid w-full gap-3" style={{ gridTemplateColumns: index > 0 ? "minmax(0,2fr) minmax(0,3fr)" : "minmax(0,1fr)" }}>
      {index > 0 && (
        <Button
          variant="secondary"
          onClick={() => dispatch({ type: "back" })}
          className="justify-center !py-3 !text-[13.5px] !font-semibold"
        >
          {t("onboarding.back")}
        </Button>
      )}
      {current.showSaveDraft && (
        <Button variant="secondary" className="justify-center !py-3" onClick={handleSaveDraft}>
          {t("onboarding.publicLink.saveDraft")}
        </Button>
      )}
      {isLast ? (
        <Button
          variant="primary"
          disabled={!canContinue}
          onClick={handleFinish}
          className="justify-center !py-3 !text-[13.5px] !font-semibold"
        >
          {t(finishLabelKey)}
        </Button>
      ) : (
        <Button
          variant="primary"
          disabled={!canContinue}
          onClick={() => dispatch({ type: "next" })}
          className="justify-center !py-3 !text-[13.5px] !font-semibold"
        >
          {t("onboarding.next")}
        </Button>
      )}
    </div>
  );

  // The heading block and the step body. `cardHeader` steps wrap both in one
  // white panel; everything else sits straight on the page background.
  const heading = current.titleKey && (
    <>
      <span className="block text-[12px] font-medium text-[var(--octo-text-muted)]">
        {t("onboarding.step").replace("{n}", String(index + 1)).replace("{total}", String(steps.length))}
      </span>
      <h1 className="mt-2 text-[30px] font-bold leading-[1.1] tracking-tight text-[var(--octo-text-primary)] sm:text-[38px]">
        {t(current.titleKey)}
      </h1>
      {current.subtitleKey && (
        <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-[var(--octo-text-muted)]">
          {t(current.subtitleKey)}
        </p>
      )}
    </>
  );

  const body = (
    <>
      {heading}
      <div className={clsx(current.titleKey && "mt-8")}>
        <current.Component draft={draft} dispatch={dispatch} onFinish={handleFinish} finishLabelKey={finishLabelKey} />
      </div>
    </>
  );

  return (
    <StepsProvider steps={steps}>
      {/* Light-only: the Setup frames are drawn light and nothing in them has a
          dark counterpart. Re-declaring the light palette here beats the dark
          one on <html> for this subtree alone, so a merchant who runs the
          console dark keeps that choice everywhere else. */}
      <div
        data-theme="light"
        // The frames sit the wizard on a near-white ground, not the console's
        // #e9eaec page grey — the cards inside it are the light greys, and on
        // #e9eaec they would read as lighter than the page rather than
        // darker. Overriding the token (rather than a class) keeps the sticky
        // footer and the price bar on the same ground for free.
        style={{ "--octo-page-bg": "#f7f8fa" } as CSSProperties}
        className={clsx("flex flex-col", containerClassName)}
      >
        {chrome}

        <main className="mx-auto w-full max-w-[1248px] flex-1 px-6 py-8">
          {!current.hideRail && (
            <div className="mb-10">
              <StepRail step={index + 1} labelKeys={labelKeys} />
            </div>
          )}

          <StepShell aside={current.Aside ? <current.Aside draft={draft} dispatch={dispatch} onFinish={handleFinish} finishLabelKey={finishLabelKey} /> : undefined}>
            {current.cardHeader ? (
              <section className="rounded-[20px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-7 sm:p-8">{body}</section>
            ) : (
              body
            )}
          </StepShell>
        </main>

        {current.hideFooter ? null : current.showPriceBar ? (
          <PriceBar draft={draft} action={actions} />
        ) : (
          <div className="sticky bottom-0 bg-[var(--octo-page-bg)]/95 backdrop-blur">
            <div className="mx-auto flex max-w-[1248px] flex-col gap-2 px-6 py-4">
              {note && (
                <p role="status" className="text-[11.5px] text-[var(--octo-text-muted)]">
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
