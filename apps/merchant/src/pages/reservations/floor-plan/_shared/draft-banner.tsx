import { Lightbulb, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { FloorPlanDraft } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { formatDateTime } from "./format";

export function DraftBanner({
  draft,
  onContinue,
  onDiscard,
  className,
}: {
  draft: FloorPlanDraft;
  onContinue: () => void;
  onDiscard: () => void;
  className?: string;
}) {
  const { t, locale } = useI18n();
  return (
    <section
      className={clsx(
        "flex flex-col gap-3 rounded-2xl bg-[var(--octo-warning-bg)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Lightbulb size={24} strokeWidth={1.7} className="mt-0.5 shrink-0 text-[#EA580C]" />
        <div>
          <p className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("floorPlan.draft.title")}</p>
          <p className="mt-0.5 text-[13.5px] text-[var(--octo-text-secondary)]">
            {t("floorPlan.draft.updated").replace("{date}", formatDateTime(draft.savedAt, locale))}
            {draft.savedBy && ` · ${t("floorPlan.draft.by").replace("{name}", draft.savedBy)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:shrink-0">
        <button
          type="button"
          onClick={onDiscard}
          className="flex h-11 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-black/5 hover:text-[#DC2626]"
        >
          <Trash2 size={15} />
          {t("floorPlan.draft.discard")}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="h-11 flex-1 rounded-[10px] bg-[#FBBF24] px-5 text-[15px] font-bold text-[#111827] transition-colors hover:bg-[#F5B315] sm:flex-none"
        >
          {t("floorPlan.draft.continue")}
        </button>
      </div>
    </section>
  );
}
