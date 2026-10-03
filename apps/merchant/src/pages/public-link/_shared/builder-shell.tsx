// The chrome every one of the seven steps sits inside: a header with the page
// title and the autosave chip, the current step's subtitle beside the rail,
// the step body, and a footer of Help / Save Draft / Next actions. The step
// components themselves (`SITE_STEPS[n].Component`) own none of this — they
// only ever render their own body between the rail and the footer.
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/app/providers/i18n-provider";
import { TOP_BAR_SLOT_ID } from "@/widgets/top-bar";
import { BuilderRail } from "../ui/builder-rail";
import { HelpModal } from "../ui/help-modal";
import { PlButton, PlIcon, plText } from "../ui/kit";
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
  /** Overrides the primary button's label — the Publish step reads "Publish
   *  Changes" once the site is already live. */
  primaryLabel?: string;
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
  primaryLabel,
}: BuilderShellProps) {
  const { t } = useI18n();
  const current = SITE_STEPS[draft.step - 1];
  const isLast = draft.step === SITE_STEPS.length;

  // The same self-dismissing note pattern `onboarding/_shared/wizard.tsx`
  // uses for "Save As Draft" — there is no shared toast in this app.
  const [note, setNote] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
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

  // The frames put the page title and the autosave chip in the console's top
  // bar, where every other page shows the search field.
  const topBarSlot = typeof document === "undefined" ? null : document.getElementById(TOP_BAR_SLOT_ID);
  const heading = (
    <div className="flex min-w-0 items-center gap-2">
      <h1 className="truncate text-[24px] font-bold leading-[24px] text-[var(--pl-text)]">{t("publicLink.title")}</h1>
      {savedLabel && (
        <span className="flex shrink-0 items-center gap-1.5 rounded-[8px] bg-[var(--pl-success-soft)] px-2 py-1 text-[14px] font-medium leading-[14px] text-[var(--pl-success)]">
          <PlIcon name="completed" size={16} />
          {savedLabel}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-12">
      {topBarSlot ? createPortal(heading, topBarSlot) : heading}

      <div className="flex flex-col gap-6 overflow-x-auto [scrollbar-width:none] xl:flex-row xl:items-start xl:justify-between xl:overflow-visible">
        <div className="flex min-w-0 flex-col gap-3">
          <p className={plText.h3Bold}>{t(current.titleKey)}</p>
          {current.subtitleKey && <p className={plText.sub}>{t(current.subtitleKey)}</p>}
        </div>
        <BuilderRail step={draft.step} labelKeys={LABEL_KEYS} onStep={(step) => dispatch({ type: "goTo", step })} />
      </div>

      {children}

      <div className="flex flex-col gap-2">
        {note && (
          <p role="status" className={plText.hint}>
            {note}
          </p>
        )}
        {primaryDisabled && primaryHint && <p className={plText.hint}>{primaryHint}</p>}
        {/* One full-width row, as the frames lay it out: Help 171, Save Draft
            367, Next Step 562 on a 24px gap — kept as that ratio so it holds
            at any content width, and stacked below `sm`. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6 lg:[grid-template-columns:171fr_367fr_562fr]">
          <PlButton variant="neutral" onClick={() => setHelpOpen(true)}>
            <PlIcon name="help-circle" />
            {t("publicLink.help")}
          </PlButton>
          <PlButton variant="soft" onClick={handleSaveDraft}>
            {t("publicLink.saveDraft")}
          </PlButton>
          <PlButton
            variant="primary"
            disabled={primaryDisabled}
            title={primaryDisabled ? primaryHint : undefined}
            onClick={onPrimaryClick ?? (() => dispatch({ type: "next" }))}
          >
            {primaryLabel ?? t(isLast ? "publicLink.publishNow" : "publicLink.nextStep")}
            <PlIcon name="arrow-right" className="rtl:rotate-180" />
          </PlButton>
        </div>
      </div>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} stepId={current.id} titleKey={current.titleKey} />
    </div>
  );
}
