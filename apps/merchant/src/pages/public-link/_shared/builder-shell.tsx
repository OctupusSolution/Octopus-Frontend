// The chrome every one of the seven steps sits inside: a header with the page
// title and the autosave chip, the current step's subtitle beside the rail,
// the step body, and a footer of Help / Save Draft / Next actions. The step
// components themselves (`SITE_STEPS[n].Component`) own none of this — they
// only ever render their own body between the rail and the footer.
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, HelpCircle } from "lucide-react";
import { Button } from "@ui/primitives";
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

const TICK_MS = 30_000;

// The chip used to always say "Autosaved just now" — true for the first 400ms
// after a save, and then permanently, indefinitely false afterwards,
// including the moment a merchant reopens a draft they last touched days ago
// (final review finding F6). Reporting how long ago the save actually was
// keeps the claim honest either way.
function autosaveLabel(savedAt: number | null, t: (key: string) => string): string | null {
  if (savedAt === null) return null;
  const minutes = Math.floor(Math.max(0, Date.now() - savedAt) / 60_000);
  if (minutes < 1) return t("publicLink.autosaved");
  if (minutes < 60) return t("publicLink.autosavedMinutesAgo").replace("{n}", String(minutes));
  const hours = Math.floor(minutes / 60);
  return t("publicLink.autosavedHoursAgo").replace("{n}", String(hours));
}

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

  // Re-renders periodically so "Autosaved 3m ago" keeps advancing on a page a
  // merchant leaves open and idle, rather than freezing at whatever it said
  // the moment they last typed.
  const [, tick] = useState(0);
  useEffect(() => {
    if (draft.savedAt === null) return;
    const id = window.setInterval(() => tick((n) => n + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, [draft.savedAt]);
  const savedLabel = autosaveLabel(draft.savedAt, t);

  function handleSaveDraft() {
    save();
    setNote(t("publicLink.draftSaved"));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <h1 className="text-[21px] font-bold text-[var(--octo-text-primary)]">{t("publicLink.title")}</h1>
        {savedLabel && (
          <span className="flex items-center gap-1.5 rounded-full bg-[#16a34a]/10 px-2.5 py-1 text-[12px] font-medium text-[#16a34a]">
            <CheckCircle2 size={13} />
            {savedLabel}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-0.5">
          <p className="text-[21px] font-bold text-[var(--octo-text-primary)]">{t(current.titleKey)}</p>
          {current.subtitleKey && (
            <p className="text-[13px] text-[var(--octo-text-muted)]">{t(current.subtitleKey)}</p>
          )}
        </div>
        <div className="lg:max-w-[520px] lg:flex-1">
          <StepRail step={draft.step} labelKeys={LABEL_KEYS} />
        </div>
      </div>

      {children}

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
            <Button variant="ghost" onClick={() => dispatch({ type: "back" })} className="h-10 shrink-0">
              {t("publicLink.back")}
            </Button>
          )}
          {/* The frames lay the footer out as one full-width row — Help,
              Save Draft and Next Step sharing the content column at roughly
              235/505/570px — rather than three shrink-to-fit buttons
              clustered to either side. The ratio only applies at `lg`, where
              the column is wide enough to hold it; below that the three
              stack (then sit three-across at `sm`) so labels never get
              crushed. Help and Save Draft are filled light-grey, borderless
              chips in the frame (`ghost` + an explicit fill), matched to the
              same ~40px height as Next Step. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex-1 lg:[grid-template-columns:235fr_505fr_570fr]">
            <Button variant="ghost" icon={<HelpCircle size={14} />} className="h-10 w-full justify-center bg-[var(--octo-hover)]">
              {t("publicLink.help")}
            </Button>
            <Button variant="ghost" onClick={handleSaveDraft} className="h-10 w-full justify-center bg-[var(--octo-hover)]">
              {t("publicLink.saveDraft")}
            </Button>
            <Button
              variant="primary"
              disabled={primaryDisabled}
              title={primaryDisabled ? primaryHint : undefined}
              onClick={onPrimaryClick ?? (() => dispatch({ type: "next" }))}
              className="h-10 w-full justify-center"
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
