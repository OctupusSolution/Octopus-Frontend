// Stub — a later task replaces this body with the real publish step. Renders
// only its own title so the shell can be verified before any step is built.
import { useI18n } from "@/app/providers/i18n-provider";
import type { StepProps } from "../_shared/steps";

export function PublishStep(_props: StepProps) {
  const { t } = useI18n();
  return <p className="text-[12.5px] text-[var(--octo-text-muted)]">{t("publicLink.step.publish")}</p>;
}
