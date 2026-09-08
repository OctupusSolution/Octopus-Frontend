// The chrome every one of the seven steps sits inside: a header with the page
// title and the autosave chip, the current step's subtitle beside the rail,
// the step body, and a footer of Help / Save Draft / Next actions. The step
// components themselves (`SITE_STEPS[n].Component`) own none of this — they
// only ever render their own body between the rail and the footer.
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, HelpCircle } from "lucide-react";
import { Button, Card } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { StepRail } from "@/pages/onboarding/_shared/step-rail";
import { SITE_STEPS } from "./steps";
import type { SiteAction, SiteDraft } from "./site-draft";

export interface BuilderShellProps {
  draft: SiteDraft;
  dispatch: (action: SiteAction) => void;
  save: () => void;
  children: ReactNode;
  /** Lets the current step override what the footer's primary button does
   *  and whether it may be pressed — only the Publish step (task 21) uses
   *  this, to dispatch `patchPublish` instead of `next` and to stay disabled
   *  until `goLiveReady(draft)`. Every other step leaves both undefined and
   *  keeps the shell's own `next` behaviour. */
  primaryDisabled?: boolean;
  onPrimaryClick?: () => void;
  /** Shown beside the primary button while it's disabled, naming the reason
   *  rather than leaving a merchant to guess why "Publish Now" won't press. */
  primaryHint?: string;
}

const LABEL_KEYS = SITE_STEPS.map((s) => s.labelKey);

export function BuilderShell({
  draft,
  dispatch,
  save,
  children,
  primaryDisabled,
  onPrimaryClick,
  primaryHint,
}: BuilderShellProps) {
  const { t } = useI18n();
  const current = SITE_STEPS[draft.step - 1];
  const isLast = draft.step === SITE_STEPS.length;

  // The same self-dismissing note pattern `onboarding/_shared/wizard.tsx`
  // uses for "Save As Draft" — there is no shared toast in this app.
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), 3200);
    return () => window.clearTimeout(id);
  }, [note]);

  function handleSaveDraft() {
    save();
    setNote(t("publicLink.draftSaved"));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[21px] font-bold text-[var(--octo-text-primary)]">{t("publicLink.title")}</h1>
        {draft.savedAt !== null && (
          <span className="flex items-center gap-1.5 text-[12px] text-[#16a34a]">
            <CheckCircle2 size={13} />
            {t("publicLink.autosaved")}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[13px] font-medium text-[var(--octo-text-primary)]">{t(current.labelKey)}</p>
        <div className="lg:max-w-[520px] lg:flex-1">
          <StepRail step={draft.step} labelKeys={LABEL_KEYS} />
        </div>
      </div>

      <Card className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4 sm:p-5">
        {children}
      </Card>

      <div className="flex flex-col gap-2">
        {note && (
          <p role="status" className="text-[11.5px] text-[var(--octo-text-muted)]">
            {note}
          </p>
        )}
        {primaryDisabled && primaryHint && (
          <p className="text-[11.5px] text-[var(--octo-text-muted)]">{primaryHint}</p>
        )}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {draft.step > 1 && (
            <Button variant="secondary" onClick={() => dispatch({ type: "back" })} className="shrink-0">
              {t("publicLink.back")}
            </Button>
          )}
          {/* The frames lay the footer out as one full-width row — Help,
              Save Draft and Next Step sharing the content column at roughly
              235/505/570px — rather than three shrink-to-fit buttons
              clustered to either side. The ratio only applies at `lg`, where
              the column is wide enough to hold it; below that the three
              stack (then sit three-across at `sm`) so labels never get
              crushed. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex-1 lg:[grid-template-columns:235fr_505fr_570fr]">
            <Button variant="secondary" icon={<HelpCircle size={14} />} className="w-full justify-center">
              {t("publicLink.help")}
            </Button>
            <Button variant="secondary" onClick={handleSaveDraft} className="w-full justify-center">
              {t("publicLink.saveDraft")}
            </Button>
            <Button
              variant="primary"
              disabled={primaryDisabled}
              title={primaryDisabled ? primaryHint : undefined}
              onClick={onPrimaryClick ?? (() => dispatch({ type: "next" }))}
              className="w-full justify-center"
            >
              {t(isLast ? "publicLink.publishNow" : "publicLink.nextStep")}
              <ArrowRight size={14} className="rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
