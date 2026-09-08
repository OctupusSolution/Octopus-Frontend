// The Public Link Builder route. Owns nothing beyond wiring the persisted
// draft to the shell and handing the current step's own component its slice
// of `StepProps` — the shell and the seven steps do the rest.
import { useI18n } from "@/app/providers/i18n-provider";
import { BuilderShell } from "./_shared/builder-shell";
import { goLiveReady } from "./_shared/checklist";
import { SITE_STEPS } from "./_shared/steps";
import { useSiteDraft } from "./_shared/use-site-draft";

export function PublicLinkBuilderPage() {
  const { t } = useI18n();
  const { draft, dispatch, save } = useSiteDraft();
  const current = SITE_STEPS[draft.step - 1];

  // Every step but Publish keeps the shell's own "go to the next step"
  // button. Publish is the one place the primary button means something
  // else entirely — it dispatches the actual `published: true` flag, and
  // must refuse to do that until the go-live checklist is satisfied.
  const isPublishStep = current.id === "publish";
  const publishReady = goLiveReady(draft);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <BuilderShell
        draft={draft}
        dispatch={dispatch}
        save={save}
        primaryDisabled={isPublishStep ? !publishReady : undefined}
        primaryHint={isPublishStep && !publishReady ? t("publicLink.completeChecklistToPublish") : undefined}
        onPrimaryClick={
          isPublishStep ? () => dispatch({ type: "patchPublish", patch: { published: true } }) : undefined
        }
      >
        <current.Component draft={draft} dispatch={dispatch} />
      </BuilderShell>
    </div>
  );
}
