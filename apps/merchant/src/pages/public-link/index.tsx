// The Public Link Builder route. Wires the persisted draft to the shell and
// hands the current step's own component its slice of `StepProps`. It also
// owns what happens when the merchant publishes: the success confirmation and
// the customer view it can open, which both outlive the Publish step's body,
// and the one status banner every server failure is reported in.
import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import type { ReviewFindingResponse } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { PublishBlockedError, usePublicLinkSync } from "@/entities/site-draft";
import { BuilderShell } from "./_shared/builder-shell";
import { goLiveReady } from "./_shared/checklist";
import { previewModelFromSite } from "./_shared/preview-model";
import { SITE_STEPS } from "./_shared/steps";
import { findingText, usePlText } from "./_shared/texts";
import { useSiteDraft } from "./_shared/use-site-draft";
import { PublishSuccessModal } from "./ui/publish-success-modal";
import { SitePreviewModal } from "./ui/site-preview-modal";

export function PublicLinkBuilderPage() {
  const { t, locale } = useI18n();
  const tx = usePlText();
  const { draft, dispatch, save } = useSiteDraft();
  const publicLinkSync = usePublicLinkSync(draft, dispatch);
  const current = SITE_STEPS[draft.step - 1];
  const [successOpen, setSuccessOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const [blocked, setBlocked] = useState<ReviewFindingResponse[] | null>(null);

  // Every step but Publish keeps the shell's own "go to the next step"
  // button. On Publish the primary button publishes, and must refuse to until
  // the structural (required) go-live items are satisfied.
  const isPublishStep = current.id === "publish";
  const publishReady = goLiveReady(draft);
  // The claimed address (server hostname, else the claimed slug) — see preview-model.ts.
  const liveUrl = `https://${previewModelFromSite(draft, "desktop", t, locale).url}`;

  async function publish() {
    setBlocked(null);
    // Goes through the real backend when a business session is active;
    // otherwise falls back to the local-only toggle.
    try {
      await publicLinkSync.publish();
      setSuccessOpen(true);
    } catch (err) {
      // Never an unhandled rejection: the sync hook has already put the
      // message in the banner below; a blocked review also lists its items.
      if (err instanceof PublishBlockedError) setBlocked(err.findings);
    }
  }

  const { status, error } = publicLinkSync;

  return (
    <div className="px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
      {(error || status === "loading") && (
        <div
          role={error ? "alert" : "status"}
          className={
            error
              ? "mb-4 flex items-start gap-2.5 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 px-4 py-3 text-[12.5px] text-[#B91C1C]"
              : "mb-4 flex items-center gap-2.5 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3 text-[12.5px] text-[var(--octo-text-muted)]"
          }
        >
          {error ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <Loader2 size={15} className="shrink-0 animate-spin" />}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span>{error ?? tx("pl.sync.loading")}</span>
            {error && blocked && blocked.length > 0 && (
              <ul className="list-disc ps-4 text-[12px]">
                {Array.from(new Set(blocked.map((f) => f.code))).map((code) => (
                  <li key={code}>{findingText(tx, code)}</li>
                ))}
              </ul>
            )}
          </div>
          {error && (
            <button
              type="button"
              aria-label={tx("pl.sync.dismiss")}
              onClick={() => {
                setBlocked(null);
                publicLinkSync.clearError();
              }}
              className="shrink-0 rounded p-0.5 hover:bg-[#DC2626]/10"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <BuilderShell
        draft={draft}
        dispatch={dispatch}
        save={save}
        primaryDisabled={isPublishStep ? !publishReady || status === "saving" : undefined}
        primaryHint={isPublishStep && !publishReady ? t("publicLink.completeChecklistToPublish") : undefined}
        primaryLabel={isPublishStep && draft.publish.published ? t("publicLink.publishChanges") : undefined}
        onPrimaryClick={isPublishStep ? () => void publish() : undefined}
      >
        <current.Component draft={draft} dispatch={dispatch} publicLinkSync={publicLinkSync} />
      </BuilderShell>

      <PublishSuccessModal
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        url={liveUrl}
        onViewSite={() => {
          setSuccessOpen(false);
          setSiteOpen(true);
        }}
      />
      <SitePreviewModal open={siteOpen} onClose={() => setSiteOpen(false)} draft={draft} dispatch={dispatch} sync={publicLinkSync} />
    </div>
  );
}
