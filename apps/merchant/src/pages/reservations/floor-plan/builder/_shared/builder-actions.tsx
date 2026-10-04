import { Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { useI18n } from "@/app/providers/i18n-provider";
import { SURFACE_100, SURFACE_BRAND_LIGHT, TEXT_PRIMARY } from "../../../_shared/theme";

const BUTTON = "flex h-12 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] px-3 py-2 text-[18px] font-bold leading-[18px]";

/** Save Draft · Preview · Publish, at the frames' 367 : 171 : 562 split with
 *  24px between — full width stacked on narrow screens, or an inline cluster
 *  where a caller has it share a row with other footer content (pass `inline`). */
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
        "grid grid-cols-1 gap-3 sm:gap-6",
        inline ? "sm:flex sm:w-auto" : "sm:grid-cols-[367fr_171fr_562fr]",
        className
      )}
    >
      <button
        type="button"
        onClick={onSaveDraft}
        className={clsx(BUTTON, SURFACE_100, TEXT_PRIMARY, "transition-opacity hover:opacity-80", inline && "sm:px-6")}
      >
        {saveState === "saving" && <Loader2 size={18} className="animate-spin" />}
        {saveState === "saved" && <Check size={18} className="text-[#009a39]" />}
        {saveState === "saved" ? t("floorPlan.actions.saved") : t("floorPlan.actions.saveDraft")}
      </button>
      <button
        type="button"
        onClick={onPreview}
        className={clsx(BUTTON, SURFACE_BRAND_LIGHT, "text-[#0d6efd] transition-opacity hover:opacity-80", inline && "sm:px-6")}
      >
        {t("floorPlan.actions.preview")}
      </button>
      <button
        type="button"
        onClick={onPublish}
        disabled={publishDisabled}
        className={clsx(
          BUTTON,
          "bg-[#0d6efd] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
          inline && "sm:flex-1 sm:px-6"
        )}
      >
        {publishLabel}
        <ShellIcon name="fp-builder-arrow-right.svg" size={24} className="rtl:rotate-180" />
      </button>
    </div>
  );
}
