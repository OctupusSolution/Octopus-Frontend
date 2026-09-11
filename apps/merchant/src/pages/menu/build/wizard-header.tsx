// Title, subtitle, and the two chips every build frame carries on the end side:
// today's date, and which branch the menu belongs to with a way to change it.
//
// Each step supplies its own title/subtitle pair, because the frames rename the
// page as you move through it — "Create New Menu from Scratch", then
// "Add& Configure Items", then "Menu Theme& Public Experience".
import { CalendarDays, MapPin } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";

export function WizardHeader({
  titleKey,
  subtitleKey,
  branchLabel,
  onChangeBranch,
}: {
  titleKey: string;
  subtitleKey: string;
  branchLabel: string;
  onChangeBranch: () => void;
}) {
  const { t, locale } = useI18n();
  const today = new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold text-[var(--octo-text-primary)]">
          {t(titleKey)}
        </h1>
        <p className="mt-1 text-[15px] text-[var(--octo-text-secondary)]">{t(subtitleKey)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--octo-track)] px-3.5 text-[14px] font-medium text-[var(--octo-text-secondary)]">
          <CalendarDays size={16} className="text-[var(--octo-text-muted)]" aria-hidden />
          {today}
        </span>
        <span className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[var(--octo-track)] px-3.5 text-[14px] text-[var(--octo-text-secondary)]">
          <MapPin size={16} className="text-[var(--octo-text-muted)]" aria-hidden />
          {branchLabel}
          <button
            type="button"
            onClick={onChangeBranch}
            className="font-semibold text-[var(--octo-accent)] underline"
          >
            {t("menuWiz.changeBranch")}
          </button>
        </span>
      </div>
    </header>
  );
}
