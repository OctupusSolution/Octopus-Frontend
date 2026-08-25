// The panel beside steps 2 and 5. Everything in it is derived from the draft —
// change the vertical or the type and the list changes with it.
import { Check, Sparkles } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { insightsFor } from "../_shared/ai-insights";
import type { StepProps } from "../_shared/steps";

export function InsightsAside({ draft }: StepProps) {
  const { t } = useI18n();
  const rows = insightsFor(draft.vertical, draft.type);
  if (rows.length === 0) return null;

  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] p-4">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0D6EFD]">
        <Sparkles size={12} />
        {t("onboarding.aside.insights.title")}
      </h3>
      <p className="mt-2 text-[14px] font-bold leading-snug text-[var(--octo-text-primary)]">
        {t("onboarding.aside.insights.lead")}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--octo-text-muted)]">
        {t("onboarding.aside.insights.note")}
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-2.5 py-2"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-[var(--octo-selected)] text-[#0D6EFD]">
              <CatalogIcon name={row.icon} size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11.5px] font-semibold text-[var(--octo-text-primary)]">{t(row.nameKey)}</span>
              <span className="block truncate text-[10px] text-[var(--octo-text-muted)]">{t(row.descKey)}</span>
            </span>
            <Check size={13} strokeWidth={3} className="shrink-0 text-[#0D6EFD]" />
          </li>
        ))}
      </ul>
    </section>
  );
}
