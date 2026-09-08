// The Public Link Builder route. Owns nothing beyond wiring the persisted
// draft to the shell and handing the current step's own component its slice
// of `StepProps` — the shell and the seven steps do the rest.
import { BuilderShell } from "./_shared/builder-shell";
import { SITE_STEPS } from "./_shared/steps";
import { useSiteDraft } from "./_shared/use-site-draft";

export function PublicLinkBuilderPage() {
  const { draft, dispatch, save } = useSiteDraft();
  const current = SITE_STEPS[draft.step - 1];
  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <BuilderShell draft={draft} dispatch={dispatch} save={save}>
        <current.Component draft={draft} dispatch={dispatch} />
      </BuilderShell>
    </div>
  );
}
