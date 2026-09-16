import { ArrowRight, Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";

/** Save Draft · Preview · Publish, at the frames' ~5:2:8 split — full width
 *  stacked on narrow screens, or a compact inline cluster where a caller has
 *  it share a row with other footer content (pass `inline`). */
export function BuilderActions({
  onSaveDraft,
  onPreview,
  onPublish,
  publishLabel,
  publishDisabled,
  saveState,
  inline,
  className,
}: {
  onSaveDraft: () => void;
  onPreview: () => void;
  onPublish: () => void;
  publishLabel: string;
  publishDisabled?: boolean;
  saveState?: "idle" | "saving" | "saved";
  inline?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div
      className={clsx(
        "grid grid-cols-1 gap-2",
        inline ? "sm:flex sm:w-auto" : "sm:grid-cols-[5fr_2.4fr_7.6fr]",
        className
      )}
    >
      <button
        type="button"
        onClick={onSaveDraft}
        className={clsx(
          "flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[var(--octo-seg-bg)] px-4 text-[13.5px] font-semibold text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-track)]",
          inline && "sm:px-3.5"
        )}
      >
        {saveState === "saving" && <Loader2 size={14} className="animate-spin" />}
        {saveState === "saved" && <Check size={14} className="text-[#16A34A]" />}
        {saveState === "saved" ? t("floorPlan.actions.saved") : t("floorPlan.actions.saveDraft")}
      </button>
      <button
        type="button"
        onClick={onPreview}
        className={clsx(
          "h-10 whitespace-nowrap rounded-[10px] bg-[var(--octo-selected)] px-4 text-[13.5px] font-semibold text-[#0D6EFD] transition-colors hover:brightness-[0.97]",
          inline && "sm:px-3.5"
        )}
      >
        {t("floorPlan.actions.preview")}
      </button>
      <button
        type="button"
        onClick={onPublish}
        disabled={publishDisabled}
        className={clsx(
          "flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] bg-[#0D6EFD] px-5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
          inline && "sm:flex-1"
        )}
      >
        {publishLabel}
        <ArrowRight size={16} className="rtl:rotate-180" />
      </button>
    </div>
  );
}
