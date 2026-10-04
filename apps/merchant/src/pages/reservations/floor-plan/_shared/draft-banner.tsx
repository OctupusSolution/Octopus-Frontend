import { Trash2 } from "lucide-react";
import clsx from "clsx";
import type { FloorPlanDraft } from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { TEXT_PRIMARY, TEXT_SECONDARY } from "../../_shared/theme";
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
        "flex flex-col gap-3 rounded-lg bg-[#fdf8f4] px-3 py-2 sm:flex-row sm:items-center sm:justify-between [[data-theme=dark]_&]:bg-[var(--octo-warning-bg)]",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <ShellIcon name="fp-hub-bulb.svg" size={24} className="text-[#e86607]" />
        <div className="flex min-w-0 flex-col justify-center gap-2 text-[14px] leading-[14px]">
          <p className={clsx("font-bold", TEXT_PRIMARY)}>{t("floorPlan.draft.title")}</p>
          <p className={clsx("font-medium", TEXT_SECONDARY)}>
            {t("floorPlan.draft.updated").replace("{date}", formatDateTime(draft.savedAt, locale))}
            {draft.savedBy && ` · ${t("floorPlan.draft.by").replace("{name}", draft.savedBy)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:shrink-0">
        {/* Not in the frame: discarding has no other home, so it stays as a quiet icon beside the frame's button. */}
        <button
          type="button"
          onClick={onDiscard}
          aria-label={t("floorPlan.draft.discard")}
          title={t("floorPlan.draft.discard")}
          className={clsx("grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-black/5 hover:text-[#d30202]", TEXT_SECONDARY)}
        >
          <Trash2 size={18} />
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="h-10 flex-1 whitespace-nowrap rounded-lg bg-[#fec348] px-3 py-2 text-[16px] font-bold leading-[16px] text-[#0f172a] transition-[filter] hover:brightness-95 sm:flex-none"
        >
          {t("floorPlan.draft.continue")}
        </button>
      </div>
    </section>
  );
}
