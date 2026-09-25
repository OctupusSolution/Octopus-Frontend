// The Public Link Builder route. Wires the persisted draft to the shell and
// hands the current step's own component its slice of `StepProps`. It also
// owns what happens when the merchant publishes: the success confirmation and
// the customer view it can open, which both outlive the Publish step's body.
import { useState } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import { usePublicLinkSync } from "@/entities/site-draft";
import { BuilderShell } from "./_shared/builder-shell";
import { goLiveReady } from "./_shared/checklist";
import { previewModelFromSite } from "./_shared/preview-model";
import { SITE_STEPS } from "./_shared/steps";
import { useSiteDraft } from "./_shared/use-site-draft";
import { PublishSuccessModal } from "./ui/publish-success-modal";
import { SitePreviewModal } from "./ui/site-preview-modal";

export function PublicLinkBuilderPage() {
  const { t, locale } = useI18n();
  const { draft, dispatch, save } = useSiteDraft();
  const publicLinkSync = usePublicLinkSync(draft, dispatch);
  const current = SITE_STEPS[draft.step - 1];
  const [successOpen, setSuccessOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);

  // Every step but Publish keeps the shell's own "go to the next step"
  // button. On Publish the primary button publishes, and must refuse to until
  // the go-live checklist is satisfied.
  const isPublishStep = current.id === "publish";
  const publishReady = goLiveReady(draft);
  const liveUrl = `https://${previewModelFromSite(draft, "desktop", t, locale).url}`;

  async function publish() {
    // Goes through the real backend when a dev session is configured
    // (see shared/api/dev-backend-session.ts); otherwise falls back to the
    // old local-only toggle, same as before this was wired up.
    try {
      await publicLinkSync.publish();
      setSuccessOpen(true);
    } catch {
      // The sync hook already surfaces the failure in the builder's status.
    }
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <BuilderShell
        draft={draft}
        dispatch={dispatch}
        save={save}
        primaryDisabled={isPublishStep ? !publishReady : undefined}
        primaryHint={isPublishStep && !publishReady ? t("publicLink.completeChecklistToPublish") : undefined}
        primaryLabel={isPublishStep && draft.publish.published ? t("publicLink.publishChanges") : undefined}
        onPrimaryClick={isPublishStep ? publish : undefined}
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
      <SitePreviewModal open={siteOpen} onClose={() => setSiteOpen(false)} draft={draft} />
    </div>
  );
}
